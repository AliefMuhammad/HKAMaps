"""
vision_service.py — backward-compatible shim.

Delegates all logic to services.inference_service.InferenceService,
which in turn uses the modular cv_models pipeline.

main.py and video_processor.py import VisionService from here.
Existing callers keep working without modification.
"""
from typing import Optional

from services.inference_service import InferenceService


class VisionService:
    """Backward-compatible wrapper around InferenceService."""

    def __init__(self):
        self._service = InferenceService()

    @property
    def is_simulation_mode(self) -> bool:
        return self._service.is_simulation_mode

    @property
    def model_info(self) -> list[str]:
        return self._service.model_info

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
        return self._service.infer_image(
            image_bytes=image_bytes,
            session_id=session_id,
            latitude=latitude,
            longitude=longitude,
            location_status=location_status,
            frame_index=frame_index,
            video_timestamp_second=video_timestamp_second,
            save_files=save_files,
            fast_mode=fast_mode,
            detection_mode=detection_mode,
        )
