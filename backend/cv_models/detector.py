"""
detector.py — Stage 1 model wrappers for road damage detection.

Detector strategies (loaded in priority order by the pipeline):
  1. OBBCrackDetector       — Local YOLO-OBB fine-tuned on Indonesian road dataset
  2. HFRoadDefectDetector   — HuggingFace YOLO12s trained on RDD2022
  3. ZeroShotAssetDetector  — YOLO-World for infrastructure assets + extended damage labels
  4. RTDETRFPFilter         — RT-DETR COCO validator for false-positive suppression
  5. YOLODetector           — Custom weights or COCO-pretrained YOLO11n fallback

All detectors return a list of raw dicts:
  {"class_name": str, "category": str, "confidence": float,
   "bbox": {"x1": f, "y1": f, "x2": f, "y2": f},
   "obb_polygon": [[x,y], ...] | None}

RTDETRFPFilter does NOT return detections — it returns a set of detection indices
to suppress (where a COCO vehicle/person overlaps significantly with a damage bbox).
"""
import logging
from pathlib import Path

import numpy as np

from cv_models.class_mapping import (
    COCO_VEHICLE_PERSON_CLASSES,
    ZERO_SHOT_LABEL_MAP,
    normalise_class,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# OBB Crack Detector — fine-tuned on Indonesian road dataset (Roboflow)
# ---------------------------------------------------------------------------

class OBBCrackDetector:
    """
    Loads a local YOLO-OBB model fine-tuned on the Indonesian crack dataset
    (Deteksi Kerusakan Jalan v14, Roboflow, CC BY 4.0).

    OBB (Oriented Bounding Box) detects crack orientation accurately —
    diagonal cracks get tight-fitting rotated boxes instead of bloated
    axis-aligned boxes that include background pavement.
    """

    _CLASS_MAP: dict[str, str] = {
        "alligator_cracking":    "alligator_crack",
        "lateral_cracking":      "transverse_crack",
        "longitudinal_cracking": "longitudinal_crack",
        "pothole":               "pothole",
    }

    def __init__(self, model_path: str):
        self._model = None
        self._path  = model_path
        self._load(model_path)

    def _load(self, path: str):
        if not Path(path).exists():
            logger.warning("OBB model tidak ditemukan: %s", path)
            return
        try:
            from ultralytics import YOLO
            self._model = YOLO(path, task="obb")
            logger.info("✅ OBB crack model loaded: %s — classes: %s",
                        path, list(self._model.names.values()))
        except Exception as exc:
            logger.warning("OBB model gagal load (%s): %s", path, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, image: np.ndarray, conf: float) -> list[dict]:
        results = self._model(image, conf=conf, verbose=False)
        out = []
        for res in results:
            if res.obb is None or len(res.obb) == 0:
                continue
            for i in range(len(res.obb)):
                raw_cls  = res.names[int(res.obb.cls[i])]
                cls_name = self._CLASS_MAP.get(raw_cls, raw_cls)
                conf_val = float(res.obb.conf[i])
                x1, y1, x2, y2 = res.obb.xyxy[i].tolist()
                try:
                    corners  = res.obb.xyxyxyxy[i].reshape(4, 2).tolist()
                    obb_poly = [[int(p[0]), int(p[1])] for p in corners]
                except Exception:
                    obb_poly = None

                out.append({
                    "class_name":  cls_name,
                    "category":    "road_defect",
                    "confidence":  round(conf_val, 4),
                    "bbox":        {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "raw_class":   raw_cls,
                    "obb_polygon": obb_poly,
                })
        return out


# ---------------------------------------------------------------------------
# HuggingFace Road Defect Detector (YOLO trained on RDD2022)
# ---------------------------------------------------------------------------

class HFRoadDefectDetector:
    """
    Downloads and runs a YOLO model from HuggingFace Hub.
    Default: rezzzq/yolo12s-road-damage-rdd2022
    Outputs D00/D10/D20/D40 mapped through the corrected RDD class map.
    """

    def __init__(self, model_id: str, filename: str, cache_dir: str = "", token: str = ""):
        self._model    = None
        self._model_id = model_id
        self._load(model_id, filename, cache_dir or None, token or None)

    def _load(self, model_id, filename, cache_dir, token):
        try:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO

            path = hf_hub_download(
                repo_id=model_id,
                filename=filename,
                cache_dir=cache_dir,
                token=token,
            )
            self._model = YOLO(path)
            logger.info("✅ HF defect model loaded: %s — classes: %s",
                        model_id, list(self._model.names.values()))
        except ImportError:
            logger.warning("huggingface_hub not installed — run: pip install huggingface_hub")
        except Exception as exc:
            logger.warning("HF defect model failed to load (%s): %s", model_id, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, image: np.ndarray, conf: float) -> list[dict]:
        results = self._model(image, conf=conf, verbose=False)
        out = []
        for res in results:
            for box in res.boxes:
                raw_cls  = res.names[int(box.cls[0])]
                cls_name, _ = normalise_class(raw_cls)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                out.append({
                    "class_name": cls_name,
                    "category":   "road_defect",
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "raw_class":  raw_cls,
                    "obb_polygon": None,
                })
        return out


# ---------------------------------------------------------------------------
# YOLO-World Zero-Shot Detector (assets + extended damage labels)
# ---------------------------------------------------------------------------

class ZeroShotAssetDetector:
    """
    Open-vocabulary detection using YOLO-World.
    Now includes extended road damage labels (raveling, water_ponding, rutting,
    shoulder_crack, shoulder_pothole) in addition to infrastructure assets.
    ~0.2 s/frame on MPS/GPU, ~0.5 s on CPU.
    """

    def __init__(self, model_id: str, labels: list[str], threshold: float):
        self._model     = None
        self._labels    = labels
        self._threshold = threshold
        self._load(model_id)

    def _load(self, model_id: str):
        try:
            from ultralytics import YOLOWorld
            self._model = YOLOWorld(model_id)
            self._model.set_classes(self._labels)
            logger.info("✅ YOLO-World detector loaded: %s — %d labels",
                        model_id, len(self._labels))
        except ImportError:
            logger.warning("ultralytics not installed — run: pip install ultralytics")
        except Exception as exc:
            logger.warning("YOLO-World failed to load (%s): %s", model_id, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, image: np.ndarray) -> list[dict]:
        results = self._model.predict(image, conf=self._threshold, verbose=False)
        out = []
        for res in results:
            for box in res.boxes:
                raw_cls  = res.names[int(box.cls[0])]
                mapping  = ZERO_SHOT_LABEL_MAP.get(raw_cls)
                if mapping:
                    cls_name, category = mapping
                else:
                    cls_name, category = normalise_class(raw_cls.replace(" ", "_"))
                if category == "unknown":
                    continue

                x1, y1, x2, y2 = box.xyxy[0].tolist()
                out.append({
                    "class_name": cls_name,
                    "category":   category,
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                    "raw_class":  raw_cls,
                    "obb_polygon": None,
                })
        return out


# ---------------------------------------------------------------------------
# RT-DETR False Positive Filter (COCO secondary validator)
# ---------------------------------------------------------------------------

class RTDETRFPFilter:
    """
    Uses RT-DETR (COCO pretrained) as a false-positive reducer.

    Heuristic: if a damage detection bbox overlaps significantly (IoU > threshold)
    with a COCO vehicle / person detection, it is likely a false positive caused by:
      - Tire marks on pavement misidentified as cracks
      - Vehicle shadows misidentified as dark spots / potholes
      - Road surface under parked vehicles

    This does NOT detect road damage — it only suppresses specific FPs.
    Model: rtdetr-l.pt (~60 MB, downloaded once via ultralytics)
    """

    def __init__(self, model_id: str = "rtdetr-l.pt", fp_iou_threshold: float = 0.35):
        self._model         = None
        self._fp_iou_thr    = fp_iou_threshold
        self._load(model_id)

    def _load(self, model_id: str):
        try:
            from ultralytics import RTDETR
            self._model = RTDETR(model_id)
            logger.info("✅ RT-DETR FP filter loaded: %s", model_id)
        except ImportError:
            logger.warning("ultralytics not installed — RT-DETR FP filter disabled")
        except Exception as exc:
            logger.warning("RT-DETR load failed (%s): %s", model_id, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def get_fp_mask(
        self,
        image: np.ndarray,
        damage_detections: list[dict],
        vehicle_conf: float = 0.40,
    ) -> list[bool]:
        """
        Returns a boolean list of the same length as damage_detections.
        True = keep, False = suppress (likely false positive).

        A detection is suppressed if a vehicle/person bbox from RT-DETR
        overlaps its damage bbox at IoU >= self._fp_iou_thr.
        """
        if not self.available or not damage_detections:
            return [True] * len(damage_detections)

        try:
            vehicle_boxes = self._detect_vehicles(image, vehicle_conf)
        except Exception as exc:
            logger.warning("RT-DETR inference failed: %s", exc)
            return [True] * len(damage_detections)

        if not vehicle_boxes:
            return [True] * len(damage_detections)

        keep_mask = []
        for det in damage_detections:
            db = det["bbox"]
            damage_box = (db["x1"], db["y1"], db["x2"], db["y2"])
            is_fp = False
            for vb in vehicle_boxes:
                if _iou_boxes(damage_box, vb) >= self._fp_iou_thr:
                    is_fp = True
                    logger.debug(
                        "Suppressed %s (vehicle overlap IoU=%.2f)",
                        det["class_name"], _iou_boxes(damage_box, vb),
                    )
                    break
            keep_mask.append(not is_fp)

        n_suppressed = keep_mask.count(False)
        if n_suppressed:
            logger.info("RT-DETR FP filter: suppressed %d/%d detections",
                        n_suppressed, len(damage_detections))

        return keep_mask

    def _detect_vehicles(self, image: np.ndarray, conf: float) -> list[tuple]:
        """Run RT-DETR and return bboxes of vehicle/person detections."""
        results = self._model(image, conf=conf, verbose=False)
        boxes = []
        for res in results:
            for box in res.boxes:
                cls_name = res.names[int(box.cls[0])]
                if cls_name in COCO_VEHICLE_PERSON_CLASSES:
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    boxes.append((x1, y1, x2, y2))
        return boxes


# ---------------------------------------------------------------------------
# Standard YOLO Detector (custom weights or pretrained fallback)
# ---------------------------------------------------------------------------

class YOLODetector:
    """
    Loads custom fine-tuned YOLO weights from local paths.
    Falls back to a COCO-pretrained YOLO11n when no custom weights are found.
    """

    def __init__(
        self,
        asset_path: str = "",
        defect_path: str = "",
        combined_path: str = "",
        pretrained_fallback: str = "yolo11n.pt",
    ):
        self._asset_model    = None
        self._defect_model   = None
        self._combined_model = None
        self._load(asset_path, defect_path, combined_path, pretrained_fallback)

    def _load(self, asset_path, defect_path, combined_path, fallback):
        try:
            from ultralytics import YOLO
        except ImportError:
            logger.error("ultralytics not installed — run: pip install ultralytics")
            return

        if asset_path and Path(asset_path).exists():
            self._asset_model = YOLO(asset_path)
            logger.info("Custom asset model loaded: %s", asset_path)

        if defect_path and Path(defect_path).exists():
            self._defect_model = YOLO(defect_path)
            logger.info("Custom defect model loaded: %s", defect_path)

        if not self._asset_model and not self._defect_model:
            if combined_path and Path(combined_path).exists():
                self._combined_model = YOLO(combined_path)
                logger.info("Combined model loaded: %s", combined_path)
            else:
                try:
                    self._combined_model = YOLO(fallback)
                    logger.warning(
                        "No custom model found — using pretrained %s (limited accuracy)", fallback
                    )
                except Exception as exc:
                    logger.error("YOLO fallback load failed: %s", exc)

    @property
    def available(self) -> bool:
        return any([self._asset_model, self._defect_model, self._combined_model])

    def detect(self, image: np.ndarray, conf: float) -> list[dict]:
        models = [m for m in [self._asset_model, self._defect_model, self._combined_model] if m]
        out = []
        for model in models:
            try:
                for res in model(image, conf=conf, verbose=False):
                    for box in res.boxes:
                        raw_cls  = res.names[int(box.cls[0])]
                        cls_name, category = normalise_class(raw_cls)
                        if category == "unknown":
                            continue
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        out.append({
                            "class_name": cls_name,
                            "category":   category,
                            "confidence": round(float(box.conf[0]), 4),
                            "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                            "raw_class":  raw_cls,
                            "obb_polygon": None,
                        })
            except Exception as exc:
                logger.error("YOLO inference error: %s", exc)
        return out


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _iou_boxes(b1: tuple, b2: tuple) -> float:
    ix1 = max(b1[0], b2[0])
    iy1 = max(b1[1], b2[1])
    ix2 = min(b1[2], b2[2])
    iy2 = min(b1[3], b2[3])
    if ix2 <= ix1 or iy2 <= iy1:
        return 0.0
    inter = (ix2 - ix1) * (iy2 - iy1)
    a1 = max(0, b1[2] - b1[0]) * max(0, b1[3] - b1[1])
    a2 = max(0, b2[2] - b2[0]) * max(0, b2[3] - b2[1])
    union = a1 + a2 - inter
    return inter / union if union > 0 else 0.0
