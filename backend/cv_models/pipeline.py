"""
pipeline.py — Multi-model ensemble road damage detection pipeline.

Stage 1 — Parallel Detection:
  OBBCrackDetector      (local fine-tuned Indonesia — highest priority)
  HFRoadDefectDetector  (HuggingFace YOLO12s RDD2022)
  ZeroShotAssetDetector (YOLO-World — assets + extended damage labels)
  YOLODetector          (custom weights or COCO fallback)

Stage 1b — False Positive Filtering:
  RTDETRFPFilter        (COCO-pretrained RT-DETR, suppresses vehicle/person FPs)

Stage 1c — Ensemble Fusion:
  WBF (Weighted Box Fusion) across all model outputs per class
  Consensus voting: ≥2 models OR high-conf single trusted model

Stage 2 — Segmentation Refinement:
  ClassicalCrackSegmenter    (CLAHE + adaptive threshold + morphology)
  SegFormerROISegmenter      (optional road-surface ROI mask)

Stage 3 — Measurement + SPM Mapping:
  measure_detection()        (crack length, width, area, severity)
  spm_mapper.map_finding()   (SPM indicator + recommended_action)

Public API:
  pipeline = RoadDamagePipeline()
  results  = pipeline.run(image_np)          → list[dict]
  pipeline.is_simulation_mode                → bool
  pipeline.model_info                        → list[str]

Output dict per finding includes all fields for road_findings DB schema.
"""
import logging
import time
from typing import Optional

import cv2
import numpy as np

import config as cfg
from cv_models.class_mapping import get_class_code, get_class_label, get_damage_color
from cv_models.detector import (
    HFRoadDefectDetector,
    OBBCrackDetector,
    RTDETRFPFilter,
    YOLODetector,
    ZeroShotAssetDetector,
)
from cv_models.ensemble import (
    SRC_HF_DEFECT,
    SRC_OBB,
    SRC_RTDETR,
    SRC_YOLO,
    SRC_ZERO_SHOT,
    ensemble_detections,
)
from cv_models.measurement import measure_detection
from cv_models.postprocess import draw_annotations, postprocess
from cv_models.segmenter import ClassicalCrackSegmenter
from cv_models.spm_mapper import map_finding

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Pipeline
# ---------------------------------------------------------------------------

