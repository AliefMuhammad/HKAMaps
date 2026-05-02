import os
from pathlib import Path

BASE_DIR = Path(__file__).parent

# ---------- Model paths (custom fine-tuned weights) ----------
MODEL_ASSET_PATH = os.getenv("MODEL_ASSET_PATH", "")
MODEL_DEFECT_PATH = os.getenv("MODEL_DEFECT_PATH", "")
MODEL_COMBINED_PATH = os.getenv("MODEL_COMBINED_PATH", str(BASE_DIR / "models" / "combined_detector.pt"))
YOLO_PRETRAINED_FALLBACK = os.getenv("YOLO_PRETRAINED_FALLBACK", "yolo11n.pt")

# ---------- HuggingFace pre-trained models (no labeling needed, no account required) ----------
# YOLO12s trained on RDD2022 — public, no auth, no paid service
# Classes: D00 (retak memanjang), D10 (retak buaya), D20 (lubang), D40 (retak), Repair (tambalan)
# https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022
USE_HF_DEFECT_MODEL = os.getenv("USE_HF_DEFECT_MODEL", "true").lower() == "true"
HF_DEFECT_MODEL_ID  = os.getenv("HF_DEFECT_MODEL_ID", "rezzzq/yolo12s-road-damage-rdd2022")
HF_DEFECT_FILENAME  = os.getenv("HF_DEFECT_FILENAME", "yolo12s_RDD2022_best.pt")
HF_TOKEN            = os.getenv("HF_TOKEN", "")   # optional, only needed for private/gated models

# Zero-shot asset detection via Grounding DINO (deteksi berdasarkan teks, tanpa training)
USE_ZERO_SHOT_ASSETS   = os.getenv("USE_ZERO_SHOT_ASSETS", "false").lower() == "true"
ZERO_SHOT_MODEL_ID     = os.getenv("ZERO_SHOT_MODEL_ID", "IDEA-Research/grounding-dino-tiny")
ZERO_SHOT_ASSET_LABELS = os.getenv(
    "ZERO_SHOT_ASSET_LABELS",
    "guardrail,concrete barrier,traffic sign,direction sign,street light,toll gantry,cctv camera,delineator,road marking"
)
ZERO_SHOT_THRESHOLD = float(os.getenv("ZERO_SHOT_THRESHOLD", "0.28"))

# HF model cache directory (default: ~/.cache/huggingface)
HF_CACHE_DIR = os.getenv("HF_CACHE_DIR", "")

# ---------- Inference thresholds ----------
CONFIDENCE_THRESHOLD_ASSET = float(os.getenv("CONFIDENCE_THRESHOLD_ASSET", "0.40"))
CONFIDENCE_THRESHOLD_DEFECT = float(os.getenv("CONFIDENCE_THRESHOLD_DEFECT", "0.35"))
VIDEO_CONFIDENCE_THRESHOLD = float(os.getenv("VIDEO_CONFIDENCE_THRESHOLD", "0.40"))
INFERENCE_IMAGE_MAX_WIDTH = int(os.getenv("INFERENCE_IMAGE_MAX_WIDTH", "640"))

# ---------- Video processing ----------
VIDEO_FPS_SAMPLE = float(os.getenv("VIDEO_FPS_SAMPLE", "1.0"))           # sampled frames per second
VIDEO_FRAME_INTERVAL_MS = int(os.getenv("VIDEO_FRAME_INTERVAL_MS", "1000"))
MAX_VIDEO_DURATION_SECONDS = int(os.getenv("MAX_VIDEO_DURATION_SECONDS", "600"))
MAX_VIDEO_FILE_SIZE_MB = int(os.getenv("MAX_VIDEO_FILE_SIZE_MB", "500"))

# ---------- Duplicate filtering ----------
IOU_DUPLICATE_THRESHOLD = float(os.getenv("IOU_DUPLICATE_THRESHOLD", "0.45"))
GPS_DUPLICATE_RADIUS_METERS = float(os.getenv("GPS_DUPLICATE_RADIUS_METERS", "10.0"))
TIME_DUPLICATE_WINDOW_SECONDS = float(os.getenv("TIME_DUPLICATE_WINDOW_SECONDS", "5.0"))

# ---------- Storage ----------
STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage")))
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads")))

# Optional: Supabase direct upload from backend
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STORAGE_BUCKET_NAME = os.getenv("STORAGE_BUCKET_NAME", "scan-photos")

# ---------- CORS ----------
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173").split(",")

# Ensure directories exist at import time
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
