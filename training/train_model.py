"""
Training script — fine-tune YOLO11 on custom toll-road inspection dataset.

Usage:
  python training/train_model.py
  python training/train_model.py --model yolo11s.pt --epochs 100 --imgsz 640

Outputs are saved to runs/train/
"""
import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

# ---------------------------------------------------------------------------
# Augmentation presets tuned for road inspection footage
# ---------------------------------------------------------------------------
AUGMENTATION = dict(
    hsv_h=0.020,       # hue shift ±2% (lighting variation)
    hsv_s=0.80,        # saturation variation
    hsv_v=0.50,        # brightness/darkness variation (tunnel vs outdoor)
    degrees=5.0,       # rotation (minor road camber)
    translate=0.15,
    scale=0.55,        # zoom variation
    shear=2.0,
    perspective=0.0003,
    flipud=0.0,        # no vertical flip (gravity exists)
    fliplr=0.50,       # horizontal flip (left/right lane)
    mosaic=1.0,        # mosaic augmentation
    mixup=0.10,
    copy_paste=0.10,
    # Motion blur — important for moving-vehicle footage
    blur=0.0,          # set via blur_limit in Albumentations if needed
)


def parse_args():
    p = argparse.ArgumentParser(description="Train YOLO toll-road model")
    p.add_argument("--model",   default="yolo11n.pt",  help="Base model or path to .pt checkpoint")
    p.add_argument("--data",    default=str(ROOT / "training" / "dataset.yaml"), help="Dataset yaml")
    p.add_argument("--epochs",  type=int, default=100)
    p.add_argument("--imgsz",   type=int, default=640)
    p.add_argument("--batch",   type=int, default=16)
    p.add_argument("--device",  default="",   help="cuda device (0/0,1/cpu) or '' for auto")
    p.add_argument("--project", default=str(ROOT / "runs" / "train"))
    p.add_argument("--name",    default="hka_maps")
    p.add_argument("--resume",  action="store_true", help="Resume from last checkpoint")
    p.add_argument("--task",    default="detect",    help="detect or segment")
    return p.parse_args()


def main():
    args = parse_args()

    try:
        from ultralytics import YOLO
    except ImportError:
        print("ERROR: ultralytics not installed.\nRun: pip install ultralytics")
        sys.exit(1)

    data_yaml = Path(args.data)
    if not data_yaml.exists():
        print(f"ERROR: dataset.yaml not found at {data_yaml}")
        sys.exit(1)

    model = YOLO(args.model, task=args.task)

    print(f"\n{'='*60}")
    print(f"  Training: {args.model}")
    print(f"  Dataset:  {args.data}")
    print(f"  Epochs:   {args.epochs}")
    print(f"  Img size: {args.imgsz}")
    print(f"  Output:   {args.project}/{args.name}")
    print(f"{'='*60}\n")

    results = model.train(
        data=str(data_yaml),
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device or None,
        project=args.project,
        name=args.name,
        resume=args.resume,
        # Augmentation
        **AUGMENTATION,
        # Logging
        verbose=True,
        save=True,
        save_period=10,   # save checkpoint every N epochs
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    print(f"\n✅ Training complete. Best weights: {best_weights}")
    print(f"\nTo use as production model, copy to backend/models/:")
    print(f"  cp {best_weights} {ROOT / 'backend' / 'models' / 'combined_detector.pt'}")
    print(f"\nOr set in backend/.env:")
    print(f"  MODEL_COMBINED_PATH={best_weights}")

    return results


if __name__ == "__main__":
    main()