class RoadDamagePipeline:
    """
    Multi-model ensemble pipeline with WBF fusion and SPM mapping.
    Falls back gracefully when individual models are unavailable.
    Enters simulation mode only when NO real model can be loaded.
    """

    def __init__(self):
        self._obb_defect:  Optional[OBBCrackDetector]       = None
        self._hf_defect:   Optional[HFRoadDefectDetector]   = None
        self._zero_shot:   Optional[ZeroShotAssetDetector]  = None
        self._fp_filter:   Optional[RTDETRFPFilter]         = None
        self._yolo:        Optional[YOLODetector]           = None
        self._segmenter:   Optional[ClassicalCrackSegmenter] = None
        self._roi_segmenter = None   # SegFormerROISegmenter (optional)
        self._simulation_mode = False
        self._model_info: list[str] = []
        self._load_all()

    # ------------------------------------------------------------------
    def _load_all(self):
        # OBB local model (highest priority — Indonesia-specific)
        if cfg.MODEL_OBB_PATH:
            det = OBBCrackDetector(model_path=cfg.MODEL_OBB_PATH)
            if det.available:
                self._obb_defect = det
                self._model_info.append(f"OBB[{cfg.MODEL_OBB_PATH}]")

        # HuggingFace RDD2022 model
        if cfg.USE_HF_DEFECT_MODEL:
            det = HFRoadDefectDetector(
                model_id=cfg.HF_DEFECT_MODEL_ID,
                filename=cfg.HF_DEFECT_FILENAME,
                cache_dir=cfg.HF_CACHE_DIR,
                token=cfg.HF_TOKEN,
            )
            if det.available:
                self._hf_defect = det
                self._model_info.append(f"HF[{cfg.HF_DEFECT_MODEL_ID}]")

        # YOLO-World zero-shot (assets + extended damage types)
        if cfg.USE_ZERO_SHOT_ASSETS:
            # Combine asset labels + extended damage labels
            labels = _build_zero_shot_labels()
            det = ZeroShotAssetDetector(
                model_id=cfg.ZERO_SHOT_MODEL_ID,
                labels=labels,
                threshold=cfg.ZERO_SHOT_THRESHOLD,
            )
            if det.available:
                self._zero_shot = det
                self._model_info.append(f"ZeroShot[{len(labels)} labels]")

        # RT-DETR FP filter (optional)
        if cfg.USE_RTDETR_FP_FILTER:
            fp = RTDETRFPFilter(
                model_id=cfg.RTDETR_MODEL_ID,
                fp_iou_threshold=cfg.RTDETR_FP_IOU_THRESHOLD,
            )
            if fp.available:
                self._fp_filter = fp
                self._model_info.append(f"RTDETR-FP-Filter[{cfg.RTDETR_MODEL_ID}]")

        # YOLO custom/fallback
        self._yolo = YOLODetector(
            asset_path=cfg.MODEL_ASSET_PATH,
            defect_path=cfg.MODEL_DEFECT_PATH,
            combined_path=cfg.MODEL_COMBINED_PATH,
            pretrained_fallback=cfg.YOLO_PRETRAINED_FALLBACK,
        )
        if self._yolo.available:
            self._model_info.append("YOLO")

        if not any([self._obb_defect, self._hf_defect,
                    self._zero_shot, self._yolo.available]):
            logger.error("No detection model loaded — entering SIMULATION MODE.")
            self._simulation_mode = True
        else:
            logger.info("Active models: %s", " | ".join(self._model_info))

        # Stage 2 — classical segmenter
        if cfg.ENABLE_SEGMENTATION:
            self._segmenter = ClassicalCrackSegmenter()
            logger.info("Crack segmenter: ClassicalCrackSegmenter (CLAHE+morphology)")

        # Stage 2b — optional SegFormer ROI segmenter
        if cfg.ENABLE_DEEP_SEGMENTER:
            try:
                from cv_models.segmenter_deep import SegFormerROISegmenter
                roi = SegFormerROISegmenter(model_id=cfg.SEGFORMER_MODEL_ID)
                if roi.available:
                    self._roi_segmenter = roi
                    self._model_info.append(f"SegFormer-ROI[{cfg.SEGFORMER_MODEL_ID}]")
            except Exception as exc:
                logger.warning("SegFormer ROI segmenter init failed: %s", exc)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    @property
    def is_simulation_mode(self) -> bool:
        return self._simulation_mode

    @property
    def model_info(self) -> list[str]:
        return self._model_info

    def run(
        self,
        image: np.ndarray,
        fast_mode: bool = False,
        detection_mode: str = "both",
    ) -> tuple[list[dict], np.ndarray, float]:
        """
        Run the full ensemble pipeline on a BGR numpy image.

        Returns:
          (detections, annotated_image, processing_time_ms)

        Each detection dict contains all output schema fields including
        measurements, SPM indicator, recommended_action.
        """
        t0 = time.perf_counter()
        h, w = image.shape[:2]

        # ---- Stage 1: collect raw detections from all models ----
        raw_batches = self._run_detectors(image, fast_mode=fast_mode)

        # ---- Stage 1b: RT-DETR FP filter (damage detections only) ----
        raw_damage = [d for _, dets in raw_batches for d in dets
                      if d.get("category") == "road_defect"]
        if self._fp_filter and raw_damage:
            keep_mask = self._fp_filter.get_fp_mask(image, raw_damage)
            # Rebuild batches with suppressed detections removed
            raw_batches = _apply_fp_mask(raw_batches, keep_mask)

        # ---- Stage 1c: WBF ensemble fusion ----
        model_weights = {
            SRC_OBB:       cfg.ENSEMBLE_WEIGHT_OBB,
            SRC_HF_DEFECT: cfg.ENSEMBLE_WEIGHT_HF,
            SRC_ZERO_SHOT: cfg.ENSEMBLE_WEIGHT_ZERO_SHOT,
            SRC_YOLO:      cfg.ENSEMBLE_WEIGHT_YOLO,
        }
        detections = ensemble_detections(
            raw_batches=raw_batches,
            image_shape=(h, w),
            model_weights=model_weights,
            iou_threshold=cfg.ENSEMBLE_IOU_THRESHOLD,
            high_conf_threshold=cfg.ENSEMBLE_HIGH_CONF_THRESHOLD,
        )

        # Apply standard post-processing (confidence filter, min area, aspect-ratio heuristic)
        detections = postprocess(
            detections,
            conf_threshold_defect=cfg.CONFIDENCE_THRESHOLD_DEFECT,
            conf_threshold_asset=cfg.CONFIDENCE_THRESHOLD_ASSET,
            nms_iou_threshold=cfg.NMS_IOU_THRESHOLD,
        )

        # Apply detection_mode filter
        detections = _filter_by_mode(detections, detection_mode)

        # ---- Stage 2: road surface ROI mask (optional SegFormer) ----
        road_roi_mask = None
        if self._roi_segmenter is not None:
            road_roi_mask = self._roi_segmenter.get_road_mask(image)

        # ---- Stages 2 & 3: segmentation + measurement + SPM ----
        for det in detections:
            mask: Optional[np.ndarray] = None

            if det["category"] == "road_defect":
                if self._segmenter is not None:
                    mask, polygon = self._segmenter.segment(
                        image, det["bbox"], det["class_name"]
                    )
                    # Apply SegFormer ROI constraint
                    if road_roi_mask is not None and mask is not None:
                        mask = self._roi_segmenter.constrain_mask_to_road(mask, road_roi_mask)
                    det["mask_available"] = mask is not None
                    det["mask_polygon"]   = polygon
                else:
                    det["mask_available"] = False
                    det["mask_polygon"]   = None

                if cfg.ENABLE_MEASUREMENT:
                    metrics = measure_detection(
                        mask=mask,
                        bbox=det["bbox"],
                        class_name=det["class_name"],
                        confidence=det["confidence"],
                    )
                    det.update(metrics)

                # SPM + recommended action
                spm = map_finding(det["class_name"], det.get("severity"))
                det.update(spm)

                det["_mask"] = mask
            else:
                det["mask_available"] = False
                det["mask_polygon"]   = None

        # Draw annotations
        annotated = draw_annotations(
            image, detections,
            draw_masks=cfg.ENABLE_SEGMENTATION,
            use_class_colors=True,
        )

        # Strip internal mask arrays
        for det in detections:
            det.pop("_mask", None)

        ms = (time.perf_counter() - t0) * 1000
        logger.info(
            "Pipeline: %d detections in %.0f ms (models: %s)",
            len(detections), ms, ", ".join(self._model_info),
        )
        return detections, annotated, ms

    # ------------------------------------------------------------------
    # Simulation fallback
    # ------------------------------------------------------------------

    def simulate(self) -> tuple[list[dict], None, float]:
        import random
        detections = []
        if random.random() > 0.45:
            cls = random.choice(["pothole", "longitudinal_crack", "alligator_crack",
                                 "water_ponding", "raveling"])
            sev = random.choice(["low", "medium", "high"])
            spm = map_finding(cls, sev)
            det = {
                "class_name": cls, "category": "road_defect",
                "confidence": round(random.uniform(0.55, 0.90), 4),
                "bbox": {"x1": 160.0, "y1": 120.0, "x2": 400.0, "y2": 300.0},
                "mask_available": False, "mask_polygon": None,
                "severity": sev,
                "severity_reason": "Simulated detection",
                "crack_length_px": round(random.uniform(50, 300), 1),
                "crack_width_px_avg": round(random.uniform(4, 20), 2),
                "crack_width_px_max": round(random.uniform(10, 30), 2),
                "crack_area_px": round(random.uniform(1000, 20000), 1),
                "measurement_unit": "pixel_estimate_from_bbox",
                "depth_estimation_available": False,
                "depth_note": (
                    "Depth cannot be accurately estimated from a single RGB image "
                    "without camera calibration, stereo vision, LiDAR, or a depth sensor."
                ),
                "ensemble_sources": ["simulation"],
                "ensemble_vote_count": 1,
            }
            det.update(spm)
            detections.append(det)
        if random.random() > 0.55:
            cls = random.choice(["street_light", "guardrail", "traffic_sign"])
            detections.append({
                "class_name": cls, "category": "asset",
                "confidence": round(random.uniform(0.50, 0.88), 4),
                "bbox": {"x1": 40.0, "y1": 30.0, "x2": 140.0, "y2": 260.0},
                "mask_available": False, "mask_polygon": None, "severity": None,
                "ensemble_sources": ["simulation"],
                "ensemble_vote_count": 1,
            })
        return detections, None, 0.0

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _run_detectors(self, image: np.ndarray, fast_mode: bool) -> list[tuple[str, list[dict]]]:
        """
        Run all available detectors and return list of (source_id, detections) tuples.
        """
        batches: list[tuple[str, list[dict]]] = []

        if self._obb_defect:
            dets = self._obb_defect.detect(image, cfg.CONFIDENCE_THRESHOLD_DEFECT)
            batches.append((SRC_OBB, dets))
            logger.debug("OBB: %d raw detections", len(dets))

        if self._hf_defect:
            dets = self._hf_defect.detect(image, cfg.CONFIDENCE_THRESHOLD_DEFECT)
            batches.append((SRC_HF_DEFECT, dets))
            logger.debug("HF: %d raw detections", len(dets))

        if not fast_mode and self._zero_shot:
            dets = self._zero_shot.detect(image)
            batches.append((SRC_ZERO_SHOT, dets))
            logger.debug("ZeroShot: %d raw detections", len(dets))

        if self._yolo and self._yolo.available:
            dets = self._yolo.detect(image, cfg.CONFIDENCE_THRESHOLD_DEFECT)
            batches.append((SRC_YOLO, dets))
            logger.debug("YOLO: %d raw detections", len(dets))

        return batches


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _build_zero_shot_labels() -> list[str]:
    """Combine asset + extended damage labels for YOLO-World."""
    asset_labels = [l.strip() for l in cfg.ZERO_SHOT_ASSET_LABELS.split(",") if l.strip()]
    damage_labels = [l.strip() for l in cfg.ZERO_SHOT_DAMAGE_LABELS.split(",") if l.strip()]
    all_labels = asset_labels + [l for l in damage_labels if l not in asset_labels]
    return all_labels


