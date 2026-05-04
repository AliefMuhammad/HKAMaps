"""
Duplicate detection filtering for video inspection pipeline.

Prevents the same physical defect/asset from being counted multiple times
across consecutive video frames.

Matching strategy (any one condition is enough within the time window):
  1. GPS proximity  — vehicle was within N metres when both detections were made.
                      Most reliable when GPS is available.
  2. IoU            — bboxes overlap significantly. Works when object hasn't moved
                      much relative to the frame (e.g. road defects at similar range).
  3. Time-only      — for ASSETS with no GPS and low IoU: if the same class appears
                      within the time window we assume it is the same physical object
                      seen from a different distance (approaching / receding).
                      NOT used for road_defects to avoid merging distinct cracks.
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
    """Great-circle distance in metres between two GPS points."""
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
    active event by any of the three matching criteria above.

    Call get_events(min_appearances=2) to filter out single-frame ghosts.
    """

    def __init__(
        self,
        iou_threshold: float = 0.45,
        time_window_seconds: float = 8.0,
        gps_radius_meters: float = 25.0,
    ):
        self.iou_threshold = iou_threshold
        self.time_window_seconds = time_window_seconds
        self.gps_radius_meters = gps_radius_meters
        self._events: list[dict] = []

    # ------------------------------------------------------------------
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
        cls      = detection["class_name"]
        category = detection["category"]
        bbox     = detection["bbox"]
        conf     = detection["confidence"]
        has_gps  = bool(latitude and longitude)

        for ev in self._events:
            if ev["class_name"] != cls:
                continue

            time_diff = abs(ev["last_seen_second"] - timestamp_second)
            if time_diff > self.time_window_seconds:
                continue

            matched = self._is_same_object(ev, bbox, category, has_gps, latitude, longitude)
            if not matched:
                continue

            # --- Match: update existing event ---
            ev["detection_count"] += 1
            ev["last_seen_second"] = timestamp_second
            ev["last_seen_frame"]  = frame_index
            if conf > ev["best_confidence"]:
                ev["best_confidence"] = conf
                ev["representative_bbox"] = bbox
                if annotated_image_url:
                    ev["representative_annotated_image_url"] = annotated_image_url
            if (detection.get("severity")
                    and self._severity_rank(detection["severity"])
                    > self._severity_rank(ev.get("severity", "low"))):
                ev["severity"] = detection["severity"]
            return ev["event_id"]

        # --- No match: create new event ---
        event_id = str(uuid.uuid4())
        self._events.append({
            "event_id":    event_id,
            "class_name":  cls,
            "category":    category,
            "best_confidence": conf,
            "severity":    detection.get("severity"),
            "first_seen_second": timestamp_second,
            "last_seen_second":  timestamp_second,
            "first_seen_frame":  frame_index,
            "last_seen_frame":   frame_index,
            "representative_bbox": bbox,
            "representative_annotated_image_url": annotated_image_url,
            "detection_count": 1,
            "latitude":  latitude,
            "longitude": longitude,
        })
        return event_id

    # ------------------------------------------------------------------
    def get_events(self, min_appearances: int = 1) -> list[dict]:
        """
        Return deduplicated events.

        min_appearances=2 filters single-frame false positives and class-flip
        ghosts (e.g. an object seen as 'videotron' far away then correctly
        as 'traffic_sign' up close — the videotron event has count=1 and
        is dropped; the traffic_sign event has count≥2 and is kept).
        """
        return [ev for ev in self._events if ev["detection_count"] >= min_appearances]

    # ------------------------------------------------------------------
    def _is_same_object(
        self,
        ev: dict,
        bbox: dict,
        category: str,
        has_gps: bool,
        latitude: Optional[float],
        longitude: Optional[float],
    ) -> bool:
        """
        Three-tier matching.  Any one match within the time window is enough.
        """
        # 1. GPS proximity (most reliable — distance between vehicle positions)
        if has_gps and ev.get("latitude") and ev.get("longitude"):
            dist = haversine_meters(latitude, longitude,
                                    ev["latitude"], ev["longitude"])
            if dist <= self.gps_radius_meters:
                return True

        # 2. IoU (reliable when object fills similar frame region)
        if compute_iou(bbox, ev["representative_bbox"]) >= self.iou_threshold:
            return True

        # 3. Time-only for assets without GPS.
        #    Rationale: during a continuous drive, the same roadside asset
        #    (pole, sign) appears in consecutive seconds. Two *different* assets
        #    of the same type within the time window would require them to be
        #    spaced < speed × window apart (e.g. < 133 m at 60 km/h / 8 s),
        #    which is acceptable for dedup (they'd still appear as separate events
        #    once the GPS kicks in or the window expires for the next one).
        #    Road defects are NOT matched this way — cracks and potholes can
        #    appear within metres of each other and need spatial discrimination.
        if not has_gps and category == "asset":
            return True

        return False

    # ------------------------------------------------------------------
    @staticmethod
    def _severity_rank(severity: Optional[str]) -> int:
        return {"low": 1, "medium": 2, "high": 3}.get(severity or "low", 0)
