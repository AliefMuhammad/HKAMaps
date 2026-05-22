import os
from pathlib import Path

BASE_DIR = Path(__file__).parent

# ---------- OBB Crack Detector (fine-tuned on Indonesian dataset) ----------
_OBB_CANDIDATES = [
    "crack_obb_indonesia.pt",
    "best.pt",
    str(BASE_DIR / "models" / "crack_obb_indonesia.pt"),
    str(BASE_DIR / "models" / "best.pt"),
]
MODEL_OBB_PATH = os.getenv(
    "MODEL_OBB_PATH",
    next((p for p in _OBB_CANDIDATES if Path(p).exists()), ""),
)

# ---------- Custom fine-tuned model weights ----------
MODEL_ASSET_PATH    = os.getenv("MODEL_ASSET_PATH",    "")
MODEL_DEFECT_PATH   = os.getenv("MODEL_DEFECT_PATH",   "")
MODEL_COMBINED_PATH = os.getenv("MODEL_COMBINED_PATH",
                                str(BASE_DIR / "models" / "combined_detector.pt"))
YOLO_PRETRAINED_FALLBACK = os.getenv("YOLO_PRETRAINED_FALLBACK", "yolo11n.pt")

# ---------- HuggingFace road defect model ----------
# License: Apache-2.0 (rezzzq/yolo12s-road-damage-rdd2022)
# YOLO12s trained on RDD2022: D00/D10/D20/D40
USE_HF_DEFECT_MODEL = os.getenv("USE_HF_DEFECT_MODEL", "true").lower() == "true"
HF_DEFECT_MODEL_ID  = os.getenv("HF_DEFECT_MODEL_ID",  "rezzzq/yolo12s-road-damage-rdd2022")
HF_DEFECT_FILENAME  = os.getenv("HF_DEFECT_FILENAME",  "yolo12s_RDD2022_best.pt")
HF_TOKEN            = os.getenv("HF_TOKEN",            "")
HF_CACHE_DIR        = os.getenv("HF_CACHE_DIR",        "")

# ---------- YOLO-World zero-shot detector ----------
# License: AGPL-3.0 (ultralytics YOLOWorld)
USE_ZERO_SHOT_ASSETS = os.getenv("USE_ZERO_SHOT_ASSETS", "true").lower() == "true"
ZERO_SHOT_MODEL_ID   = os.getenv("ZERO_SHOT_MODEL_ID",   "yolov8l-worldv2.pt")
ZERO_SHOT_THRESHOLD  = float(os.getenv("ZERO_SHOT_THRESHOLD", "0.22"))
ZERO_SHOT_EVERY_N_FRAMES = int(os.getenv("ZERO_SHOT_EVERY_N_FRAMES", "1"))

ZERO_SHOT_ASSET_LABELS = os.getenv(
    "ZERO_SHOT_ASSET_LABELS",
    (
        "street lamp,power line pole,highway sign,traffic sign,"
        "chevron board,warning sign,billboard,digital billboard,"
        "guardrail,concrete barrier,cctv camera,toll gantry,"
        "delineator,road marking"
    ),
)

# Extended damage labels for YOLO-World zero-shot detection
ZERO_SHOT_DAMAGE_LABELS = os.getenv(
    "ZERO_SHOT_DAMAGE_LABELS",
    (
        "surface raveling,pavement raveling,road surface deterioration,"
        "water ponding on road,standing water on road,"
        "road surface rutting,wheel track depression,"
        "asphalt patch,road repair patch,"
        "road shoulder crack,shoulder crack,"
        "shoulder pothole,road edge pothole"
    ),
)

# ---------- RT-DETR False Positive Filter ----------
# License: Apache-2.0 (ultralytics RT-DETR)
# Uses COCO-pretrained RT-DETR to suppress FPs where vehicle/person overlaps damage bbox
USE_RTDETR_FP_FILTER    = os.getenv("USE_RTDETR_FP_FILTER",    "true").lower() == "true"
RTDETR_MODEL_ID         = os.getenv("RTDETR_MODEL_ID",         "rtdetr-l.pt")
RTDETR_FP_IOU_THRESHOLD = float(os.getenv("RTDETR_FP_IOU_THRESHOLD", "0.35"))

