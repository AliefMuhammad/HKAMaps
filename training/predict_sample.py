"""
Quick prediction test — run model on sample images or video.

Usage:
  python training/predict_sample.py --source datasets/raw/sample.jpg
  python training/predict_sample.py --source datasets/raw/sample_video.mp4 --save-video
  python training/predict_sample.py --source 0           # webcam
"""
import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


def parse_args():
    p = argparse.ArgumentParser(description="Run prediction on sample data")
    p.add_argument("--model",   default=str(ROOT / "backend" / "models" / "combined_detector.pt"))
    p.add_argument("--source",  required=True, help="Image/video path, directory, or 0 for webcam")
    p.add_argument("--conf",    type=float, default=0.35)
    p.add_argument("--iou",     type=float, default=0.45)
    p.add_argument("--imgsz",   type=int, default=640)
    p.add_argument("--device",  default="")
    p.add_argument("--save-video", action="store_true")
    p.add_argument("--show",    action="store_true", help="Display results in a window")
    p.add_argument("--output",  default=str(ROOT / "runs" / "predict"))
    return p.parse_args()


def main():
    args = parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: pip install ultralytics")
        sys.exit(1)

    model_path = Path(args.model)
    if not model_path.exists():
        # Fall back to pretrained
        print(f"Custom model not found at {model_path}, using yolo11n.pt pretrained")
        model_path = "yolo11n.pt"

    model = YOLO(str(model_path))

    source = args.source
    if source.isdigit():
        source = int(source)

    print(f"\nRunning prediction on: {source}")
    results = model.predict(
        source=source,
        conf=args.conf,
        iou=args.iou,
        imgsz=args.imgsz,
        device=args.device or None,
        save=True,
        save_txt=True,
        project=args.output,
        name="run",
        exist_ok=True,
        show=args.show,
        stream=True,   # memory-efficient for video
    )

    total_dets = 0
    for i, r in enumerate(results):
        n = len(r.boxes) if r.boxes else 0
        total_dets += n
        if n > 0:
            classes = [r.names[int(c)] for c in r.boxes.cls]
            print(f"  Frame {i:04d}: {n} detections → {', '.join(classes)}")

    print(f"\nTotal detections: {total_dets}")
    print(f"Results saved to: {args.output}/run/")


if __name__ == "__main__":
    main()
