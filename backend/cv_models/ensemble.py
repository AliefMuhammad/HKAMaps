"""
ensemble.py — Weighted Box Fusion (WBF) + consensus voting for multi-model
road damage detection.

WBF merges overlapping predictions from different models into a single fused
prediction, weighting each model's contribution by its reliability score.
Unlike NMS which discards all but the top box, WBF uses information from every
overlapping box — producing more accurate and less noisy final detections.

Reference: Solovyev et al. (2021) "Weighted boxes fusion: Ensembling boxes
from different object detection models", Image and Vision Computing, 107(3).

Pipeline:
  1. Collect raw detections from all models (pixel coords)
  2. Normalize to [0,1] per image dimension
  3. Run WBF per-class with per-model weights
  4. Apply consensus filter (≥2 models OR high-confidence single model)
  5. Denormalize back to pixel coords

Model reliability weights (tunable via config):
  OBB local (Indonesia-specific fine-tuned) : 1.20
  HF YOLO12s RDD2022                        : 1.00
  YOLO-World zero-shot                      : 0.70
  RT-DETR (COCO secondary)                  : 0.75
  YOLO fallback                             : 0.60
"""
import logging
from collections import defaultdict
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

# Model source IDs — used as keys in model_weights and in cluster tracking
SRC_OBB        = "obb"
SRC_HF_DEFECT  = "hf_defect"
SRC_ZERO_SHOT  = "zero_shot"
SRC_RTDETR     = "rtdetr"
SRC_YOLO       = "yolo"

# Default per-model reliability weights (overridable via config)
DEFAULT_MODEL_WEIGHTS: dict[str, float] = {
    SRC_OBB:       1.20,
    SRC_HF_DEFECT: 1.00,
    SRC_ZERO_SHOT: 0.70,
    SRC_RTDETR:    0.75,
    SRC_YOLO:      0.60,
}

# WBF IoU threshold — boxes above this are merged into one cluster
WBF_IOU_THRESHOLD = 0.45

# Consensus: accept single-model detection only if confidence >= this
HIGH_CONF_SINGLE_MODEL = 0.65

# Always accept detections from these trusted sources even if alone
ALWAYS_ACCEPT_SOURCES = frozenset({SRC_OBB, SRC_HF_DEFECT})


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def ensemble_detections(
    raw_batches: list[tuple[str, list[dict]]],
    image_shape: tuple[int, int],
    model_weights: Optional[dict[str, float]] = None,
    iou_threshold: float = WBF_IOU_THRESHOLD,
    high_conf_threshold: float = HIGH_CONF_SINGLE_MODEL,
) -> list[dict]:
    """
    Run WBF + consensus voting across all model outputs.

    Args:
        raw_batches: list of (source_id, detections) tuples.
            Each detection is the standard internal dict with 'bbox' in pixels.
        image_shape: (height, width) of the original image.
        model_weights: per-source reliability weights (uses DEFAULT_MODEL_WEIGHTS if None).
        iou_threshold: WBF cluster merge threshold.
        high_conf_threshold: min confidence for single-model acceptance.

    Returns:
        Fused detections in the same dict format as input, with extra fields:
          - 'ensemble_sources': list of source IDs that contributed
          - 'ensemble_vote_count': number of distinct sources
    """
    weights = model_weights or DEFAULT_MODEL_WEIGHTS
    h, w = image_shape[:2]

    # --- Group raw detections by canonical class ---
    class_batches: dict[str, list[_BoxEntry]] = defaultdict(list)

    for source_id, detections in raw_batches:
        model_weight = weights.get(source_id, 0.60)
        for det in detections:
            b = det["bbox"]
            box_norm = _normalize_box(b["x1"], b["y1"], b["x2"], b["y2"], w, h)
            entry = _BoxEntry(
                box_norm=box_norm,
                score=float(det.get("confidence", 0.0)),
                source=source_id,
                weight=model_weight,
                original=det,
            )
            cls = det.get("class_name", "unknown")
            class_batches[cls].append(entry)

    # --- Run WBF per class, then consensus filter ---
    fused: list[dict] = []

    for cls_name, entries in class_batches.items():
        clusters = _wbf_cluster(entries, iou_threshold)
        for cluster in clusters:
            result = _build_fused_detection(cluster, cls_name, w, h, high_conf_threshold)
            if result is not None:
                fused.append(result)

    # Sort by confidence descending
    fused.sort(key=lambda d: d["confidence"], reverse=True)
    return fused


# ---------------------------------------------------------------------------
# Internal data structures
# ---------------------------------------------------------------------------

class _BoxEntry:
    __slots__ = ("box_norm", "score", "source", "weight", "original")

    def __init__(self, box_norm, score, source, weight, original):
        self.box_norm = box_norm     # (x1n, y1n, x2n, y2n) in [0,1]
        self.score    = score
        self.source   = source
        self.weight   = weight
        self.original = original     # original detection dict


