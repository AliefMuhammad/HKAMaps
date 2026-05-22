"""
inference_service.py — application-layer service wrapping the CV pipeline.

Responsibilities:
  - Decode raw image bytes to numpy array
  - Resize to inference width (aspect-ratio preserving)
  - Call RoadDamagePipeline.run()
  - Save annotated image and original to disk (optional)
  - Build the final response dict in legacy format (backward-compatible)
  - Build the structured JSON format for the new /api/detect-road-damage endpoint
"""
import base64
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

import config as cfg
from cv_models.pipeline import RoadDamagePipeline, build_structured_output
from cv_models.postprocess import draw_annotations

logger = logging.getLogger(__name__)


class InferenceService:
    """
    Singleton-style service. Instantiate once at startup via the lifespan hook
    in main.py. All endpoints share the same loaded model weights.
    """

    def __init__(self):
        self._pipeline = RoadDamagePipeline()

    # ------------------------------------------------------------------
    # Public properties
    # ------------------------------------------------------------------

    @property
    def is_simulation_mode(self) -> bool:
        return self._pipeline.is_simulation_mode

    @property
    def model_info(self) -> list[str]:
        return self._pipeline.model_info

    # ------------------------------------------------------------------
    # Legacy format  (used by /api/inference/image and video pipeline)
    # ------------------------------------------------------------------

    def infer_image(
        self,
        image_bytes: bytes,
        session_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_status: str = "missing",
        frame_index: int = 0,
        video_timestamp_second: float = 0.0,
        save_files: bool = True,
        fast_mode: bool = False,
        detection_mode: str = "both",
    ) -> dict:
        """
        Run inference and return the legacy response dict.

        Compatible with the existing frontend and video_processor.py.
        """
        if self._pipeline.is_simulation_mode:
            detections, _, _ = self._pipeline.simulate()
            # Draw simulated bboxes on the actual frame so thumbnails are visible
            ann_b64 = None
            image = _decode_image(image_bytes)
            if image is not None and detections:
                image = _resize_for_inference(image, cfg.INFERENCE_IMAGE_MAX_WIDTH)
                annotated = draw_annotations(image, detections, draw_masks=False)
                _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 82])
                ann_b64 = base64.b64encode(buf).decode("utf-8")
            return _build_legacy_response(
                detections=detections,
                orig_url=None, ann_url=None, ann_b64=ann_b64,
                latitude=latitude, longitude=longitude,
                location_status=location_status,
                session_id=session_id,
                frame_index=frame_index,
                video_timestamp_second=video_timestamp_second,
                model_info=["SIMULATION MODE"],
                fast_mode=fast_mode,
                simulation_mode=True,
            )

        image = _decode_image(image_bytes)
        if image is None:
            return {"error": "Could not decode image bytes"}

        image = _resize_for_inference(image, cfg.INFERENCE_IMAGE_MAX_WIDTH)

        detections, annotated, _ = self._pipeline.run(
            image, fast_mode=fast_mode, detection_mode=detection_mode
        )

        ann_b64, ann_url, orig_url = None, None, None

        if detections:
            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 82])
            ann_b64 = base64.b64encode(buf).decode("utf-8")

            if save_files:
                ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")[:20]
                orig_name = f"inspection_{session_id[:8]}_{ts}_{frame_index:06d}.jpg"
                ann_name  = f"inspection_{session_id[:8]}_{ts}_{frame_index:06d}_annotated.jpg"
                cv2.imwrite(str(cfg.STORAGE_DIR / orig_name), image)
                cv2.imwrite(str(cfg.STORAGE_DIR / ann_name), annotated,
                            [cv2.IMWRITE_JPEG_QUALITY, 88])
                orig_url = f"/storage/{orig_name}"
                ann_url  = f"/storage/{ann_name}"

        return _build_legacy_response(
            detections=detections,
            orig_url=orig_url, ann_url=ann_url, ann_b64=ann_b64,
            latitude=latitude, longitude=longitude,
            location_status=location_status,
            session_id=session_id,
            frame_index=frame_index,
            video_timestamp_second=video_timestamp_second,
            model_info=self._pipeline.model_info,
            fast_mode=fast_mode,
        )

    # ------------------------------------------------------------------
    # Structured format  (used by /api/detect-road-damage)
    # ------------------------------------------------------------------

    def detect_road_damage(
        self,
        image_bytes: bytes,
        session_id: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        location_status: str = "missing",
        frame_index: int = 0,
        save_files: bool = True,
    ) -> dict:
        """
        Run inference and return the structured JSON format.
        """
        if self._pipeline.is_simulation_mode:
            detections, _, proc_ms = self._pipeline.simulate()
            structured = build_structured_output(detections, proc_ms)
            structured["meta"] = _build_meta(
                session_id, latitude, longitude, location_status, frame_index,
                simulation=True
            )
            return structured

        image = _decode_image(image_bytes)
        if image is None:
            return {"error": "Could not decode image bytes"}

        image = _resize_for_inference(image, cfg.INFERENCE_IMAGE_MAX_WIDTH)

        detections, annotated, proc_ms = self._pipeline.run(image, detection_mode="defect_only")

        ann_url = ""
        if save_files and detections:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")[:20]
            ann_name = f"damage_{session_id[:8]}_{ts}_{frame_index:06d}_annotated.jpg"
            ann_path = cfg.STORAGE_DIR / ann_name
            cv2.imwrite(str(ann_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])
            ann_url = f"/storage/{ann_name}"

        structured = build_structured_output(
            detections=detections,
            processing_time_ms=proc_ms,
            annotated_image_path=ann_url,
        )
        structured["meta"] = _build_meta(
            session_id, latitude, longitude, location_status, frame_index
        )
        return structured


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _decode_image(image_bytes: bytes) -> Optional[np.ndarray]:
    arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    return img  # None if decode fails


