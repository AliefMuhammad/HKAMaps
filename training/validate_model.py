"""
Validation script — evaluate a trained model on the validation set.

Usage:
  python training/validate_model.py --model backend/models/combined_detector.pt
  python training/validate_model.py --model runs/train/hka_maps/weights/best.pt
"""
import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))


def parse_args():
    p = argparse.ArgumentParser(description="Validate YOLO toll-road model")
    p.add_argument("--model", required=True, help="Path to .pt model weights")
    p.add_argument("--data",  default=str(ROOT / "training" / "dataset.yaml"))
    p.add_argument("--imgsz", type=int, default=640)
    p.add_argument("--batch", type=int, default=16)
    p.add_argument("--conf",  type=float, default=0.35)
    p.add_argument("--iou",   type=float, default=0.50)
    p.add_argument("--device", default="")
    p.add_argument("--save-json", action="store_true", help="Save metrics as JSON")
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
        print(f"ERROR: Model not found: {model_path}")
        sys.exit(1)

    model = YOLO(str(model_path))

    print(f"\nValidating: {model_path}")
    metrics = model.val(
        data=args.data,
        imgsz=args.imgsz,
        batch=args.batch,
        conf=args.conf,
        iou=args.iou,
        device=args.device or None,
        verbose=True,
    )

    # Print summary
    print(f"\n{'='*50}")
    print(f"  mAP50:    {metrics.box.map50:.4f}")
    print(f"  mAP50-95: {metrics.box.map:.4f}")
    print(f"  Precision:{metrics.box.mp:.4f}")
    print(f"  Recall:   {metrics.box.mr:.4f}")
    print(f"{'='*50}\n")

    if args.save_json:
        out = {
            "model": str(model_path),
            "map50":     float(metrics.box.map50),
            "map50_95":  float(metrics.box.map),
            "precision": float(metrics.box.mp),
            "recall":    float(metrics.box.mr),
            "per_class": {
                name: {
                    "ap50": float(metrics.box.ap50[i]),
                    "ap":   float(metrics.box.ap[i]),
                }
                for i, name in enumerate(metrics.names.values())
            },
        }
        out_path = ROOT / "runs" / "validation_metrics.json"
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(out, indent=2))
        print(f"Metrics saved to {out_path}")

    return metrics


if __name__ == "__main__":
    main()
