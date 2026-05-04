"""
Vision Service — multi-source YOLO + zero-shot inference for road inspection.

Model loading priority (first available wins):
  1. Custom fine-tuned weights (MODEL_ASSET_PATH / MODEL_DEFECT_PATH / MODEL_COMBINED_PATH)
  2. HuggingFace pre-trained road damage model  (USE_HF_DEFECT_MODEL=true)
  3. Grounding DINO zero-shot for assets         (USE_ZERO_SHOT_ASSETS=true)
  4. COCO pretrained YOLO11n fallback
  5. Simulation mode
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
    # barriers & guardrails
    "concrete_barrier", "guardrail", "barrier",
    # signs (all types)
    "traffic_sign", "direction_sign", "highway_sign", "overhead_sign", "warning_sign",
    # lighting & poles
    "street_light", "utility_pole",
    # screens & billboards
    "billboard", "videotron",
    # infrastructure
    "road_marking", "gantry", "cctv_pole", "delineator",
    # legacy aliases
    "sign", "streetlight", "lamp", "cctv", "camera",
    "toll_gantry", "street-light",
}

RDD_CLASS_MAP = {
    "D00":    "longitudinal_crack",
    "D01":    "transverse_crack",
    "D10":    "alligator_crack",
    "D11":    "pothole",
    "D20":    "pothole",
    "D40":    "longitudinal_crack",
    "D43":    "transverse_crack",
    "D44":    "pothole",
    "Repair": "patching",
    "repair": "patching",
}

COCO_ASSET_MAP = {
    "traffic light": ("traffic_sign", "asset"),
    "stop sign":     ("traffic_sign", "asset"),
}

# BGR colours for bounding-box drawing
BBOX_COLOR = {
    "road_defect": (0,  60, 220),   # orange-red
    "asset":       (0, 165, 255),   # orange
    "unknown":     (120, 120, 120),
}

SEVERITY_AREA = {
    "pothole":            {"low": 4_000,  "high": 18_000},
    "alligator_crack":    {"low": 6_000,  "high": 22_000},
    "longitudinal_crack": {"low": 2_500,  "high": 12_000},
    "transverse_crack":   {"low": 2_500,  "high": 10_000},
    "hairline_crack":     {"low": 1_500,  "high":  8_000},
    "_default":           {"low": 3_500,  "high": 14_000},
}

# ---------------------------------------------------------------------------
# Zero-shot label → canonical class
# ---------------------------------------------------------------------------
ZERO_SHOT_LABEL_MAP = {
    # Guardrails & barriers
    "guardrail":              ("guardrail",        "asset"),
    "concrete barrier":       ("concrete_barrier", "asset"),
    "jersey barrier":         ("concrete_barrier", "asset"),

    # Traffic signs (general)
    "traffic sign":           ("traffic_sign",     "asset"),
    "road sign":              ("traffic_sign",     "asset"),

    # Highway direction / overhead signs (green, blue, etc.)
    "direction sign":         ("direction_sign",   "asset"),
    "highway sign":           ("direction_sign",   "asset"),
    "overhead road sign":     ("direction_sign",   "asset"),
    "green road sign":        ("direction_sign",   "asset"),
    "blue road sign":         ("direction_sign",   "asset"),
    "overhead gantry":        ("gantry",           "asset"),
    "sign bridge":            ("gantry",           "asset"),
    "toll gantry":            ("gantry",           "asset"),

    # Street lighting (has a luminaire/lamp head)
    "street light":           ("street_light",     "asset"),
    "lamp post":              ("street_light",     "asset"),
    "light pole":             ("street_light",     "asset"),
    "street lamp":            ("street_light",     "asset"),

    # Utility / electricity poles (bare pole, no lamp, carries power/telecom wires)
    "utility pole":           ("utility_pole",     "asset"),
    "power pole":             ("utility_pole",     "asset"),
    "electricity pole":       ("utility_pole",     "asset"),
    "electric pole":          ("utility_pole",     "asset"),
    "telephone pole":         ("utility_pole",     "asset"),

    # Utility / power / electricity poles (bare pole, no lamp)
    "power line pole":        ("utility_pole",     "asset"),

    # Warning / hazard signs (yellow chevron, caution boards)
    "chevron board":          ("warning_sign",     "asset"),
    "road chevron":           ("warning_sign",     "asset"),
    "road marker board":      ("warning_sign",     "asset"),
    "warning sign":           ("warning_sign",     "asset"),
    "chevron sign":           ("warning_sign",     "asset"),
    "road warning sign":      ("warning_sign",     "asset"),
    "hazard sign":            ("warning_sign",     "asset"),
    "yellow sign":            ("warning_sign",     "asset"),

    # Billboards & digital screens
    "billboard":              ("billboard",        "asset"),
    "advertisement board":    ("billboard",        "asset"),
    "digital billboard":      ("videotron",        "asset"),
    "LED display":            ("videotron",        "asset"),
    "videotron":              ("videotron",        "asset"),
    "digital sign":           ("videotron",        "asset"),

    # Surveillance
    "cctv camera":            ("cctv_pole",        "asset"),
    "surveillance camera":    ("cctv_pole",        "asset"),

    # Road furniture
    "delineator":             ("delineator",       "asset"),
    "road marking":           ("road_marking",     "asset"),
    "road stud":              ("delineator",       "asset"),
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _normalise_class(raw: str) -> tuple[str, str]:
    """Return (canonical_class_name, category)."""
    if raw in RDD_CLASS_MAP:
        return RDD_CLASS_MAP[raw], "road_defect"

    n = raw.lower().replace("-", "_").replace(" ", "_")

    # Road defects
    if "pothole" in n:                          return "pothole",             "road_defect"
    if "alligator" in n:                        return "alligator_crack",     "road_defect"
    if "longitudinal" in n:                     return "longitudinal_crack",  "road_defect"
    if "transverse" in n:                       return "transverse_crack",    "road_defect"
    if "hairline" in n:                         return "hairline_crack",      "road_defect"
    if "patching" in n or "patch" in n:         return "patching",            "road_defect"
    if "rutting" in n or "rut" in n:            return "rutting",             "road_defect"
    if "depression" in n:                       return "surface_depression",  "road_defect"
    if "crack" in n:                            return "longitudinal_crack",  "road_defect"

    # Signs — specific types first
    if "highway_sign" in n or "overhead_sign" in n or "overhead_road" in n:
        return "direction_sign", "asset"
    if "direction_sign" in n or "direction" in n:
        return "direction_sign", "asset"
    if "highway" in n and "sign" in n:
        return "direction_sign", "asset"
    if "green_road" in n or "blue_road" in n:
        return "direction_sign", "asset"

    # Generic signs
    if "traffic_sign" in n or "road_sign" in n: return "traffic_sign",    "asset"
    if "sign_bridge" in n:                       return "gantry",          "asset"

    # Lighting — must have lamp/light/luminaire in the name
    if "street_light" in n or "streetlight" in n or n == "lamp":
        return "street_light", "asset"
    if "lamp_post" in n or "light_pole" in n or "street_lamp" in n:
        return "street_light", "asset"

    # Utility / power / electricity poles (bare pole, no lamp)
    if "utility_pole" in n or "power_pole" in n or "power_line_pole" in n:
        return "utility_pole", "asset"
    if "electricity_pole" in n or "electric_pole" in n or "telephone_pole" in n:
        return "utility_pole", "asset"

    # Warning / caution signs (yellow chevron, hazard boards)
    if "warning_sign" in n or "warning" in n or "chevron" in n or "hazard_sign" in n:
        return "warning_sign", "asset"

    # Barriers
    if "guardrail" in n:                return "guardrail",        "asset"
    if "barrier" in n or "jersey" in n: return "concrete_barrier", "asset"

    # Screens / billboards
    if "billboard" in n or "advertisement" in n: return "billboard",  "asset"
    if "videotron" in n or "led_display" in n or "digital_billboard" in n or "digital_sign" in n:
        return "videotron", "asset"

    # Other infrastructure
    if "cctv" in n or "camera" in n or "surveillance" in n: return "cctv_pole",    "asset"
    if "gantry" in n or "toll_gantry" in n:                 return "gantry",       "asset"
    if "delineator" in n or "road_stud" in n:               return "delineator",   "asset"
    if "marking" in n:                                       return "road_marking", "asset"
    if "sign" in n:                                          return "traffic_sign", "asset"

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
# HuggingFace Road Defect Detector
# ---------------------------------------------------------------------------

class HFRoadDefectDetector:
    def __init__(self):
        self._model = None
        self._load()

    def _load(self):
        try:
            from huggingface_hub import hf_hub_download
            from ultralytics import YOLO
            model_path = hf_hub_download(
                repo_id=cfg.HF_DEFECT_MODEL_ID,
                filename=cfg.HF_DEFECT_FILENAME,
                cache_dir=cfg.HF_CACHE_DIR or None,
                token=cfg.HF_TOKEN or None,
            )
            self._model = YOLO(model_path)
            logger.info("✅ HF road defect model: %s  classes=%s",
                        cfg.HF_DEFECT_MODEL_ID, list(self._model.names.values()))
        except ImportError:
            logger.warning("huggingface_hub not installed — run: pip install huggingface_hub")
        except Exception as exc:
            logger.warning("Failed to load HF defect model (%s): %s", cfg.HF_DEFECT_MODEL_ID, exc)

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
# YOLO-World Zero-Shot Asset Detector (~0.2s/frame on MPS/GPU, ~0.5s CPU)
# Open-vocabulary detection — no training needed, just set text classes.
# ---------------------------------------------------------------------------

class ZeroShotAssetDetector:
    def __init__(self):
        self._model = None
        self._labels = [
            lbl.strip() for lbl in cfg.ZERO_SHOT_ASSET_LABELS.split(",") if lbl.strip()
        ]
        self._load()

    def _load(self):
        try:
            from ultralytics import YOLOWorld
            self._model = YOLOWorld(cfg.ZERO_SHOT_MODEL_ID)
            self._model.set_classes(self._labels)
            logger.info("✅ YOLO-World asset detector: %s  classes=%s",
                        cfg.ZERO_SHOT_MODEL_ID, self._labels)
        except ImportError:
            logger.warning("ultralytics not installed — run: pip install ultralytics")
        except Exception as exc:
            logger.warning("Failed to load YOLO-World model (%s): %s", cfg.ZERO_SHOT_MODEL_ID, exc)

    @property
    def available(self) -> bool:
        return self._model is not None

    def detect(self, image: np.ndarray) -> list:
        results = self._model.predict(image, conf=cfg.ZERO_SHOT_THRESHOLD, verbose=False)
        detections = []
        for res in results:
            for box in res.boxes:
                raw_cls = res.names[int(box.cls[0])]
                cls_name, category = ZERO_SHOT_LABEL_MAP.get(
                    raw_cls, (_normalise_class(raw_cls.replace(" ", "_"))[0], "asset")
                )
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "class_name": cls_name,
                    "category":   category,
                    "confidence": round(float(box.conf[0]), 4),
                    "bbox": {"x1": x1, "y1": y1, "x2": x2, "y2": y2},
                })
        return detections


# ---------------------------------------------------------------------------
# Standard YOLO Detector (custom weights or COCO pretrained fallback)
# ---------------------------------------------------------------------------

class YOLODetector:
    def __init__(self):
        self._asset_model    = None
        self._defect_model   = None
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
        models = [m for m in [self._asset_model, self._defect_model, self._combined_model] if m]
        detections = []
        for model in models:
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
# Main VisionService
# ---------------------------------------------------------------------------

class VisionService:
    def __init__(self):
        self._hf_defect       = None
        self._zero_shot       = None
        self._yolo            = None
        self._simulation_mode = False
        self._model_info: list[str] = []
        self._load_all()

    def _load_all(self):
        if cfg.USE_HF_DEFECT_MODEL:
            logger.info("Loading HF road defect model: %s", cfg.HF_DEFECT_MODEL_ID)
            self._hf_defect = HFRoadDefectDetector()
            if self._hf_defect.available:
                self._model_info.append(f"HF defect: {cfg.HF_DEFECT_MODEL_ID}")

        if cfg.USE_ZERO_SHOT_ASSETS:
            logger.info("Loading zero-shot asset detector: %s", cfg.ZERO_SHOT_MODEL_ID)
            self._zero_shot = ZeroShotAssetDetector()
            if self._zero_shot.available:
                self._model_info.append(f"ZeroShot assets: {cfg.ZERO_SHOT_MODEL_ID}")

        self._yolo = YOLODetector()
        if self._yolo.available:
            self._model_info.append("YOLO detector")

        if not any([
            self._hf_defect  and self._hf_defect.available,
            self._zero_shot  and self._zero_shot.available,
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
        fast_mode: bool = False,
    ) -> dict:
        """
        Run inference on raw image bytes.

        fast_mode=True  — skips the zero-shot detector (used for realtime camera
                          where speed matters more than exhaustive asset coverage).
        save_files=True — saves annotated + original images to disk and returns URLs.
                          Base64 annotated image is always returned when detections exist.
        """
        if self._simulation_mode:
            return self._simulate(session_id, latitude, longitude, location_status,
                                  frame_index, video_timestamp_second)

        arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if image is None:
            return {"error": "Could not decode image bytes"}

        h, w = image.shape[:2]
        if w > cfg.INFERENCE_IMAGE_MAX_WIDTH:
            scale = cfg.INFERENCE_IMAGE_MAX_WIDTH / w
            image = cv2.resize(image, (cfg.INFERENCE_IMAGE_MAX_WIDTH, int(h * scale)))

        raw_detections = self._run_all_detectors(image, fast_mode=fast_mode)
        detections = self._postprocess(raw_detections)

        # Always generate annotated image in memory (for base64 return)
        ann_b64 = None
        ann_url  = None
        orig_url = None

        if detections:
            annotated = _draw_annotations(image, detections)
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

        return {
            "detections":               detections,
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
            "fast_mode":                fast_mode,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _run_all_detectors(self, image: np.ndarray, fast_mode: bool = False) -> list:
        results = []

        # 1. HF road damage model → defects
        if self._hf_defect and self._hf_defect.available:
            results.extend(self._hf_defect.detect(image, cfg.CONFIDENCE_THRESHOLD_DEFECT))

        # 2. Zero-shot → assets (skipped in fast_mode)
        if not fast_mode and self._zero_shot and self._zero_shot.available:
            results.extend(self._zero_shot.detect(image))

        # 3. YOLO — fill gaps not covered by dedicated models
        if self._yolo.available:
            hf_covered   = bool(self._hf_defect and self._hf_defect.available)
            zs_covered   = bool(not fast_mode and self._zero_shot and self._zero_shot.available)
            yolo_raw = self._yolo.detect(
                image, min(cfg.CONFIDENCE_THRESHOLD_ASSET, cfg.CONFIDENCE_THRESHOLD_DEFECT)
            )
            for det in yolo_raw:
                if det["category"] == "road_defect" and hf_covered:
                    continue
                if det["category"] == "asset" and zs_covered:
                    continue
                results.append(det)

        return results

    def _postprocess(self, raw: list) -> list:
        out = []
        seen: set[tuple] = set()

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

            bbox = det["bbox"]

            # Aspect-ratio heuristic: street lamps have a lamp-arm that widens
            # the top of the bounding box (h/w ratio typically < 5).
            # Utility poles are bare, very narrow columns (h/w ratio > 5).
            # This catches YOLO-World misclassifying a bare pole as "street lamp".
            if cls == "street_light":
                bw = max(1, bbox["x2"] - bbox["x1"])
                bh = max(1, bbox["y2"] - bbox["y1"])
                if bh / bw > 5.0:
                    cls = "utility_pole"
                    det = {**det, "class_name": "utility_pole"}

            # Deduplicate by class + approximate bbox position
            cx = round((bbox["x1"] + bbox["x2"]) / 2 / 32)
            cy = round((bbox["y1"] + bbox["y2"]) / 2 / 32)
            key = (cls, cx, cy)
            if key in seen:
                continue
            seen.add(key)

            severity = _compute_severity(cls, bbox, conf) if cat == "road_defect" else None

            out.append({
                "class_name":   cls,
                "category":     cat,
                "confidence":   round(conf, 4),
                "bbox":         {k: round(v, 2) for k, v in bbox.items()},
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
            cls = random.choice(["street_light", "guardrail", "traffic_sign",
                                  "direction_sign", "billboard"])
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