def _apply_fp_mask(
    raw_batches: list[tuple[str, list[dict]]],
    keep_mask: list[bool],
) -> list[tuple[str, list[dict]]]:
    """Remove FP-suppressed damage detections from all batches."""
    # Build set of suppressed bbox tuples for fast lookup
    suppressed: set[tuple] = set()
    damage_idx = 0
    for _, dets in raw_batches:
        for det in dets:
            if det.get("category") == "road_defect":
                if not keep_mask[damage_idx]:
                    b = det["bbox"]
                    suppressed.add((round(b["x1"]), round(b["y1"]),
                                    round(b["x2"]), round(b["y2"])))
                damage_idx += 1

    filtered_batches = []
    for source, dets in raw_batches:
        filtered = []
        for det in dets:
            if det.get("category") == "road_defect":
                b = det["bbox"]
                key = (round(b["x1"]), round(b["y1"]),
                        round(b["x2"]), round(b["y2"]))
                if key in suppressed:
                    continue
            filtered.append(det)
        filtered_batches.append((source, filtered))
    return filtered_batches


def _filter_by_mode(detections: list[dict], mode: str) -> list[dict]:
    if mode == "defect_only":
        return [d for d in detections if d["category"] == "road_defect"]
    if mode == "asset_only":
        return [d for d in detections if d["category"] == "asset"]
    return detections


