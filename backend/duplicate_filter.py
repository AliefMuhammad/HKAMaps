"""
Duplicate detection filtering for video inspection pipeline.

Prevents the same physical defect/asset from being counted multiple times
across consecutive video frames.
"""
import math
import uuid
from typing import Optional


def compute_iou(box1: dict, box2: dict) -> float:
    """Intersection over Union for two bounding boxes (x1,y1,x2,y2 format)."""
    ix1 = max(box1["x1"], box2["x1"])
    iy1 = max(box1["y1"], box2["y1"])
    ix2 = min(box1["x2"], box2["x2"])
    iy2 = min(box1["y2"], box2["y2"])

    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0

    intersection = (ix2 - ix1) * (iy2 - iy1)
    area1 = max(0, (box1["x2"] - box1["x1"])) * max(0, (box1["y2"] - box1["y1"]))
    area2 = max(0, (box2["x2"] - box2["x1"])) * max(0, (box2["y2"] - box2["y1"]))
    union = area1 + area2 - intersection
    return intersection / union if union > 0 else 0.0


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in meters between two GPS points."""
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class DetectionEventTracker:
    """
    Groups individual frame-level detections into logical detection events.

    A new event is created when a detection cannot be matched to any existing
    active event (same class + overlapping bbox + within time window).
    """

    def __init__(
        self,
        iou_threshold: float = 0.45,
        time_window_seconds: float = 5.0,
        gps_radius_meters: float = 10.0,
    ):
        self.iou_threshold = iou_threshold
        self.time_window_seconds = time_window_seconds
        self.gps_radius_meters = gps_radius_meters
        self._events: list[dict] = []

    def add_detection(
        self,
        detection: dict,
        timestamp_second: float,
        frame_index: int,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        annotated_image_url: Optional[str] = None,
    ) -> str:
        """
        Try to match detection to an existing event, or create a new one.
        Returns the event_id this detection belongs to.
        """
        cls = detection["class_name"]
        bbox = detection["bbox"]
        conf = detection["confidence"]

        for ev in self._events:
            if ev["class_name"] != cls:
                continue

            time_diff = abs(ev["last_seen_second"] - timestamp_second)
            if time_diff > self.time_window_seconds:
                continue

            # Normalise bboxes to [0,1] relative coords so IOU is scale-independent
            iou = compute_iou(bbox, ev["representative_bbox"])
            if iou < self.iou_threshold:
                # Also accept GPS proximity even if bbox drifted (camera movement)
                if latitude and longitude and ev.get("latitude") and ev.get("longitude"):
                    dist = haversine_meters(latitude, longitude, ev["latitude"], ev["longitude"])
                    if dist > self.gps_radius_meters:
                        continue
                else:
                    continue

            # --- Match found: update existing event ---
            ev["detection_count"] += 1
            ev["last_seen_second"] = timestamp_second
            ev["last_seen_frame"] = frame_index
            if conf > ev["best_confidence"]:
                ev["best_confidence"] = conf
                ev["representative_bbox"] = bbox
                if annotated_image_url:
                    ev["representative_annotated_image_url"] = annotated_image_url
            if detection.get("severity") and self._severity_rank(detection["severity"]) > self._severity_rank(ev.get("severity", "low")):
                ev["severity"] = detection["severity"]
            return ev["event_id"]

        # --- No match: create new event ---
        event_id = str(uuid.uuid4())
        self._events.append({
            "event_id": event_id,
            "class_name": cls,
            "category": detection["category"],
            "best_confidence": conf,
            "severity": detection.get("severity"),
            "first_seen_second": timestamp_second,
            "last_seen_second": timestamp_second,
            "first_seen_frame": frame_index,
            "last_seen_frame": frame_index,
            "representative_bbox": bbox,
            "representative_annotated_image_url": annotated_image_url,
            "detection_count": 1,
            "latitude": latitude,
            "longitude": longitude,
        })
        return event_id

    def get_events(self) -> list[dict]:
        return list(self._events)

    @staticmethod
    def _severity_rank(severity: Optional[str]) -> int:
        return {"low": 1, "medium": 2, "high": 3}.get(severity or "low", 0)
