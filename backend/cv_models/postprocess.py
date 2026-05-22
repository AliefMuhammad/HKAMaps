"""
postprocess.py — filtering, NMS, deduplication, and annotation drawing.

Key responsibilities:
  - Confidence thresholding
  - IoU-based NMS to remove overlapping boxes from the same class
  - Spatial deduplication (same location, same class, different model outputs)
  - Aspect-ratio heuristic for street_light vs utility_pole disambiguation
  - Clean annotation rendering: bbox, class+confidence, severity, measurements,
    and segmentation mask overlay
"""
import logging
from typing import Optional

import cv2
import numpy as np

from cv_models.class_mapping import BBOX_COLORS, SEVERITY_COLORS_BGR, get_damage_color

# Area-type damage: show Span + Area on label (not L/W which is misleading)
_AREA_DAMAGE_CLASSES = frozenset({
    "pothole", "alligator_crack", "rutting", "surface_depression", "patching",
})

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# NMS helper
# ---------------------------------------------------------------------------

def _iou(b1: dict, b2: dict) -> float:
    ix1 = max(b1["x1"], b2["x1"])
    iy1 = max(b1["y1"], b2["y1"])
    ix2 = min(b1["x2"], b2["x2"])
    iy2 = min(b1["y2"], b2["y2"])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    a1 = max(0, b1["x2"] - b1["x1"]) * max(0, b1["y2"] - b1["y1"])
    a2 = max(0, b2["x2"] - b2["x1"]) * max(0, b2["y2"] - b2["y1"])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0


# ---------------------------------------------------------------------------
# Post-processing pipeline
# ---------------------------------------------------------------------------

def postprocess(
    raw_detections: list[dict],
    conf_threshold_defect: float,
    conf_threshold_asset: float,
    nms_iou_threshold: float = 0.45,
    min_bbox_area: float = 100.0,
) -> list[dict]:
    """
    Filter, deduplicate, and enrich raw detector outputs.

    Steps:
      1. Confidence threshold filter
      2. Minimum bbox area filter (removes tiny false positives)
      3. Aspect-ratio heuristic: street_light vs utility_pole
      4. Per-class NMS to remove overlapping boxes
      5. Spatial deduplication across model outputs (same class, same location)
    """
    filtered = _apply_confidence_filter(
        raw_detections, conf_threshold_defect, conf_threshold_asset
    )
    filtered = _apply_min_area_filter(filtered, min_bbox_area)
    filtered = _apply_aspect_ratio_heuristic(filtered)
    filtered = _apply_nms(filtered, nms_iou_threshold)
    filtered = _apply_spatial_dedup(filtered)
    return filtered


def _apply_confidence_filter(
    detections: list[dict],
    conf_defect: float,
    conf_asset: float,
) -> list[dict]:
    out = []
    for det in detections:
        cat = det.get("category", "unknown")
        if cat == "unknown":
            continue
        if cat == "road_defect" and det["confidence"] < conf_defect:
            continue
        if cat == "asset" and det["confidence"] < conf_asset:
            continue
        out.append(det)
    return out


def _apply_min_area_filter(
    detections: list[dict], min_area: float
) -> list[dict]:
    out = []
    for det in detections:
        b = det["bbox"]
        area = max(0, b["x2"] - b["x1"]) * max(0, b["y2"] - b["y1"])
        if area >= min_area:
            out.append(det)
    return out


def _apply_aspect_ratio_heuristic(detections: list[dict]) -> list[dict]:
    """
    Disambiguate street_light vs utility_pole by bounding box aspect ratio.
    A bare utility pole is very narrow and tall (h/w > 5).
    A street lamp has a wider upper portion (h/w ≤ 5).
    """
    out = []
    for det in detections:
        if det["class_name"] == "street_light":
            b = det["bbox"]
            bw = max(1, b["x2"] - b["x1"])
            bh = max(1, b["y2"] - b["y1"])
            if bh / bw > 5.0:
                det = {**det, "class_name": "utility_pole", "category": "asset"}
        out.append(det)
    return out


def _apply_nms(detections: list[dict], iou_threshold: float) -> list[dict]:
    """Per-class IoU-based NMS — keeps the highest-confidence box."""
    if not detections:
        return []

    # Group by (class_name, category)
    groups: dict[tuple, list] = {}
    for det in detections:
        key = (det["class_name"], det["category"])
        groups.setdefault(key, []).append(det)

    out = []
    for group in groups.values():
        group.sort(key=lambda d: d["confidence"], reverse=True)
        kept = []
        for det in group:
            if all(_iou(det["bbox"], k["bbox"]) < iou_threshold for k in kept):
                kept.append(det)
        out.extend(kept)
    return out