# ---------------------------------------------------------------------------
# Structured output builder
# ---------------------------------------------------------------------------

def build_structured_output(
    detections: list[dict],
    processing_time_ms: float,
    annotated_image_path: str = "",
    mask_image_path: str = "",
    json_path: str = "",
) -> dict:
    """
    Convert internal detection list into the canonical structured JSON format.
    Suitable for the /api/detect-road-damage endpoint and /api/v2/findings.
    """
    structured_dets = []
    for i, det in enumerate(detections):
        b = det["bbox"]
        entry = {
            "id":               f"det_{i+1:03d}",
            "class_code":       get_class_code(det["class_name"]),
            "class_name":       get_class_label(det["class_name"], lang="id"),
            "class_name_en":    get_class_label(det["class_name"], lang="en"),
            "confidence":       det["confidence"],
            "bbox_xyxy":        [round(b["x1"], 2), round(b["y1"], 2),
                                 round(b["x2"], 2), round(b["y2"], 2)],
            "category":         det.get("category", "unknown"),
            "mask_available":   det.get("mask_available", False),
            "mask_polygon":     det.get("mask_polygon"),
            "obb_polygon":      det.get("obb_polygon"),
            "ensemble_sources": det.get("ensemble_sources", []),
            "ensemble_vote_count": det.get("ensemble_vote_count", 1),
            # Measurements
            "crack_length_px":      det.get("crack_length_px"),
            "crack_width_px_avg":   det.get("crack_width_px_avg"),
            "crack_width_px_max":   det.get("crack_width_px_max"),
            "crack_area_px":        det.get("crack_area_px"),
            "equiv_diameter_px":    det.get("equiv_diameter_px"),
            "bbox_width_px":        det.get("bbox_width_px", round(b["x2"] - b["x1"], 1)),
            "bbox_height_px":       det.get("bbox_height_px", round(b["y2"] - b["y1"], 1)),
            # Severity
            "severity":             det.get("severity"),
            "severity_reason":      det.get("severity_reason"),
            "measurement_unit":     det.get("measurement_unit", "pixel_estimate"),
            "depth_estimation_available": det.get("depth_estimation_available", False),
            "depth_note":           det.get("depth_note"),
            # SPM / AMS
            "spm_indicator":        det.get("spm_indicator"),
            "spm_name":             det.get("spm_name"),
            "spm_category":         det.get("spm_category"),
            "spm_priority":         det.get("spm_priority"),
            "spm_fulfillment":      det.get("spm_fulfillment"),
            "recommended_action":   det.get("recommended_action"),
            "deterioration_flag":   det.get("deterioration_flag"),
        }
        structured_dets.append(entry)

    road_defects = [d for d in structured_dets if d["category"] == "road_defect"]
    dominant     = _dominant_damage_type(road_defects)
    overall_sev  = _overall_severity(road_defects)

    return {
        "detections": structured_dets,
        "summary": {
            "total_detections":     len(structured_dets),
            "road_defects_count":   len(road_defects),
            "assets_count":         len(structured_dets) - len(road_defects),
            "dominant_damage_type": dominant,
            "overall_severity":     overall_sev,
            "processing_time_ms":   round(processing_time_ms, 1),
            "model_pipeline":       "multi_model_ensemble_wbf_v2",
        },
        "output_files": {
            "annotated_image_path": annotated_image_path,
            "mask_image_path":      mask_image_path,
            "json_path":            json_path,
        },
    }


def _dominant_damage_type(road_defects: list[dict]) -> Optional[str]:
    if not road_defects:
        return None
    freq: dict[str, int] = {}
    for d in road_defects:
        freq[d["class_name"]] = freq.get(d["class_name"], 0) + 1
    return max(freq, key=lambda k: freq[k])


def _overall_severity(road_defects: list[dict]) -> Optional[str]:
    if not road_defects:
        return None
    rank = {"high": 3, "medium": 2, "low": 1}
    best = max(road_defects, key=lambda d: rank.get(d.get("severity") or "low", 0))
    return best.get("severity") or "low"
