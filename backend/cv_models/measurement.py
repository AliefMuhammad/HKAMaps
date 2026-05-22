"""
measurement.py — Stage 3: crack metric estimation from segmentation masks.

All measurements are pixel-based unless camera calibration is provided.
This module never claims real-world dimensions without a valid calibration.

Functions:
  calculate_crack_area(mask)
  calculate_crack_length(mask)
  calculate_crack_width(mask)
  calculate_bbox_dimensions(bbox)
  estimate_severity(class_name, length_px, width_px_avg, area_px, confidence)
  measure_detection(mask, bbox, class_name, confidence)  — convenience wrapper
  pixel_to_meter(px, meters_per_pixel)                   — calibration helper

Skeleton-based length (more accurate for elongated cracks):
  Uses scikit-image skeletonize() when available, falls back to contour-based
  max-dimension estimate. Both approaches are clearly labelled in the output.
"""
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Optional scikit-image for accurate skeletonization
try:
    from skimage.morphology import skeletonize as _sk_skeletonize
    _SKIMAGE_AVAILABLE = True
except ImportError:
    _SKIMAGE_AVAILABLE = False
    logger.info(
        "scikit-image not installed — using contour-based length estimation. "
        "Install with: pip install scikit-image"
    )

# ---------------------------------------------------------------------------
# Depth estimation disclaimer (applied to every detection)
# ---------------------------------------------------------------------------
DEPTH_DISCLAIMER = (
    "Depth cannot be accurately estimated from a single RGB image without "
    "camera calibration, stereo vision, LiDAR, or a depth sensor."
)


# ---------------------------------------------------------------------------
# Severity thresholds (configurable per class)
# ---------------------------------------------------------------------------

_SEVERITY_CONFIG: dict[str, dict] = {
    "pothole": {
        "high_area":   15_000, "medium_area":  5_000,
        "high_width":     40,  "medium_width":    20,
    },
    "alligator_crack": {
        "high_area":   20_000, "medium_area":  8_000,
        "high_width":     20,  "medium_width":    10,
    },
    "longitudinal_crack": {
        "high_length":   200,  "medium_length":  80,
        "high_width":     12,  "medium_width":    6,
    },
    "transverse_crack": {
        "high_length":   150,  "medium_length":  60,
        "high_width":     12,  "medium_width":    6,
    },
    "hairline_crack": {
        "high_length":   300,  "medium_length": 120,
        "high_width":      4,  "medium_width":    2,
    },
    "patching": {
        "high_area":   20_000, "medium_area":  6_000,
        "high_width":     30,  "medium_width":   15,
    },
    # --- New extended classes ---
    "rutting": {
        "high_area":   25_000, "medium_area": 10_000,
        "high_width":     50,  "medium_width":    25,
    },
    "raveling": {
        "high_area":   18_000, "medium_area":  7_000,
        "high_width":     40,  "medium_width":    20,
    },
    "water_ponding": {
        "high_area":   30_000, "medium_area": 12_000,
        "high_width":     80,  "medium_width":    40,
    },
    "surface_depression": {
        "high_area":   20_000, "medium_area":  8_000,
        "high_width":     45,  "medium_width":    22,
    },
    "shoulder_crack": {
        "high_length":   180,  "medium_length":  70,
        "high_width":     10,  "medium_width":    5,
    },
    "shoulder_pothole": {
        "high_area":   12_000, "medium_area":  4_000,
        "high_width":     35,  "medium_width":    18,
    },
    "_default": {
        "high_area":   12_000, "medium_area":  4_000,
        "high_width":     20,  "medium_width":   10,
    },
}


# ---------------------------------------------------------------------------
# Public measurement functions
# ---------------------------------------------------------------------------

def calculate_crack_area(mask: np.ndarray) -> float:
    """Total number of foreground pixels in the mask."""
    return float(np.count_nonzero(mask))


