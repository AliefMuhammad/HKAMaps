"""
Vision Service — multi-source YOLO inference for road inspection.

Model loading priority (first available wins):
  1. Custom fine-tuned weights (MODEL_ASSET_PATH / MODEL_DEFECT_PATH / MODEL_COMBINED_PATH)
  2. HuggingFace pre-trained road damage model  (USE_HF_DEFECT_MODEL=true)  ← recommended for MVP
  3. Grounding DINO zero-shot for assets         (USE_ZERO_SHOT_ASSETS=true) ← recommended for MVP
  4. COCO pretrained YOLO11n fallback            (auto-download)
  5. Simulation mode                             (if ultralytics not installed)

No manual labeling needed for options 2 & 3.
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

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Class taxonomy
# ---------------------------------------------------------------------------

ROAD_DEFECT_CLASSES = {
    "pothole", "longitudinal_crack", "transverse_crack", "alligator_crack",
    "hairline_crack", "patching", "rutting", "surface_depression",
    "crack", "longitudinal-crack", "transverse-crack", "alligator-crack",
    "D00", "D01", "D10", "D11", "D20", "D40", "D43", "D44",
}

ASSET_CLASSES = {
    "concrete_barrier", "guardrail", "traffic_sign", "direction_sign",
    "street_light", "road_marking", "gantry", "cctv_pole", "delineator",
    "barrier", "sign", "streetlight", "lamp", "cctv", "camera",
    "toll_gantry", "street-light",
}

# RDD2022 class codes → canonical internal name
# rezzzq/yolo12s-road-damage-rdd2022 classes: D00, D10, D20, D40, Repair
RDD_CLASS_MAP = {
    "D00":    "longitudinal_crack",   # Retak Memanjang
    "D01":    "transverse_crack",     # Retak Melintang
    "D10":    "alligator_crack",      # Retak Buaya
    "D11":    "pothole",
    "D20":    "pothole",              # Lubang
    "D40":    "longitudinal_crack",   # Retak Memanjang (blok)
    "D43":    "transverse_crack",
    "D44":    "pothole",
    "Repair": "patching",             # Tambalan (kelas baru dari model rezzzq)
    "repair": "patching",
}

# COCO classes that map to toll road assets (partial coverage without custom model)
COCO_ASSET_MAP = {
    "traffic light": ("traffic_sign", "asset"),
    "stop sign":     ("traffic_sign", "asset"),
}

# BGR colours for bounding box drawing
BBOX_COLOR = {
    "road_defect": (0, 60, 220),
    "asset":       (0, 165, 255),
    "unknown":     (120, 120, 120),
}

# Severity scoring thresholds (pixel area at ~640px wide frame)
SEVERITY_AREA = {
    "pothole":            {"low": 4_000,  "high": 18_000},
    "alligator_crack":    {"low": 6_000,  "high": 22_000},
    "longitudinal_crack": {"low": 2_500,  "high": 12_000},
    "transverse_crack":   {"low": 2_500,  "high": 10_000},
    "hairline_crack":     {"low": 1_500,  "high":  8_000},
    "_default":           {"low": 3_500,  "high": 14_000},
}

# Zero-shot label text → canonical class name + category
ZERO_SHOT_LABEL_MAP = {
    "guardrail":       ("guardrail",        "asset"),
    "concrete barrier":("concrete_barrier", "asset"),
    "traffic sign":    ("traffic_sign",     "asset"),
    "direction sign":  ("direction_sign",   "asset"),
    "street light":    ("street_light",     "asset"),
    "toll gantry":     ("gantry",           "asset"),
    "cctv camera":     ("cctv_pole",        "asset"),
    "delineator":      ("delineator",       "asset"),
    "road marking":    ("road_marking",     "asset"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise_class(raw: str) -> tuple[str, str]:
    """Return (canonical_class_name, category)."""
    # RDD2022 codes
    if raw in RDD_CLASS_MAP:
        return RDD_CLASS_MAP[raw], "road_defect"

    n = raw.lower().replace("-", "_").replace(" ", "_")

    # Road defects
    if "pothole" in n:                       return "pothole", "road_defect"
    if "alligator" in n:                     return "alligator_crack", "road_defect"
    if "longitudinal" in n:                  return "longitudinal_crack", "road_defect"
    if "transverse" in n:                    return "transverse_crack", "road_defect"
    if "hairline" in n:                      return "hairline_crack", "road_defect"
    if "patching" in n or "patch" in n:      return "patching", "road_defect"
    if "rutting" in n or "rut" in n:         return "rutting", "road_defect"
    if "depression" in n:                    return "surface_depression", "road_defect"
    if "crack" in n:                         return "longitudinal_crack", "road_defect"

    # Assets
    if "street_light" in n or "streetlight" in n or n == "lamp":
        return "street_light", "asset"
    if "guardrail" in n:  return "guardrail", "asset"
    if "barrier" in n:    return "concrete_barrier", "asset"
    if "sign" in n:       return "traffic_sign", "asset"
    if "cctv" in n or "camera" in n:  return "cctv_pole", "asset"
    if "gantry" in n:     return "gantry", "asset"
    if "delineator" in n: return "delineator", "asset"
    if "marking" in n:    return "road_marking", "asset"

    # COCO partial map
    if raw in COCO_ASSET_MAP:
        cls, cat = COCO_ASSET_MAP[raw]
        return cls, cat

    return raw, "unknown"


def _compute_severity(class_name: str, bbox: dict, confidence: float) -> str:
    area = max(0, bbox["x2"] - bbox["x1"]) * max(0, bbox["y2"] - bbox["y1"])
    t = SEVERITY_AREA.get(class_name, SEVERITY_AREA["_default"])
    if area >= t["high"] or (confidence > 0.85 and area >= t["low"]):
        return "high"
    if area >= t["low"]:
        return "medium"
    return "low"


def _draw_annotations(image: np.ndarray, detections: list) -> np.ndarray:
    out = image.copy()
    for det in detections:
        color = BBOX_COLOR.get(det.get("category", "unknown"), BBOX_COLOR["unknown"])
        x1, y1 = int(det["bbox"]["x1"]), int(det["bbox"]["y1"])
        x2, y2 = int(det["bbox"]["x2"]), int(det["bbox"]["y2"])
        cv2.rectangle(out, (x1, y1), (x2, y2), color, 2)
        sev = f" [{det['severity']}]" if det.get("severity") else ""
        label = f"{det['class_name']} {det['confidence']:.2f}{sev}"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        cv2.rectangle(out, (x1, max(0, y1 - th - 8)), (x1 + tw + 6, y1), color, -1)
        cv2.putText(out, label, (x1 + 3, max(th + 2, y1 - 4)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
    return out


# ---------------------------------------------------------------------------
# HuggingFace Road Damage Detector
# Trained on RDD2022: Japan, India, Norway, Czech, China road images
# Classes: D00 (longitudinal crack), D10 (alligator), D20 (pothole), D40 (crack)
# ---------------------------------------------------------------------------

class HFRoadDefectDetector:
    """Downloads and runs keremberke/yolov8n-road-damage-detection from HF Hub."""

    def __init__(self):
        self._model = None
        self._load()

    def _load(self):
        try:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO

            cache_dir = cfg.HF_CACHE_DIR or None
            token     = cfg.HF_TOKEN or None    # None = anonymous (works for public repos)

            model_path = hf_hub_download(
                repo_id=cfg.HF_DEFECT_MODEL_ID,
                filename=cfg.HF_DEFECT_FILENAME,
                cache_dir=cache_dir,
                token=token,
            )
            self._model = YOLO(model_path)
            logger.info("✅ HF road defect model loaded: %s  classes=%s",
                        cfg.HF_DEFECT_MODEL_ID, list(self._model.names.values()))
        except ImportError:
            logger.warning("huggingface_hub not installed — run: pip install huggingface_hub")
        except Exception as exc:
            logger.warning("Failed to load HF defect model (%s): %s — will use YOLO fallback",
                           cfg.HF_DEFECT_MODEL_ID, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, image: np.ndarray, conf: float) -> list:
        results = self._model(image, conf=conf, verbose=False)
        detections = []
        for res in results:
            for box in res.boxes:
                raw_cls = res.names[int(box.cls[0])]
                cls_name, _ = _normalise_class(raw_cls)
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "class_name": cls_name,
                    "category":   "road_defect",
                    "confidence": float(box.conf[0]),
                    "bbox":       {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                })
        return detections


# ---------------------------------------------------------------------------
# Grounding DINO Zero-Shot Asset Detector
# No training needed — detects objects by text description
# ---------------------------------------------------------------------------

class ZeroShotAssetDetector:
    """
    Uses Grounding DINO to detect toll road assets via text prompts.
    Slower than YOLO (~1-2s/frame CPU) but requires zero labeling.
    Recommended for video inspection mode (not realtime camera).
    """

    def __init__(self):
        self._pipe = None
        self._labels = [
            lbl.strip() for lbl in cfg.ZERO_SHOT_ASSET_LABELS.split(",") if lbl.strip()
        ]
        self._load()

    def _load(self):
        try:
            from transformers import pipeline as hf_pipeline
            import torch

            device = 0 if (torch.cuda.is_available() or
                           getattr(torch.backends, "mps", None) and torch.backends.mps.is_available()
                           ) else -1

            self._pipe = hf_pipeline(
                "zero-shot-object-detection",
                model=cfg.ZERO_SHOT_MODEL_ID,
                device=device,
            )
            logger.info("✅ Zero-shot asset detector loaded: %s (device=%s)",
                        cfg.ZERO_SHOT_MODEL_ID, "gpu" if device >= 0 else "cpu")
        except ImportError:
            logger.warning("transformers/torch not installed — skipping zero-shot assets. "
                           "Run: pip install transformers torch")
        except Exception as exc:
            logger.warning("Failed to load zero-shot model: %s", exc)

    @property
    def available(self) -> bool:
        return self._pipe is not None

    def detect(self, image: np.ndarray) -> list:
        from PIL import Image as PILImage

        pil_img = PILImage.fromarray(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        raw_results = self._pipe(pil_img, candidate_labels=self._labels)

        detections = []
        for det in raw_results:
            score = det["score"]
            if score < cfg.ZERO_SHOT_THRESHOLD:
                continue
            label = det["label"]
            cls_name, category = ZERO_SHOT_LABEL_MAP.get(label, (label.replace(" ", "_"), "asset"))
            box = det["box"]
            detections.append({
                "class_name": cls_name,
                "category":   category,
                "confidence": round(score, 4),
                "bbox": {
                    "x1": float(box["xmin"]), "y1": float(box["ymin"]),
                    "x2": float(box["xmax"]), "y2": float(box["ymax"]),
                },
            })
        return detections


# ---------------------------------------------------------------------------
# Standard YOLO Detector (custom weights OR COCO pretrained fallback)
# ---------------------------------------------------------------------------

class YOLODetector:
    def __init__(self):
        self._asset_model   = None
        self._defect_model  = None
        self._combined_model = None
        self._load()

    def _load(self):
        try:
            from ultralytics import YOLO
        except ImportError:
            logger.error("ultralytics not installed")
            return

        if cfg.MODEL_ASSET_PATH and Path(cfg.MODEL_ASSET_PATH).exists():
            self._asset_model = YOLO(cfg.MODEL_ASSET_PATH)
            logger.info("Custom asset model: %s", cfg.MODEL_ASSET_PATH)

        if cfg.MODEL_DEFECT_PATH and Path(cfg.MODEL_DEFECT_PATH).exists():
            self._defect_model = YOLO(cfg.MODEL_DEFECT_PATH)
            logger.info("Custom defect model: %s", cfg.MODEL_DEFECT_PATH)

        if not self._asset_model and not self._defect_model:
            combined = cfg.MODEL_COMBINED_PATH
            if combined and Path(combined).exists():
                self._combined_model = YOLO(combined)
                logger.info("Combined model: %s", combined)
            else:
                try:
                    self._combined_model = YOLO(cfg.YOLO_PRETRAINED_FALLBACK)
                    logger.warning("No custom model — using pretrained %s (limited accuracy)",
                                   cfg.YOLO_PRETRAINED_FALLBACK)
                except Exception as exc:
                    logger.error("YOLO load failed: %s", exc)

    @property
    def available(self) -> bool:
        return any([self._asset_model, self._defect_model, self._combined_model])

    def detect(self, image: np.ndarray, conf: float) -> list:
        pairs = []
        if self._asset_model:   pairs.append(self._asset_model)
        if self._defect_model:  pairs.append(self._defect_model)
        if self._combined_model: pairs.append(self._combined_model)

        detections = []
        for model in pairs:
            try:
                for res in model(image, conf=conf, verbose=False):
                    for box in res.boxes:
                        raw_cls = res.names[int(box.cls[0])]
                        cls_name, category = _normalise_class(raw_cls)
                        if category == "unknown":
                            continue
                        x1, y1, x2, y2 = box.xyxy[0].tolist()
                        detections.append({
                            "class_name": cls_name,
                            "category":   category,
                            "confidence": float(box.conf[0]),
                            "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                        })
            except Exception as exc:
                logger.error("YOLO inference error: %s", exc)
        return detections


# ---------------------------------------------------------------------------
# Main VisionService — orchestrates all detectors
# ---------------------------------------------------------------------------

class VisionService:
    def __init__(self):
        self._hf_defect    = None
        self._zero_shot    = None
        self._yolo         = None
        self._simulation_mode = False
        self._model_info: list[str] = []
        self._load_all()

    def _load_all(self):
        # --- HF road damage model for defects ---
        if cfg.USE_HF_DEFECT_MODEL:
            logger.info("Loading HuggingFace road defect model: %s", cfg.HF_DEFECT_MODEL_ID)
            self._hf_defect = HFRoadDefectDetector()
            if self._hf_defect.available:
                self._model_info.append(f"HF defect: {cfg.HF_DEFECT_MODEL_ID}")

        # --- Zero-shot for assets ---
        if cfg.USE_ZERO_SHOT_ASSETS:
            logger.info("Loading zero-shot asset detector: %s", cfg.ZERO_SHOT_MODEL_ID)
            self._zero_shot = ZeroShotAssetDetector()
            if self._zero_shot.available:
                self._model_info.append(f"ZeroShot assets: {cfg.ZERO_SHOT_MODEL_ID}")

        # --- YOLO (custom or COCO pretrained) ---
        self._yolo = YOLODetector()
        if self._yolo.available:
            self._model_info.append("YOLO detector loaded")

        # --- Check if anything loaded ---
        if not any([
            self._hf_defect and self._hf_defect.available,
            self._zero_shot and self._zero_shot.available,
            self._yolo.available,
        ]):
            logger.error("No model loaded — using simulation mode.")
            self._simulation_mode = True

        if self._model_info:
            logger.info("Active models: %s", " | ".join(self._model_info))

    # ------------------------------------------------------------------
    # Public inference API
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
    ) -> dict:
        if self._simulation_mode:
            return self._simulate(session_id, latitude, longitude, location_status,
                                  frame_index, video_timestamp_second)

        # Decode image
        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            return {"error": "Could not decode image bytes"}

        # Resize if needed
        h, w = image.shape[:2]
        if w > cfg.INFERENCE_IMAGE_MAX_WIDTH:
            scale = cfg.INFERENCE_IMAGE_MAX_WIDTH / w
            image = cv2.resize(image, (cfg.INFERENCE_IMAGE_MAX_WIDTH, int(h * scale)))

        # Collect raw detections from all available detectors
        raw_detections = self._run_all_detectors(image)

        # Filter by threshold + assign severity
        detections = self._postprocess(raw_detections)

        # Save files
        orig_url, ann_url, ann_b64 = None, None, None
        if save_files:
            ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")[:20]
            orig_name = f"inspection_{session_id[:8]}_{ts}_{frame_index:06d}.jpg"
            ann_name  = f"inspection_{session_id[:8]}_{ts}_{frame_index:06d}_annotated.jpg"

            cv2.imwrite(str(cfg.STORAGE_DIR / orig_name), image)
            annotated = _draw_annotations(image, detections)
            cv2.imwrite(str(cfg.STORAGE_DIR / ann_name), annotated,
                        [cv2.IMWRITE_JPEG_QUALITY, 88])
            orig_url = f"/storage/{orig_name}"
            ann_url  = f"/storage/{ann_name}"
            _, buf = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 82])
            ann_b64 = base64.b64encode(buf).decode("utf-8")

        return {
            "detections": detections,
            "original_image_url":       orig_url,
            "annotated_image_url":      ann_url,
            "annotated_image_base64":   ann_b64,
            "latitude":                 latitude,
            "longitude":                longitude,
            "location_status":          location_status,
            "timestamp":                datetime.now(timezone.utc).isoformat(),
            "inspection_session_id":    session_id,
            "frame_index":              frame_index,
            "video_timestamp_second":   video_timestamp_second,
            "model_info":               self._model_info,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _run_all_detectors(self, image: np.ndarray) -> list:
        results = []

        # 1. HF road damage model → road defects
        if self._hf_defect and self._hf_defect.available:
            results.extend(self._hf_defect.detect(image, cfg.CONFIDENCE_THRESHOLD_DEFECT))

        # 2. Zero-shot → assets
        if self._zero_shot and self._zero_shot.available:
            results.extend(self._zero_shot.detect(image))

        # 3. YOLO (only if HF model or zero-shot didn't cover a category)
        if self._yolo.available:
            hf_covered_defects  = bool(self._hf_defect   and self._hf_defect.available)
            zs_covered_assets   = bool(self._zero_shot   and self._zero_shot.available)

            yolo_raw = self._yolo.detect(image, min(cfg.CONFIDENCE_THRESHOLD_ASSET,
                                                    cfg.CONFIDENCE_THRESHOLD_DEFECT))
            for det in yolo_raw:
                # Avoid double-counting if a dedicated model already covered this category
                if det["category"] == "road_defect" and hf_covered_defects:
                    continue
                if det["category"] == "asset" and zs_covered_assets:
                    continue
                results.append(det)

        return results

    def _postprocess(self, raw: list) -> list:
        out = []
        for det in raw:
            conf = det["confidence"]
            cat  = det["category"]
            cls  = det["class_name"]

            if cat == "road_defect" and conf < cfg.CONFIDENCE_THRESHOLD_DEFECT:
                continue
            if cat == "asset" and conf < cfg.CONFIDENCE_THRESHOLD_ASSET:
                continue
            if cat == "unknown":
                continue

            severity = _compute_severity(cls, det["bbox"], conf) if cat == "road_defect" else None

            out.append({
                "class_name":   cls,
                "category":     cat,
                "confidence":   round(conf, 4),
                "bbox":         {k: round(v, 2) for k, v in det["bbox"].items()},
                "mask_polygon": None,
                "severity":     severity,
            })
        return out

    # ------------------------------------------------------------------
    # Simulation fallback
    # ------------------------------------------------------------------

    def _simulate(self, session_id, lat, lng, loc_status, frame_index, vid_ts) -> dict:
        import random
        detections = []
        if random.random() > 0.45:
            cls = random.choice(["pothole", "longitudinal_crack", "alligator_crack"])
            detections.append({
                "class_name": cls, "category": "road_defect",
                "confidence": round(random.uniform(0.55, 0.90), 4),
                "bbox": {"x1": 160.0, "y1": 120.0, "x2": 400.0, "y2": 300.0},
                "mask_polygon": None,
                "severity": random.choice(["low", "medium", "high"]),
            })
        if random.random() > 0.55:
            cls = random.choice(["street_light", "guardrail", "traffic_sign"])
            detections.append({
                "class_name": cls, "category": "asset",
                "confidence": round(random.uniform(0.50, 0.88), 4),
                "bbox": {"x1": 40.0, "y1": 30.0, "x2": 140.0, "y2": 260.0},
                "mask_polygon": None, "severity": None,
            })
        return {
            "detections": detections,
            "original_image_url": None, "annotated_image_url": None,
            "annotated_image_base64": None,
            "latitude": lat, "longitude": lng,
            "location_status": loc_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "inspection_session_id": session_id,
            "frame_index": frame_index,
            "video_timestamp_second": vid_ts,
            "simulation_mode": True,
            "model_info": ["SIMULATION MODE"],
        }

    @property
    def is_simulation_mode(self) -> bool:
        return self._simulation_mode

    @property
    def model_info(self) -> list[str]:
        return self._model_info
