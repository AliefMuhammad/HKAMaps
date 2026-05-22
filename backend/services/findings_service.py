"""
findings_service.py — Supabase CRUD for the road_findings table.

Operations:
  save_finding(finding)      → finding_id (str) | None
  get_findings(filters)      → list[dict]
  get_finding(finding_id)    → dict | None
  get_blackspots(toll_road_id, radius_m, min_count) → list[dict]
  get_spm_report(toll_road_id) → dict

The road_findings table is additive — no existing tables are modified.
All operations are graceful: if Supabase is not configured, operations
log a warning and return safe defaults.
"""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import config as cfg

logger = logging.getLogger(__name__)

_supabase_client = None


def _get_client():
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client
    if not cfg.SUPABASE_URL or not cfg.SUPABASE_SERVICE_KEY:
        return None
    try:
        from supabase import create_client
        _supabase_client = create_client(cfg.SUPABASE_URL, cfg.SUPABASE_SERVICE_KEY)
        return _supabase_client
    except ImportError:
        logger.warning("supabase-py not installed — run: pip install supabase")
        return None
    except Exception as exc:
        logger.error("Supabase client init failed: %s", exc)
        return None


# ---------------------------------------------------------------------------
# Save a single finding
# ---------------------------------------------------------------------------

def save_finding(finding: dict) -> Optional[str]:
    """
    Insert one finding into road_findings.
    Returns the generated finding_id (UUID string), or None on failure.

    Expected keys in `finding` (all optional except damage_type):
      toll_road_id, segment_id, session_id, direction, lane,
      chainage_km, latitude, longitude, damage_type, damage_type_label,
      severity, confidence_score, ensemble_sources, bbox,
      mask_polygon, estimated_area_px, estimated_length_px, estimated_width_px,
      spm_indicator, spm_name, recommended_action,
      annotated_image_url, original_image_url, status, notes
    """
    client = _get_client()

    row = _build_row(finding)

    if client is None:
        logger.warning("Supabase not configured — finding not saved (id=%s)", row["finding_id"])
        return row["finding_id"]

    try:
        resp = client.table("road_findings").insert(row).execute()
        if resp.data:
            fid = resp.data[0].get("finding_id", row["finding_id"])
            logger.info("Finding saved: %s (%s, %s)", fid,
                        row.get("damage_type"), row.get("severity"))
            return fid
        logger.error("Supabase insert returned no data: %s", resp)
        return None
    except Exception as exc:
        logger.error("save_finding failed: %s", exc)
        return None


def save_findings_batch(findings: list[dict]) -> list[Optional[str]]:
    """Insert multiple findings in one batch. Returns list of finding_ids."""
    if not findings:
        return []
    client = _get_client()
    rows = [_build_row(f) for f in findings]

    if client is None:
        logger.warning("Supabase not configured — %d findings not saved", len(rows))
        return [r["finding_id"] for r in rows]

    try:
        resp = client.table("road_findings").insert(rows).execute()
        if resp.data:
            ids = [r.get("finding_id") for r in resp.data]
            logger.info("Batch saved %d findings", len(ids))
            return ids
        return [r["finding_id"] for r in rows]
    except Exception as exc:
        logger.error("save_findings_batch failed: %s", exc)
        return [None] * len(rows)


# ---------------------------------------------------------------------------
# Query findings
# ---------------------------------------------------------------------------

def get_findings(
    toll_road_id: Optional[str] = None,
    segment_id: Optional[str] = None,
    damage_type: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
) -> list[dict]:
    """
    Fetch findings from Supabase with optional filters.
    Returns [] if Supabase is not configured.
    """
    client = _get_client()
    if client is None:
        return []

    try:
        q = client.table("road_findings").select("*").order("detected_at", desc=True)
        if toll_road_id:
            q = q.eq("toll_road_id", toll_road_id)
        if segment_id:
            q = q.eq("segment_id", segment_id)
        if damage_type:
            q = q.eq("damage_type", damage_type)
        if severity:
            q = q.eq("severity", severity)
        if status:
            q = q.eq("status", status)
        q = q.range(offset, offset + limit - 1)
        resp = q.execute()
        return resp.data or []
    except Exception as exc:
        logger.error("get_findings failed: %s", exc)
        return []