class _Cluster:
    def __init__(self, entry: _BoxEntry):
        self.entries: list[_BoxEntry] = [entry]

    def add(self, entry: _BoxEntry):
        self.entries.append(entry)

    @property
    def fused_box(self) -> tuple:
        """Weighted average box over all entries."""
        total_w = sum(e.score * e.weight for e in self.entries)
        if total_w == 0:
            return self.entries[0].box_norm
        x1 = sum(e.box_norm[0] * e.score * e.weight for e in self.entries) / total_w
        y1 = sum(e.box_norm[1] * e.score * e.weight for e in self.entries) / total_w
        x2 = sum(e.box_norm[2] * e.score * e.weight for e in self.entries) / total_w
        y2 = sum(e.box_norm[3] * e.score * e.weight for e in self.entries) / total_w
        return (x1, y1, x2, y2)

    @property
    def fused_score(self) -> float:
        """Weighted mean confidence."""
        total_w = sum(e.weight for e in self.entries)
        if total_w == 0:
            return 0.0
        return sum(e.score * e.weight for e in self.entries) / total_w

    @property
    def sources(self) -> list[str]:
        return list({e.source for e in self.entries})

    @property
    def best_entry(self) -> _BoxEntry:
        return max(self.entries, key=lambda e: e.score * e.weight)


# ---------------------------------------------------------------------------
# WBF clustering
# ---------------------------------------------------------------------------

def _wbf_cluster(entries: list[_BoxEntry], iou_thr: float) -> list[_Cluster]:
    """
    Cluster overlapping boxes using WBF.
    Returns list of clusters sorted by fused score descending.
    """
    # Sort by weighted score descending so highest-confidence is processed first
    sorted_entries = sorted(entries, key=lambda e: e.score * e.weight, reverse=True)

    clusters: list[_Cluster] = []

    for entry in sorted_entries:
        matched = False
        for cluster in clusters:
            iou = _iou(entry.box_norm, cluster.fused_box)
            if iou >= iou_thr:
                cluster.add(entry)
                matched = True
                break
        if not matched:
            clusters.append(_Cluster(entry))

    clusters.sort(key=lambda c: c.fused_score, reverse=True)
    return clusters


# ---------------------------------------------------------------------------
# Build final detection from cluster
# ---------------------------------------------------------------------------

def _build_fused_detection(
    cluster: _Cluster,
    cls_name: str,
    img_w: int,
    img_h: int,
    high_conf_threshold: float,
) -> Optional[dict]:
    """
    Apply consensus filter and return final fused dict, or None if rejected.

    Acceptance rules (any one suffices):
      1. ≥2 distinct sources contributed to this cluster
      2. Only 1 source but it's in ALWAYS_ACCEPT_SOURCES (OBB or HF defect)
      3. Only 1 source with confidence ≥ high_conf_threshold
    """
    sources = cluster.sources
    num_sources = len(sources)
    fused_score = cluster.fused_score

    accepted = False
    if num_sources >= 2:
        accepted = True
    elif any(s in ALWAYS_ACCEPT_SOURCES for s in sources):
        accepted = True
    elif fused_score >= high_conf_threshold:
        accepted = True

    if not accepted:
        logger.debug(
            "Rejected %s (sources=%s, conf=%.3f) — consensus not met",
            cls_name, sources, fused_score,
        )
        return None

    # Denormalize fused box back to pixels
    x1n, y1n, x2n, y2n = cluster.fused_box
    x1 = x1n * img_w
    y1 = y1n * img_h
    x2 = x2n * img_w
    y2 = y2n * img_h

    # Inherit other fields from the best entry
    base = cluster.best_entry.original.copy()
    base["class_name"]        = cls_name
    base["confidence"]        = round(fused_score, 4)
    base["bbox"]              = {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
    base["ensemble_sources"]  = sources
    base["ensemble_vote_count"] = num_sources
    # Preserve OBB polygon only from best entry
    if "obb_polygon" not in base:
        base["obb_polygon"] = None

    return base


# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _normalize_box(x1, y1, x2, y2, img_w, img_h) -> tuple:
    return (
        max(0.0, min(1.0, x1 / img_w)),
        max(0.0, min(1.0, y1 / img_h)),
        max(0.0, min(1.0, x2 / img_w)),
        max(0.0, min(1.0, y2 / img_h)),
    )


def _iou(b1: tuple, b2: tuple) -> float:
    ix1 = max(b1[0], b2[0])
    iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2])
    iy2 = min(b1[3], b2[3])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    a1 = max(0.0, b1[2] - b1[0]) * max(0.0, b1[3] - b1[1])
    a2 = max(0.0, b2[2] - b2[0]) * max(0.0, b2[3] - b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0
