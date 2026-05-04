"""
FastAPI inference microservice for HKA MAPS road inspection.

Endpoints:
  GET  /health                               — liveness check
  POST /api/inference/image                  — single image inference
  POST /api/inference/video                  — start video processing job
  GET  /api/inference/video/{job_id}/status  — poll job status / results
  GET  /storage/{filename}                   — serve annotated images
"""
import logging
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import config as cfg
from video_processor import create_job, get_job_status, run_video_job
from vision_service import VisionService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App lifecycle — load model once at startup
# ---------------------------------------------------------------------------
_vision: Optional[VisionService] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _vision
    logger.info("Loading vision models…")
    _vision = VisionService()
    if _vision.is_simulation_mode:
        logger.warning("⚠  Running in SIMULATION MODE — no real inference will occur.")
    else:
        logger.info("✅ Vision models ready.")
    yield
    logger.info("Shutting down.")


app = FastAPI(title="HKA MAPS Inference Service", version="1.0.0", lifespan=lifespan)

_cors_origins = cfg.CORS_ORIGINS
_allow_credentials = "*" not in _cors_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve saved frames/annotated images as static files
app.mount("/storage", StaticFiles(directory=str(cfg.STORAGE_DIR)), name="storage")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "simulation_mode": _vision.is_simulation_mode if _vision else True,
    }


# ---------------------------------------------------------------------------
# Single image inference
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
# Video upload & processing
# ---------------------------------------------------------------------------

@app.post("/api/inference/video")
async def start_video_job(
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    session_id: str = Form(default=""),
    detection_mode: str = Form(default="both"),   # both | asset_only | defect_only
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="missing"),
):
    if not _vision:
        raise HTTPException(503, "Vision service not initialised")

    # Size guard
    content = await video.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > cfg.MAX_VIDEO_FILE_SIZE_MB:
        raise HTTPException(413, f"Video too large: {size_mb:.1f} MB (max {cfg.MAX_VIDEO_FILE_SIZE_MB} MB)")

    if not session_id:
        session_id = str(uuid.uuid4())

    # Save to uploads directory
    ext = Path(video.filename or "video.mp4").suffix or ".mp4"
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
        "job_id": job_id,
        "session_id": session_id,
        "status": "queued",
        "message": "Video processing started. Poll /api/inference/video/{job_id}/status for progress.",
    })


@app.get("/api/inference/video/{job_id}/status")
async def get_video_status(job_id: str):
    status = get_job_status(job_id)
    if status is None:
        raise HTTPException(404, f"Job {job_id} not found")
    return JSONResponse(status)


# ---------------------------------------------------------------------------
# Real-time frame endpoint (prepared for future camera mode)
# ---------------------------------------------------------------------------

@app.post("/api/inference/realtime-frame")
async def infer_realtime_frame(
    image: UploadFile = File(...),
    session_id: str = Form(default=""),
    latitude: Optional[float] = Form(default=None),
    longitude: Optional[float] = Form(default=None),
    location_status: str = Form(default="gps"),
    frame_index: int = Form(default=0),
):
    """
    Realtime camera frame endpoint — runs the same full pipeline as video upload.
    - save_files=False  — no disk I/O, keeps latency low.
    - fast_mode=False   — YOLO-World (~0.2s/frame on MPS) runs on every frame,
                          giving the same asset coverage as the video pipeline.
    - annotated_image_base64 is returned in-memory when detections exist.
    """
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
        fast_mode=False,  # full pipeline: HF defect model + YOLO-World assets + YOLO
    )

    if "error" in result:
        raise HTTPException(422, result["error"])

    return JSONResponse(result)
