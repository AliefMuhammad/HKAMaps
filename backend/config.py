import os
from pathlib import Path

BASE_DIR = Path(__file__).parent

# ---------- Model paths (custom fine-tuned weights) ----------
MODEL_ASSET_PATH = os.getenv("MODEL_ASSET_PATH", "")
MODEL_DEFECT_PATH = os.getenv("MODEL_DEFECT_PATH", "")
MODEL_COMBINED_PATH = os.getenv("MODEL_COMBINED_PATH", str(BASE_DIR / "models" / "combined_detector.pt"))
YOLO_PRETRAINED_FALLBACK = os.getenv("YOLO_PRETRAINED_FALLBACK", "yolo11n.pt")

# ---------- HuggingFace — Road Defect Model ----------
# YOLO12s trained on RDD2022: D00 (retak memanjang), D10 (retak buaya), D20 (lubang), D40 (retak), Repair
# https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022
USE_HF_DEFECT_MODEL = os.getenv("USE_HF_DEFECT_MODEL", "true").lower() == "true"
HF_DEFECT_MODEL_ID  = os.getenv("HF_DEFECT_MODEL_ID", "rezzzq/yolo12s-road-damage-rdd2022")
HF_DEFECT_FILENAME  = os.getenv("HF_DEFECT_FILENAME", "yolo12s_RDD2022_best.pt")
HF_TOKEN            = os.getenv("HF_TOKEN", "")

# ---------- Zero-Shot Asset Detection via Grounding DINO ----------
# Detects any highway asset by text description — no training required.
# On Apple Silicon (MPS) / NVIDIA GPU this runs at ~200-500ms/image.
# On CPU-only machines set USE_ZERO_SHOT_ASSETS=false for faster realtime.
USE_ZERO_SHOT_ASSETS = os.getenv("USE_ZERO_SHOT_ASSETS", "true").lower() == "true"
ZERO_SHOT_MODEL_ID   = os.getenv("ZERO_SHOT_MODEL_ID", "yolov8s-worldv2.pt")

# Comma-separated candidate labels — keep SHORT (fewer labels = much faster inference).
# Grounding DINO processes ALL labels together: 28 labels ~= 4-5x slower than 11 labels.
# Use the most DISTINCT label per category (remove synonyms).
ZERO_SHOT_ASSET_LABELS = os.getenv(
    "ZERO_SHOT_ASSET_LABELS",
    (
        "street lamp,"          # lampu jalan — pole with curved arm and lamp fixture on top
        "power line pole,"      # tiang listrik — bare pole with crossarms carrying wires
        "highway sign,"         # rambu arah — green/blue overhead direction sign
        "traffic sign,"         # rambu jalan — white/red/blue regulatory sign
        "chevron board,"        # rambu peringatan kuning — yellow arrow/chevron warning board
        "warning sign,"         # rambu peringatan — generic yellow caution/hazard sign
        "billboard,"            # billboard iklan — large static advertisement board
        "digital billboard,"    # videotron — LED/digital display board
        "guardrail,"
        "concrete barrier,"     # jersey barrier / concrete median divider
        "cctv camera,"
        "toll gantry,"          # gantry tol — overhead sign/toll gantry bridge
        "delineator,"
        "road marking"
    )
)

# Detection threshold — 0.22 balances recall vs false positives with 11 labels
ZERO_SHOT_THRESHOLD = float(os.getenv("ZERO_SHOT_THRESHOLD", "0.22"))

# Video processing: run zero-shot every N sampled frames (1 = every frame, 3 = every 3rd)
# Increase to reduce processing time for long videos.
ZERO_SHOT_EVERY_N_FRAMES = int(os.getenv("ZERO_SHOT_EVERY_N_FRAMES", "1"))

# HF model cache directory (default: ~/.cache/huggingface)
HF_CACHE_DIR = os.getenv("HF_CACHE_DIR", "")

# ---------- Inference thresholds ----------
CONFIDENCE_THRESHOLD_ASSET  = float(os.getenv("CONFIDENCE_THRESHOLD_ASSET",  "0.35"))
CONFIDENCE_THRESHOLD_DEFECT = float(os.getenv("CONFIDENCE_THRESHOLD_DEFECT", "0.35"))
INFERENCE_IMAGE_MAX_WIDTH   = int(os.getenv("INFERENCE_IMAGE_MAX_WIDTH", "640"))

# ---------- Video processing ----------
VIDEO_FPS_SAMPLE           = float(os.getenv("VIDEO_FPS_SAMPLE",           "1.0"))
VIDEO_FRAME_INTERVAL_MS    = int(os.getenv("VIDEO_FRAME_INTERVAL_MS",    "1000"))
MAX_VIDEO_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION_SECONDS",  "600"))
MAX_VIDEO_FILE_SIZE_MB     = int(os.getenv("MAX_VIDEO_FILE_SIZE_MB",      "500"))

# ---------- Duplicate filtering ----------
IOU_DUPLICATE_THRESHOLD        = float(os.getenv("IOU_DUPLICATE_THRESHOLD",        "0.45"))
GPS_DUPLICATE_RADIUS_METERS    = float(os.getenv("GPS_DUPLICATE_RADIUS_METERS",    "25.0"))
TIME_DUPLICATE_WINDOW_SECONDS  = float(os.getenv("TIME_DUPLICATE_WINDOW_SECONDS",   "8.0"))
# Minimum frames an object must appear in to be counted as a real event.
# Filters single-frame false positives and class-flip ghosts (e.g. videotron→traffic_sign).
MIN_EVENT_APPEARANCES          = int(os.getenv("MIN_EVENT_APPEARANCES",              "2"))

# ---------- Storage ----------
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
UPLOAD_DIR  = Path(os.getenv("UPLOAD_DIR",  str(BASE_DIR / "uploads")))

# ---------- Supabase (optional) ----------
SUPABASE_URL        = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET_NAME = os.getenv("STORAGE_BUCKET_NAME", "scan-photos")

# ---------- CORS ----------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

# Ensure directories exist at import time
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
