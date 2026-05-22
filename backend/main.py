"""
FastAPI inference microservice for HKA MAPS road inspection.

Endpoints (existing — unchanged):
  GET  /health
  POST /api/inference/image                   — single image, legacy format
  POST /api/inference/video                   — start video processing job
  GET  /api/inference/video/{job_id}/status   — poll job status
  POST /api/inference/realtime-frame          — realtime camera frame
  POST /api/detect-road-damage                — single image, structured JSON
  POST /api/detect-road-damage-video          — video, structured JSON events
  GET  /storage/{filename}

New endpoints (v2 — JICA AMS / road_findings):
  POST /api/v2/findings/detect                — detect + save finding to DB
  GET  /api/v2/findings                       — list findings (map data)
  GET  /api/v2/findings/geojson               — GeoJSON for map layer
  GET  /api/v2/findings/{finding_id}          — single finding detail
  PATCH /api/v2/findings/{finding_id}/status  — update status
  GET  /api/v2/blackspots                     — blackspot analysis
  GET  /api/v2/spm-report                     — SPM fulfillment report
"""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import config as cfg
from cv_models.class_mapping import get_class_label
from services.findings_service import (
    get_blackspots,
    get_finding,
    get_findings,
    get_findings_geojson,
    get_spm_report,
    save_finding,
    update_finding_status,
)
from services.inference_service import InferenceService
from video_processor import create_job, get_job_status, run_video_job
from vision_service import VisionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

_vision:  Optional[VisionService]    = None
_service: Optional[InferenceService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _vision, _service
    logger.info("Loading vision models…")
    _vision  = VisionService()
    _service = _vision._service
    if _vision.is_simulation_mode:
        logger.warning("⚠  Running in SIMULATION MODE — no real inference will occur.")
    else:
        logger.info("✅ Vision models ready: %s", _vision.model_info)
    yield
    logger.info("Shutting down.")


app = FastAPI(title="HKA MAPS Inference Service", version="3.0.0", lifespan=lifespan)

_cors_origins       = cfg.CORS_ORIGINS
_allow_credentials  = "*" not in _cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/storage", StaticFiles(directory=str(cfg.STORAGE_DIR)), name="storage")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "simulation_mode": _vision.is_simulation_mode if _vision else True,
        "model_info":      _vision.model_info if _vision else [],
        "pipeline_version": "3.0.0",
        "features": {
            "segmentation":   cfg.ENABLE_SEGMENTATION,
            "measurement":    cfg.ENABLE_MEASUREMENT,
            "deep_segmenter": cfg.ENABLE_DEEP_SEGMENTER,
            "rtdetr_fp_filter": cfg.USE_RTDETR_FP_FILTER,
            "ensemble_wbf":   True,
        },
    }


# ---------------------------------------------------------------------------
# Existing: single image inference (legacy format — unchanged)
# ---------------------------------------------------------------------------

@app.post("/api/inference/image")
async def infer_image(
    image: UploadFile = File(...),
    session_id: str = Form(default=""),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="missing"),
    frame_index: int = Form(default=0),
    video_timestamp_second: float = Form(default=0.0),
):
    if not _vision:
        raise HTTPException(503, "Vision service not initialised")
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(400, "Empty image file")
    if not session_id:
        session_id = str(uuid.uuid4())
    result = _vision.infer_image(
        image_bytes=image_bytes,
        session_id=session_id,
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
        frame_index=frame_index,
        video_timestamp_second=video_timestamp_second,
        save_files=True,
    )
    if "error" in result:
        raise HTTPException(422, result["error"])
    return JSONResponse(result)


# ---------------------------------------------------------------------------
# Existing: structured road damage detection
# ---------------------------------------------------------------------------

@app.post("/api/detect-road-damage")
async def detect_road_damage(
    image: UploadFile = File(...),
    session_id: str = Form(default=""),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="missing"),
    frame_index: int = Form(default=0),
):
    if not _service:
        raise HTTPException(503, "Inference service not initialised")
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(400, "Empty image file")
    if not session_id:
        session_id = str(uuid.uuid4())
    result = _service.detect_road_damage(
        image_bytes=image_bytes,
        session_id=session_id,
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
        frame_index=frame_index,
        save_files=True,
    )
    if "error" in result:
        raise HTTPException(422, result["error"])
    return JSONResponse(result)


# ---------------------------------------------------------------------------
# Existing: video upload
# ---------------------------------------------------------------------------