# ---------- SegFormer ROI segmenter (optional, heavy) ----------
# License: CC-BY-NC-4.0 (nvidia/segformer-b2-finetuned-ade-512-512)
# Disabled by default — requires: pip install transformers torch
ENABLE_DEEP_SEGMENTER = os.getenv("ENABLE_DEEP_SEGMENTER", "false").lower() == "true"
SEGFORMER_MODEL_ID    = os.getenv("SEGFORMER_MODEL_ID",
                                  "nvidia/segformer-b2-finetuned-ade-512-512")

# ---------- Ensemble fusion parameters ----------
ENSEMBLE_IOU_THRESHOLD     = float(os.getenv("ENSEMBLE_IOU_THRESHOLD",     "0.45"))
ENSEMBLE_HIGH_CONF_THRESHOLD = float(os.getenv("ENSEMBLE_HIGH_CONF_THRESHOLD", "0.65"))

# Per-model reliability weights for WBF
ENSEMBLE_WEIGHT_OBB       = float(os.getenv("ENSEMBLE_WEIGHT_OBB",       "1.20"))
ENSEMBLE_WEIGHT_HF        = float(os.getenv("ENSEMBLE_WEIGHT_HF",        "1.00"))
ENSEMBLE_WEIGHT_ZERO_SHOT = float(os.getenv("ENSEMBLE_WEIGHT_ZERO_SHOT", "0.70"))
ENSEMBLE_WEIGHT_YOLO      = float(os.getenv("ENSEMBLE_WEIGHT_YOLO",      "0.60"))

# ---------- CV pipeline feature flags ----------
ENABLE_SEGMENTATION = os.getenv("ENABLE_SEGMENTATION", "true").lower() == "true"
ENABLE_MEASUREMENT  = os.getenv("ENABLE_MEASUREMENT",  "true").lower() == "true"

# ---------- Inference thresholds ----------
CONFIDENCE_THRESHOLD_DEFECT = float(os.getenv("CONFIDENCE_THRESHOLD_DEFECT", "0.25"))
CONFIDENCE_THRESHOLD_ASSET  = float(os.getenv("CONFIDENCE_THRESHOLD_ASSET",  "0.35"))
NMS_IOU_THRESHOLD           = float(os.getenv("NMS_IOU_THRESHOLD",           "0.45"))
INFERENCE_IMAGE_MAX_WIDTH   = int(os.getenv("INFERENCE_IMAGE_MAX_WIDTH",     "1024"))

# ---------- Video processing ----------
VIDEO_FPS_SAMPLE           = float(os.getenv("VIDEO_FPS_SAMPLE",           "1.0"))
VIDEO_FRAME_INTERVAL_MS    = int(os.getenv("VIDEO_FRAME_INTERVAL_MS",    "1000"))
MAX_VIDEO_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION_SECONDS",  "600"))
MAX_VIDEO_FILE_SIZE_MB     = int(os.getenv("MAX_VIDEO_FILE_SIZE_MB",      "500"))

# ---------- Duplicate / event filtering ----------
IOU_DUPLICATE_THRESHOLD       = float(os.getenv("IOU_DUPLICATE_THRESHOLD",       "0.45"))
GPS_DUPLICATE_RADIUS_METERS   = float(os.getenv("GPS_DUPLICATE_RADIUS_METERS",   "25.0"))
TIME_DUPLICATE_WINDOW_SECONDS = float(os.getenv("TIME_DUPLICATE_WINDOW_SECONDS",  "8.0"))
MIN_EVENT_APPEARANCES         = int(os.getenv("MIN_EVENT_APPEARANCES",             "2"))

# ---------- Storage ----------
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
UPLOAD_DIR  = Path(os.getenv("UPLOAD_DIR",  str(BASE_DIR / "uploads")))

# ---------- Supabase (optional) ----------
SUPABASE_URL         = os.getenv("SUPABASE_URL",         "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET_NAME  = os.getenv("STORAGE_BUCKET_NAME",  "scan-photos")

# ---------- CORS ----------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Ensure directories exist
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