def _apply_spatial_dedup(detections: list[dict]) -> list[dict]:
    """
    Remove exact-same-class detections at nearly the same image location
    that may have come from two different model outputs (e.g. HF + YOLO).
    Uses a 32px grid cell key — coarser than NMS IoU but fast.
    """
    seen: set[tuple] = set()
    out = []
    for det in detections:
        b = det["bbox"]
        cx = round((b["x1"] + b["x2"]) / 2 / 32)
        cy = round((b["y1"] + b["y2"]) / 2 / 32)
        key = (det["class_name"], cx, cy)
        if key in seen:
            continue
        seen.add(key)
        out.append(det)
    return out


# ---------------------------------------------------------------------------
# Annotation drawing
# ---------------------------------------------------------------------------

def draw_annotations(
    image: np.ndarray,
    detections: list[dict],
    draw_masks: bool = True,
    mask_alpha: float = 0.35,
    use_class_colors: bool = False,
) -> np.ndarray:
    """
    Render bounding boxes, labels, severity badges, and optional mask overlays.

    Label format:
      <class_name> <confidence> [<severity>]
      L:<length>px  W:<width>px  (when measurement is available)

    Mask overlay uses a semi-transparent fill coloured by severity.
    """
    out = image.copy()

    # First pass: draw mask overlays (so boxes are on top)
    if draw_masks:
        overlay = out.copy()
        for det in detections:
            mask = det.get("_mask")         # internal numpy mask, not returned in JSON
            severity = det.get("severity")
            if mask is None or severity is None:
                continue
            color = SEVERITY_COLORS_BGR.get(severity, (100, 100, 100))
            overlay[mask > 0] = color
        cv2.addWeighted(overlay, mask_alpha, out, 1 - mask_alpha, 0, out)

    # Second pass: bounding boxes and text labels
    for det in detections:
        category = det.get("category", "unknown")
        if use_class_colors and category == "road_defect":
            color = get_damage_color(det.get("class_name", ""))
        else:
            color = BBOX_COLORS.get(category, BBOX_COLORS["unknown"])

        b = det["bbox"]
        x1, y1 = int(b["x1"]), int(b["y1"])
        x2, y2 = int(b["x2"]), int(b["y2"])

        # Bounding box — thicker for high severity
        thickness = 3 if det.get("severity") == "high" else 2
        cv2.rectangle(out, (x1, y1), (x2, y2), color, thickness)

        # Build label lines
        cls_label = det["class_name"].replace("_", " ").title()
        sev       = det.get("severity", "")
        conf      = det.get("confidence", 0)
        line1     = f"{cls_label} {conf:.2f}"
        if sev:
            line1 += f"  [{sev.upper()}]"

        lines = [line1]

        cls_name  = det.get("class_name", "")
        length_px = det.get("crack_length_px")
        width_px  = det.get("crack_width_px_avg")
        area_px   = det.get("crack_area_px")
        equiv_d   = det.get("equiv_diameter_px")

        if cls_name in _AREA_DAMAGE_CLASSES:
            # Show span (longest bbox dim) and area — skeleton length is misleading here
            if length_px is not None and length_px > 0:
                area_str = f"  A:{area_px:.0f}px²" if area_px else ""
                lines.append(f"Span:{length_px:.0f}px{area_str}")
        else:
            # Linear cracks: L = skeleton/contour length, W = distance transform
            if length_px is not None and length_px > 0:
                lines.append(f"L:{length_px:.0f}px  W:{width_px:.1f}px")

        _draw_label_box(out, lines, x1, y1, color)

    return out


def _draw_label_box(
    img: np.ndarray,
    lines: list[str],
    x1: int,
    y1: int,
    color: tuple,
) -> None:
    font       = cv2.FONT_HERSHEY_SIMPLEX
    font_scale = 0.42
    thickness  = 1
    pad        = 4

    # Measure all lines to find the widest
    sizes = [cv2.getTextSize(ln, font, font_scale, thickness)[0] for ln in lines]
    box_w = max(s[0] for s in sizes) + pad * 2
    line_h = max(s[1] for s in sizes)
    box_h = (line_h + pad) * len(lines) + pad

    # Position label above the bbox (clamp to image top)
    lx1 = x1
    ly1 = max(0, y1 - box_h)
    lx2 = x1 + box_w
    ly2 = y1

    cv2.rectangle(img, (lx1, ly1), (lx2, ly2), color, -1)

    for i, (line, (tw, th)) in enumerate(zip(lines, sizes)):
        ty = ly1 + pad + th + i * (line_h + pad)
        cv2.putText(img, line, (lx1 + pad, ty), font, font_scale,
                    (255, 255, 255), thickness, cv2.LINE_AA)