def calculate_crack_length(mask: np.ndarray) -> tuple[float, str]:
    """
    Estimate crack length in pixels.

    Returns:
      (length_px, method_used)
      method_used is "skeleton" or "contour_bbox"
    """
    if _SKIMAGE_AVAILABLE:
        binary_bool = mask > 0
        skeleton = _sk_skeletonize(binary_bool)
        length = float(np.sum(skeleton))
        if length > 0:
            return length, "skeleton"

    # Fallback: max dimension of the tightest bounding rect
    contours, _ = cv2.findContours(
        (mask > 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )
    if not contours:
        return 0.0, "contour_bbox"
    cnt = max(contours, key=cv2.contourArea)
    # Minimum area rectangle gives a more accurate length for curved cracks
    _, (rw, rh), _ = cv2.minAreaRect(cnt)
    length = float(max(rw, rh))
    return length, "contour_bbox"


def calculate_crack_width(mask: np.ndarray) -> tuple[float, float]:
    """
    Estimate average and maximum crack width in pixels using distance transform.

    For each foreground pixel, the distance transform gives the distance to the
    nearest background pixel. Width at that point ≈ 2 × distance value.

    Returns:
      (avg_width_px, max_width_px)
    """
    binary = (mask > 0).astype(np.uint8)
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    # Only consider pixels that are part of the crack
    widths = dist[binary > 0] * 2.0
    if len(widths) == 0:
        return 0.0, 0.0
    return float(np.mean(widths)), float(np.max(widths))


def calculate_bbox_dimensions(bbox: dict) -> tuple[float, float, float]:
    """
    Return (width_px, height_px, area_px) of a bounding box.
    """
    w = max(0.0, bbox["x2"] - bbox["x1"])
    h = max(0.0, bbox["y2"] - bbox["y1"])
    return w, h, w * h


def estimate_severity(
    class_name: str,
    length_px: float,
    width_px_avg: float,
    area_px: float,
    confidence: float,
) -> tuple[str, str]:
    """
    Classify damage severity as 'low', 'medium', or 'high'.

    Returns:
      (severity_level, human_readable_reason)
    """
    cfg = _SEVERITY_CONFIG.get(class_name, _SEVERITY_CONFIG["_default"])

    # --- Potholes ---
    if class_name == "pothole":
        if area_px >= cfg["high_area"] or width_px_avg >= cfg["high_width"]:
            return "high", "Large pothole — significant area or wide opening"
        if area_px >= cfg["medium_area"] or width_px_avg >= cfg["medium_width"]:
            return "medium", "Moderate pothole — visible surface failure"
        return "low", "Small pothole — minor surface damage"

    # --- Alligator / fatigue cracking ---
    if class_name == "alligator_crack":
        if area_px >= cfg["high_area"]:
            return "high", "Extensive alligator cracking — structural fatigue"
        if area_px >= cfg["medium_area"]:
            return "medium", "Moderate alligator cracking — progressive fatigue"
        return "low", "Early-stage alligator cracking"

    # --- Linear cracks (longitudinal, transverse, hairline) ---
    if class_name in ("longitudinal_crack", "transverse_crack", "hairline_crack"):
        high_length  = cfg.get("high_length",  200)
        med_length   = cfg.get("medium_length", 80)
        high_width   = cfg.get("high_width",    12)
        med_width    = cfg.get("medium_width",   6)

        if length_px >= high_length and width_px_avg >= high_width:
            return "high", "Long, wide crack — requires immediate repair"
        if length_px >= high_length or width_px_avg >= high_width:
            return "medium", "Significant crack length or width"
        if length_px >= med_length or width_px_avg >= med_width:
            return "medium", "Moderate crack development"
        return "low", "Minor crack — monitor for progression"

    # --- Repair / patching ---
    if class_name == "patching":
        if area_px >= cfg["high_area"]:
            return "medium", "Large repair patch — may indicate repeated failure"
        return "low", "Repair patch present — condition depends on patch integrity"

    # --- Rutting ---
    if class_name == "rutting":
        if area_px >= cfg["high_area"] or width_px_avg >= cfg["high_width"]:
            return "high", "Severe rutting — structural failure risk"
        if area_px >= cfg["medium_area"] or width_px_avg >= cfg["medium_width"]:
            return "medium", "Moderate rutting — check sub-base drainage"
        return "low", "Minor rutting — monitor with profile survey"

    # --- Raveling ---
    if class_name == "raveling":
        if area_px >= cfg["high_area"]:
            return "high", "Extensive surface deterioration — overlay required"
        if area_px >= cfg["medium_area"]:
            return "medium", "Moderate aggregate loss — chip seal recommended"
        return "low", "Early raveling — surface treatment may suffice"

    # --- Water ponding ---
    if class_name == "water_ponding":
        if area_px >= cfg["high_area"] or width_px_avg >= cfg["high_width"]:
            return "high", "Large ponding area — drainage failure, URGENT"
        if area_px >= cfg["medium_area"] or width_px_avg >= cfg["medium_width"]:
            return "medium", "Significant ponding — drainage repair needed"
        return "low", "Minor ponding — clean drainage channels"

    # --- Surface depression ---
    if class_name == "surface_depression":
        if area_px >= cfg["high_area"] or width_px_avg >= cfg["high_width"]:
            return "high", "Large depression — sub-grade failure likely"
        if area_px >= cfg["medium_area"] or width_px_avg >= cfg["medium_width"]:
            return "medium", "Moderate depression — investigate base layers"
        return "low", "Minor depression — monitor settlement"

    # --- Shoulder cracks ---
    if class_name == "shoulder_crack":
        high_length = cfg.get("high_length", 180)
        med_length  = cfg.get("medium_length", 70)
        high_width  = cfg.get("high_width", 10)
        med_width   = cfg.get("medium_width", 5)
        if length_px >= high_length or width_px_avg >= high_width:
            return "high", "Extensive shoulder crack — edge failure risk"
        if length_px >= med_length or width_px_avg >= med_width:
            return "medium", "Significant shoulder crack — repair before spreading"
        return "low", "Minor shoulder crack — monitor"

    # --- Shoulder pothole ---
    if class_name == "shoulder_pothole":
        if area_px >= cfg["high_area"] or width_px_avg >= cfg["high_width"]:
            return "high", "Large shoulder pothole — road safety risk"
        if area_px >= cfg["medium_area"] or width_px_avg >= cfg["medium_width"]:
            return "medium", "Moderate shoulder pothole — repair within 7 days"
        return "low", "Small shoulder pothole — patch when convenient"

    # --- Generic fallback ---
    high_area = cfg.get("high_area", 12_000)
    med_area  = cfg.get("medium_area", 4_000)
    if area_px >= high_area or (confidence > 0.85 and area_px >= med_area):
        return "high",   "Large damage area"
    if area_px >= med_area:
        return "medium", "Moderate damage area"
    return "low", "Small damage area"


# Classes where "length" = skeleton/contour of a linear crack.
# For area-type damage (pothole, alligator_crack), skeleton traces every mesh
# branch and produces misleadingly large numbers — use bbox span instead.
_LINEAR_CRACK_CLASSES = frozenset({
    "longitudinal_crack", "transverse_crack", "hairline_crack",
    "shoulder_crack",
})
_AREA_DAMAGE_CLASSES = frozenset({
    "pothole", "alligator_crack", "rutting", "surface_depression", "patching",
    "raveling", "water_ponding", "shoulder_pothole",
})


def measure_detection(
    mask: Optional[np.ndarray],
    bbox: dict,
    class_name: str,
    confidence: float,
) -> dict:
    """
    Convenience wrapper: computes all metrics for one detection.

    Measurement strategy differs by damage type:
    - Linear cracks (longitudinal/transverse/hairline):
        length = skeleton pixel count or contour max-dim
        width  = distance transform mean/max
    - Area damage (pothole, alligator_crack, rutting, patching):
        length = longest bbox dimension  (span of damage, not branch length)
        width  = shortest bbox dimension
        area   = mask pixel count (if available) or bbox area
        equiv_diameter = 2 * sqrt(area / π) — diameter of equivalent circle

    This prevents alligator_crack skeleton from producing values like L:4770px
    (which traces every mesh branch) that are technically correct but misleading.
    """
    bbox_w, bbox_h, bbox_area = calculate_bbox_dimensions(bbox)
    has_mask = mask is not None and np.count_nonzero(mask) > 0

    if class_name in _AREA_DAMAGE_CLASSES:
        # Area-type: use bbox span regardless of mask availability
        area_px       = calculate_crack_area(mask) if has_mask else bbox_area
        length_px     = float(max(bbox_w, bbox_h))   # longest dimension = span
        width_avg_px  = float(min(bbox_w, bbox_h))
        width_max_px  = width_avg_px
        length_method = "bbox_span"
        measurement_unit = "pixel_estimate_from_bbox"
    elif has_mask:
        # Linear crack with mask: skeleton/contour for accurate length
        area_px                    = calculate_crack_area(mask)
        length_px, length_method   = calculate_crack_length(mask)
        width_avg_px, width_max_px = calculate_crack_width(mask)
        measurement_unit           = "pixel_estimate_from_mask"
    else:
        # Linear crack, no mask — fallback to bbox proxy
        area_px       = bbox_area
        length_px     = float(max(bbox_w, bbox_h))
        width_avg_px  = float(min(bbox_w, bbox_h))
        width_max_px  = width_avg_px
        length_method = "bbox_proxy"
        measurement_unit = "pixel_estimate_from_bbox"

    # Equivalent circle diameter — meaningful for potholes / area damage
    import math
    equiv_diameter_px = round(2.0 * math.sqrt(max(0, area_px) / math.pi), 1)

    severity, severity_reason = estimate_severity(
        class_name, length_px, width_avg_px, area_px, confidence
    )

    return {
        "crack_length_px":      round(length_px, 1),
        "crack_width_px_avg":   round(width_avg_px, 2),
        "crack_width_px_max":   round(width_max_px, 2),
        "crack_area_px":        round(area_px, 1),
        "equiv_diameter_px":    equiv_diameter_px,
        "bbox_width_px":        round(bbox_w, 1),
        "bbox_height_px":       round(bbox_h, 1),
        "length_method":        length_method,
        "measurement_unit":     measurement_unit,
        "severity":             severity,
        "severity_reason":      severity_reason,
        "depth_estimation_available": False,
        "depth_note":           DEPTH_DISCLAIMER,
    }


def pixel_to_meter(
    px: float,
    meters_per_pixel: float,
) -> float:
    """Convert pixel distance to meters using a known scale factor."""
    return round(px * meters_per_pixel, 4)