def _resize_for_inference(image: np.ndarray, max_width: int) -> np.ndarray:
    h, w = image.shape[:2]
    if w <= max_width:
        return image
    scale = max_width / w
    return cv2.resize(image, (max_width, int(h * scale)), interpolation=cv2.INTER_AREA)


def _build_legacy_response(
    detections, orig_url, ann_url, ann_b64,
    latitude, longitude, location_status,
    session_id, frame_index, video_timestamp_second,
    model_info, fast_mode, simulation_mode=False,
) -> dict:
    """Backward-compatible response dict used by existing frontend + video_processor."""
    # Convert internal detection format to legacy bbox dict format
    legacy_dets = []
    for det in detections:
        entry = {
            "class_name":  det["class_name"],
            "category":    det.get("category", "unknown"),
            "confidence":  det.get("confidence", 0),
            "bbox":        det.get("bbox", {}),
            "mask_polygon": det.get("mask_polygon"),
            "severity":    det.get("severity"),
            "severity_reason": det.get("severity_reason"),
            "crack_length_px":    det.get("crack_length_px"),
            "crack_width_px_avg": det.get("crack_width_px_avg"),
            "crack_area_px":      det.get("crack_area_px"),
            "measurement_unit":   det.get("measurement_unit"),
        }
        legacy_dets.append(entry)

    resp = {
        "detections":             legacy_dets,
        "original_image_url":     orig_url,
        "annotated_image_url":    ann_url,
        "annotated_image_base64": ann_b64,
        "latitude":               latitude,
        "longitude":              longitude,
        "location_status":        location_status,
        "timestamp":              datetime.now(timezone.utc).isoformat(),
        "inspection_session_id":  session_id,
        "frame_index":            frame_index,
        "video_timestamp_second": video_timestamp_second,
        "model_info":             model_info,
        "fast_mode":              fast_mode,
    }
    if simulation_mode:
        resp["simulation_mode"] = True
    return resp


def _build_meta(
    session_id, latitude, longitude, location_status, frame_index, simulation=False
) -> dict:
    meta = {
        "session_id":      session_id,
        "timestamp":       datetime.now(timezone.utc).isoformat(),
        "latitude":        latitude,
        "longitude":       longitude,
        "location_status": location_status,
        "frame_index":     frame_index,
        "source_type":     "image",
    }
    if simulation:
        meta["simulation_mode"] = True
    return meta