def get_finding(finding_id: str) -> Optional[dict]:
    """Fetch a single finding by finding_id."""
    client = _get_client()
    if client is None:
        return None
    try:
        resp = client.table("road_findings").select("*").eq("finding_id", finding_id).execute()
        return resp.data[0] if resp.data else None
    except Exception as exc:
        logger.error("get_finding failed: %s", exc)
        return None


def get_findings_geojson(
    toll_road_id: Optional[str] = None,
    severity_filter: Optional[list[str]] = None,
    limit: int = 500,
) -> dict:
    """
    Return findings as a GeoJSON FeatureCollection for map rendering.
    Only includes findings that have latitude + longitude.
    """
    findings = get_findings(toll_road_id=toll_road_id, limit=limit)
    features = []
    for f in findings:
        lat = f.get("latitude")
        lng = f.get("longitude")
        if lat is None or lng is None:
            continue
        sev = f.get("severity")
        if severity_filter and sev not in severity_filter:
            continue
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lng, lat]},
            "properties": {
                "finding_id":       f.get("finding_id"),
                "damage_type":      f.get("damage_type"),
                "damage_type_label": f.get("damage_type_label"),
                "severity":         sev,
                "confidence_score": f.get("confidence_score"),
                "spm_indicator":    f.get("spm_indicator"),
                "spm_name":         f.get("spm_name"),
                "recommended_action": f.get("recommended_action"),
                "status":           f.get("status"),
                "detected_at":      f.get("detected_at"),
                "annotated_image_url": f.get("annotated_image_url"),
                "chainage_km":      f.get("chainage_km"),
                "segment_id":       f.get("segment_id"),
                "toll_road_id":     f.get("toll_road_id"),
            },
        })
    return {"type": "FeatureCollection", "features": features}


# ---------------------------------------------------------------------------
# Blackspot analysis
# ---------------------------------------------------------------------------

def get_blackspots(
    toll_road_id: Optional[str] = None,
    grid_size_m: float = 100.0,
    min_count: int = 3,
) -> list[dict]:
    """
    Identify blackspot locations — segments with ≥ min_count findings.
    Uses a simple grid-cell grouping (lat/lng rounded to ~100m precision).
    Returns list of blackspot dicts sorted by count descending.
    """
    findings = get_findings(toll_road_id=toll_road_id, limit=2000)

    # Grid cell = round lat/lng to ~0.001° ≈ 100m
    precision = round(grid_size_m / 111_000, 5)

    cells: dict[tuple, list] = {}
    for f in findings:
        lat = f.get("latitude")
        lng = f.get("longitude")
        if lat is None or lng is None:
            continue
        key = (round(lat / precision) * precision, round(lng / precision) * precision)
        cells.setdefault(key, []).append(f)

    blackspots = []
    for (lat, lng), fs in cells.items():
        if len(fs) < min_count:
            continue
        severities = [f.get("severity") for f in fs if f.get("severity")]
        damage_types = [f.get("damage_type") for f in fs if f.get("damage_type")]
        blackspots.append({
            "latitude":       lat,
            "longitude":      lng,
            "count":          len(fs),
            "dominant_type":  _most_common(damage_types),
            "worst_severity": _worst_severity(severities),
            "spm_indicators": list({f.get("spm_indicator") for f in fs if f.get("spm_indicator")}),
            "finding_ids":    [f.get("finding_id") for f in fs],
        })

    blackspots.sort(key=lambda b: b["count"], reverse=True)
    return blackspots


# ---------------------------------------------------------------------------
# SPM fulfillment report
# ---------------------------------------------------------------------------

