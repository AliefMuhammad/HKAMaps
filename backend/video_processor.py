"""
Video processing pipeline — extract sampled frames from an uploaded video,
run inference on each frame, apply duplicate filtering, and build detection events.
"""
import asyncio
import logging
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Optional

import cv2

import config as cfg
from duplicate_filter import DetectionEventTracker
from vision_service import VisionService

logger = logging.getLogger(__name__)

# In-memory job store  {job_id: JobStatus}
_JOBS: dict[str, dict] = {}


def create_job(
    video_path: str,
    session_id: str,
    detection_mode: str = "both",          # "both" | "asset_only" | "defect_only"
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_status: str = "missing",
) -> str:
    job_id = str(uuid.uuid4())
    _JOBS[job_id] = {
        "job_id": job_id,
        "session_id": session_id,
        "video_path": video_path,
        "detection_mode": detection_mode,
        "latitude": latitude,
        "longitude": longitude,
        "location_status": location_status,
        "status": "queued",
        "progress": 0,
        "frames_total": 0,
        "frames_processed": 0,
        "detections_count": 0,
        "events_count": 0,
        "results": [],          # per-frame results (only frames with detections)
        "events": [],           # detection events after deduplication
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
    }
    return job_id


def get_job(job_id: str) -> Optional[dict]:
    return _JOBS.get(job_id)


def get_job_status(job_id: str) -> Optional[dict]:
    job = _JOBS.get(job_id)
    if not job:
        return None
    # Return a safe copy without heavy result payloads when still processing
    summary = {k: v for k, v in job.items() if k not in ("results",)}
    if job["status"] == "completed":
        summary["results"] = job["results"]
    return summary


async def run_video_job(job_id: str, vision: VisionService) -> None:
    """
    Async wrapper that runs video processing in a background thread so FastAPI
    stays responsive. Progress is updated in _JOBS[job_id].
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _process_video_sync, job_id, vision)


# ---------------------------------------------------------------------------
# Core synchronous processing
# ---------------------------------------------------------------------------

def _process_video_sync(job_id: str, vision: VisionService) -> None:
    job = _JOBS[job_id]
    job["status"] = "processing"
    video_path = job["video_path"]

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        job["status"] = "failed"
        job["error"] = f"Cannot open video file: {video_path}"
        return

    try:
        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps if fps > 0 else 0

        # Enforce maximum duration
        if duration_sec > cfg.MAX_VIDEO_DURATION_SECONDS:
            logger.warning("Video longer than %ds — truncating to %ds",
                           duration_sec, cfg.MAX_VIDEO_DURATION_SECONDS)
            duration_sec = cfg.MAX_VIDEO_DURATION_SECONDS
            total_frames = int(duration_sec * fps)

        # Compute frame sampling interval
        sample_interval_frames = max(1, int(fps / cfg.VIDEO_FPS_SAMPLE))
        sampled_count = total_frames // sample_interval_frames

        job["frames_total"] = sampled_count

        tracker = DetectionEventTracker(
            iou_threshold=cfg.IOU_DUPLICATE_THRESHOLD,
            time_window_seconds=cfg.TIME_DUPLICATE_WINDOW_SECONDS,
            gps_radius_meters=cfg.GPS_DUPLICATE_RADIUS_METERS,
        )

        frame_idx = 0
        sample_num = 0
        all_results = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break

            video_second = frame_idx / fps if fps > 0 else 0

            if video_second > cfg.MAX_VIDEO_DURATION_SECONDS:
                break

            if frame_idx % sample_interval_frames == 0:
                ts_start = time.time()

                # Encode frame to JPEG bytes for vision service
                _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 88])
                image_bytes = buf.tobytes()

                # Run zero-shot only every N sampled frames to keep video processing fast.
                # On frames in-between, YOLO + HF defect model still run (fast).
                use_zero_shot = (sample_num % max(1, cfg.ZERO_SHOT_EVERY_N_FRAMES) == 0)

                result = vision.infer_image(
                    image_bytes=image_bytes,
                    session_id=job["session_id"],
                    latitude=job["latitude"],
                    longitude=job["longitude"],
                    location_status=job["location_status"],
                    frame_index=sample_num,
                    video_timestamp_second=round(video_second, 2),
                    save_files=True,
                    fast_mode=not use_zero_shot,
                )

                # Apply detection mode filter
                result["detections"] = _filter_by_mode(
                    result["detections"], job["detection_mode"]
                )

                # Only store frames that had detections (save storage)
                if result["detections"]:
                    job["detections_count"] += len(result["detections"])

                    # Register detections into event tracker
                    for det in result["detections"]:
                        event_id = tracker.add_detection(
                            detection=det,
                            timestamp_second=video_second,
                            frame_index=sample_num,
                            latitude=job["latitude"],
                            longitude=job["longitude"],
                            annotated_image_url=result.get("annotated_image_url"),
                        )
                        det["event_id"] = event_id

                    all_results.append(result)

                sample_num += 1
                job["frames_processed"] = sample_num
                job["progress"] = int((sample_num / max(1, sampled_count)) * 100)

                elapsed = time.time() - ts_start
                logger.debug("Frame %d/%d processed in %.2fs, %d detections",
                             sample_num, sampled_count, elapsed, len(result["detections"]))

            frame_idx += 1

        job["results"] = all_results
        job["events"] = tracker.get_events(min_appearances=cfg.MIN_EVENT_APPEARANCES)
        job["events_count"] = len(job["events"])
        job["status"] = "completed"
        job["progress"] = 100
        job["completed_at"] = datetime.now(timezone.utc).isoformat()

        logger.info("Job %s completed: %d frames, %d detections, %d events",
                    job_id, sample_num, job["detections_count"], job["events_count"])

    except Exception as exc:
        logger.exception("Job %s failed: %s", job_id, exc)
        job["status"] = "failed"
        job["error"] = str(exc)
    finally:
        cap.release()
        # Clean up uploaded video file
        try:
            Path(video_path).unlink(missing_ok=True)
        except Exception:
            pass


def _filter_by_mode(detections: list, mode: str) -> list:
    if mode == "asset_only":
        return [d for d in detections if d["category"] == "asset"]
    if mode == "defect_only":
        return [d for d in detections if d["category"] == "road_defect"]
    return detections