@app.post("/api/inference/video")
async def start_video_job(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    session_id: str = Form(default=""),
    detection_mode: str = Form(default="both"),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="missing"),
):
    if not _vision:
        raise HTTPException(503, "Vision service not initialised")
    content = await video.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > cfg.MAX_VIDEO_FILE_SIZE_MB:
        raise HTTPException(413, f"Video too large: {size_mb:.1f} MB (max {cfg.MAX_VIDEO_FILE_SIZE_MB} MB)")
    if not session_id:
        session_id = str(uuid.uuid4())
    ext      = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_name = f"upload_{session_id[:8]}_{uuid.uuid4().hex[:8]}{ext}"
    tmp_path = cfg.UPLOAD_DIR / tmp_name
    tmp_path.write_bytes(content)
    job_id = create_job(
        video_path=str(tmp_path),
        session_id=session_id,
        detection_mode=detection_mode,
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
    )
    background_tasks.add_task(run_video_job, job_id, _vision)
    return JSONResponse({
        "job_id": job_id, "session_id": session_id, "status": "queued",
        "message": "Video processing started. Poll /api/inference/video/{job_id}/status.",
    })


@app.get("/api/inference/video/{job_id}/status")
async def get_video_status(job_id: str):
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return JSONResponse(status)


@app.post("/api/detect-road-damage-video")
async def detect_road_damage_video(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    session_id: str = Form(default=""),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="missing"),
):
    if not _vision:
        raise HTTPException(503, "Vision service not initialised")
    content = await video.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > cfg.MAX_VIDEO_FILE_SIZE_MB:
        raise HTTPException(413, f"Video too large: {size_mb:.1f} MB")
    if not session_id:
        session_id = str(uuid.uuid4())
    ext      = Path(video.filename or "video.mp4").suffix or ".mp4"
    tmp_name = f"upload_{session_id[:8]}_{uuid.uuid4().hex[:8]}{ext}"
    tmp_path = cfg.UPLOAD_DIR / tmp_name
    tmp_path.write_bytes(content)
    job_id = create_job(
        video_path=str(tmp_path),
        session_id=session_id,
        detection_mode="defect_only",
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
    )
    background_tasks.add_task(run_video_job, job_id, _vision)
    return JSONResponse({
        "job_id": job_id, "session_id": session_id, "status": "queued",
        "message": "Road damage video processing started. Poll /api/inference/video/{job_id}/status.",
    })


@app.post("/api/inference/realtime-frame")
async def infer_realtime_frame(
    image: UploadFile = File(...),
    session_id: str = Form(default=""),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="gps"),
    frame_index: int = Form(default=0),
):
    if not _vision:
        raise HTTPException(503, "Vision service not initialised")
    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(400, "Empty frame")
    if not session_id:
        session_id = str(uuid.uuid4())
    result = _vision.infer_image(
        image_bytes=image_bytes,
        session_id=session_id,
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
        frame_index=frame_index,
        save_files=False,
        fast_mode=False,
    )
    if "error" in result:
        raise HTTPException(422, result["error"])
    return JSONResponse(result)


# ===========================================================================
# NEW: /api/v2/findings — JICA AMS road findings endpoints
# ===========================================================================

@app.post("/api/v2/findings/detect")
async def detect_and_save_finding(
    image: UploadFile = File(...),
    session_id:      str   = Form(default=""),
    toll_road_id:    str   = Form(default=""),
    segment_id:      str   = Form(default=""),
    latitude:        Optional[float] = Form(default=None),
    longitude:       Optional[float] = Form(default=None),
    chainage_km:     Optional[float] = Form(default=None),
    direction:       str   = Form(default=""),
    lane:            str   = Form(default=""),
    location_status: str   = Form(default="missing"),
    frame_index:     int   = Form(default=0),
    save_to_db:      bool  = Form(default=True),
):
    """
    Detect road damage in an image AND save each finding to road_findings table.

    Returns structured JSON with all finding_ids for map rendering.
    Existing /api/detect-road-damage endpoint is NOT replaced — this is additive.
    """
    if not _service:
        raise HTTPException(503, "Inference service not initialised")

    image_bytes = await image.read()
    if not image_bytes:
        raise HTTPException(400, "Empty image file")
    if not session_id:
        session_id = str(uuid.uuid4())

    result = _service.detect_road_damage(
        image_bytes=image_bytes,
        session_id=session_id,
        latitude=latitude,
        longitude=longitude,
        location_status=location_status,
        frame_index=frame_index,
        save_files=True,
    )
    if "error" in result:
        raise HTTPException(422, result["error"])

    # Save each road_defect detection to road_findings
    saved_ids: list[Optional[str]] = []
    ann_url = result.get("output_files", {}).get("annotated_image_path", "")

    if save_to_db:
        for det in result.get("detections", []):
            if det.get("category") != "road_defect":
                continue
            finding = {
                "toll_road_id":       toll_road_id or None,
                "segment_id":         segment_id or None,
                "session_id":         session_id,
                "direction":          direction or None,
                "lane":               lane or None,
                "chainage_km":        chainage_km,
                "latitude":           latitude,
                "longitude":          longitude,
                "damage_type":        det.get("class_name", "unknown_damage").lower()
                                      .replace(" ", "_").split("(")[0].strip(),
                "damage_type_label":  det.get("class_name"),
                "severity":           det.get("severity"),
                "confidence_score":   det.get("confidence"),
                "ensemble_sources":   det.get("ensemble_sources", []),
                "bbox":               {"xyxy": det.get("bbox_xyxy")},
                "mask_polygon":       det.get("mask_polygon"),
                "estimated_area_px":  det.get("crack_area_px"),
                "estimated_length_px": det.get("crack_length_px"),
                "estimated_width_px": det.get("crack_width_px_avg"),
                "spm_indicator":      det.get("spm_indicator"),
                "spm_name":           det.get("spm_name"),
                "recommended_action": det.get("recommended_action"),
                "annotated_image_url": ann_url,
                "status":             "open",
            }
            fid = save_finding(finding)
            saved_ids.append(fid)

    result["finding_ids"] = saved_ids
    result["saved_to_db"] = save_to_db and bool(saved_ids)
    return JSONResponse(result)