def get_spm_report(toll_road_id: Optional[str] = None) -> dict:
    """
    Aggregate SPM fulfillment statistics for a toll road.
    Returns count per SPM code and severity distribution.
    """
    findings = get_findings(toll_road_id=toll_road_id, limit=5000)

    spm_counts: dict[str, int] = {}
    severity_dist: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    status_dist: dict[str, int] = {}
    open_high: list[dict] = []

    for f in findings:
        code = f.get("spm_indicator", "C-99")
        spm_counts[code] = spm_counts.get(code, 0) + 1

        sev = f.get("severity")
        if sev in severity_dist:
            severity_dist[sev] += 1

        st = f.get("status", "open")
        status_dist[st] = status_dist.get(st, 0) + 1

        if sev == "high" and st == "open":
            open_high.append({
                "finding_id":    f.get("finding_id"),
                "damage_type":   f.get("damage_type"),
                "spm_indicator": code,
                "latitude":      f.get("latitude"),
                "longitude":     f.get("longitude"),
                "chainage_km":   f.get("chainage_km"),
                "detected_at":   f.get("detected_at"),
            })

    return {
        "toll_road_id":    toll_road_id,
        "total_findings":  len(findings),
        "spm_counts":      spm_counts,
        "severity_distribution": severity_dist,
        "status_distribution":   status_dist,
        "open_high_severity":    open_high[:20],
        "generated_at":    datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# Status update
# ---------------------------------------------------------------------------

def update_finding_status(finding_id: str, status: str, notes: str = "") -> bool:
    """Update the status of a finding (open → in_progress → verified → resolved)."""
    client = _get_client()
    if client is None:
        return False
    try:
        payload: dict = {
            "status":     status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        if notes:
            payload["notes"] = notes
        resp = client.table("road_findings").update(payload).eq("finding_id", finding_id).execute()
        return bool(resp.data)
    except Exception as exc:
        logger.error("update_finding_status failed: %s", exc)
        return False


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _build_row(finding: dict) -> dict:
    return {
        "finding_id":         finding.get("finding_id") or str(uuid4()),
        "asset_id":           finding.get("asset_id"),
        "toll_road_id":       finding.get("toll_road_id"),
        "segment_id":         finding.get("segment_id"),
        "session_id":         finding.get("session_id"),
        "direction":          finding.get("direction"),
        "lane":               finding.get("lane"),
        "chainage_km":        finding.get("chainage_km"),
        "latitude":           finding.get("latitude"),
        "longitude":          finding.get("longitude"),
        "damage_type":        finding.get("damage_type", "unknown_damage"),
        "damage_type_label":  finding.get("damage_type_label"),
        "severity":           finding.get("severity"),
        "confidence_score":   finding.get("confidence_score"),
        "ensemble_sources":   finding.get("ensemble_sources", []),
        "bbox":               finding.get("bbox"),
        "mask_polygon":       finding.get("mask_polygon"),
        "estimated_area_px":  finding.get("estimated_area_px"),
        "estimated_length_px": finding.get("estimated_length_px"),
        "estimated_width_px": finding.get("estimated_width_px"),
        "spm_indicator":      finding.get("spm_indicator"),
        "spm_name":           finding.get("spm_name"),
        "recommended_action": finding.get("recommended_action"),
        "annotated_image_url": finding.get("annotated_image_url"),
        "original_image_url": finding.get("original_image_url"),
        "detected_at":        finding.get("detected_at") or datetime.now(timezone.utc).isoformat(),
        "status":             finding.get("status", "open"),
        "notes":              finding.get("notes"),
    }


def _most_common(lst: list) -> Optional[str]:
    if not lst:
        return None
    return max(set(lst), key=lst.count)


def _worst_severity(severities: list) -> Optional[str]:
    rank = {"high": 3, "medium": 2, "low": 1}
    if not severities:
        return None
    return max(severities, key=lambda s: rank.get(s, 0))