@app.get("/api/v2/findings")
async def list_findings(
    toll_road_id: Optional[str] = Query(default=None),
    segment_id:   Optional[str] = Query(default=None),
    damage_type:  Optional[str] = Query(default=None),
    severity:     Optional[str] = Query(default=None),
    status:       Optional[str] = Query(default=None),
    limit:        int           = Query(default=200, le=1000),
    offset:       int           = Query(default=0, ge=0),
):
    """
    List road findings with optional filters.
    Used by the frontend map to populate the findings layer.
    """
    findings = get_findings(
        toll_road_id=toll_road_id,
        segment_id=segment_id,
        damage_type=damage_type,
        severity=severity,
        status=status,
        limit=limit,
        offset=offset,
    )
    return JSONResponse({"findings": findings, "count": len(findings)})


@app.get("/api/v2/findings/geojson")
async def findings_geojson(
    toll_road_id:    Optional[str]  = Query(default=None),
    severity_filter: Optional[str]  = Query(default=None,
                                            description="Comma-separated: low,medium,high"),
    limit:           int            = Query(default=500, le=2000),
):
    """
    Return findings as GeoJSON FeatureCollection for MapLibre GL layer.
    Frontend consumes this as a map source with click handlers.
    """
    sev_list = None
    if severity_filter:
        sev_list = [s.strip() for s in severity_filter.split(",") if s.strip()]

    geojson = get_findings_geojson(
        toll_road_id=toll_road_id,
        severity_filter=sev_list,
        limit=limit,
    )
    return JSONResponse(geojson)


@app.get("/api/v2/findings/{finding_id}")
async def get_finding_detail(finding_id: str):
    """Single finding detail — used by map popup."""
    finding = get_finding(finding_id)
    if finding is None:
        raise HTTPException(404, f"Finding {finding_id} not found")
    return JSONResponse(finding)


@app.patch("/api/v2/findings/{finding_id}/status")
async def patch_finding_status(
    finding_id: str,
    status: str = Form(...),
    notes:  str = Form(default=""),
):
    """Update finding status (open → in_progress → verified → resolved)."""
    valid_statuses = {"open", "in_progress", "verified", "resolved"}
    if status not in valid_statuses:
        raise HTTPException(400, f"Invalid status. Must be one of: {valid_statuses}")
    ok = update_finding_status(finding_id, status, notes)
    if not ok:
        raise HTTPException(500, "Status update failed")
    return JSONResponse({"finding_id": finding_id, "status": status})


@app.get("/api/v2/blackspots")
async def blackspot_analysis(
    toll_road_id: Optional[str] = Query(default=None),
    grid_size_m:  float         = Query(default=100.0),
    min_count:    int           = Query(default=3, ge=2),
):
    """
    Identify damage blackspot locations along a toll road.
    Returns clusters of ≥ min_count findings within a grid_size_m cell.
    """
    spots = get_blackspots(
        toll_road_id=toll_road_id,
        grid_size_m=grid_size_m,
        min_count=min_count,
    )
    return JSONResponse({"blackspots": spots, "count": len(spots)})


@app.get("/api/v2/spm-report")
async def spm_fulfillment_report(
    toll_road_id: Optional[str] = Query(default=None),
):
    """
    JICA SPM fulfillment report: count per SPM indicator, severity distribution,
    open high-severity findings requiring immediate attention.
    """
    report = get_spm_report(toll_road_id=toll_road_id)
    return JSONResponse(report)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
