"""
test_road_damage_inference.py — local test for the CV pipeline (image mode).

Usage:
  python test_road_damage_inference.py --image sample.jpg
  python test_road_damage_inference.py --image sample.jpg --no-seg --no-measure

What it does:
  1. Loads all models (HF defect model + YOLO-World)
  2. Runs the 3-stage pipeline on the input image
  3. Saves annotated output to <image_stem>_annotated.jpg
  4. Prints the full structured JSON result
  5. Reports which pipeline stages were active
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Allow running directly from backend/ without install
# ---------------------------------------------------------------------------
sys.path.insert(0, str(Path(__file__).parent))


def run_test(image_path: str, enable_seg: bool, enable_measure: bool):
    import cv2
    import numpy as np

    # Override config flags before importing pipeline
    os.environ.setdefault("ENABLE_SEGMENTATION", "true" if enable_seg    else "false")
    os.environ.setdefault("ENABLE_MEASUREMENT",  "true" if enable_measure else "false")

    from cv_models.pipeline import RoadDamagePipeline, build_structured_output

    img = cv2.imread(image_path)
    if img is None:
        print(f"ERROR: Cannot read image: {image_path}")
        sys.exit(1)

    h, w = img.shape[:2]
    print(f"\nImage: {image_path}  ({w}×{h})")
    print(f"Segmentation: {'ON' if enable_seg else 'OFF'}   "
          f"Measurement: {'ON' if enable_measure else 'OFF'}")

    print("\nLoading pipeline…")
    t0 = time.perf_counter()
    pipeline = RoadDamagePipeline()
    load_ms = (time.perf_counter() - t0) * 1000
    print(f"  Active models : {pipeline.model_info}")
    print(f"  Simulation    : {pipeline.is_simulation_mode}")
    print(f"  Load time     : {load_ms:.0f} ms")

    if pipeline.is_simulation_mode:
        print("\n⚠  SIMULATION MODE — no real model loaded. Results are random.")
        detections, annotated, proc_ms = pipeline.simulate()
    else:
        print("\nRunning inference…")
        detections, annotated, proc_ms = pipeline.run(img)

    structured = build_structured_output(detections, proc_ms)

    print(f"\n  Inference time : {proc_ms:.1f} ms")
    print(f"  Detections     : {structured['summary']['total_detections']}")
    print(f"  Road defects   : {structured['summary']['road_defects_count']}")
    print(f"  Assets         : {structured['summary']['assets_count']}")
    print(f"  Overall severity: {structured['summary']['overall_severity']}")

    # Save annotated image
    stem = Path(image_path).stem
    ann_path = Path(image_path).parent / f"{stem}_annotated.jpg"
    if annotated is not None:
        cv2.imwrite(str(ann_path), annotated, [cv2.IMWRITE_JPEG_QUALITY, 90])
        print(f"\nAnnotated image saved: {ann_path}")
    else:
        print("\nNo annotated image (simulation mode with no detections)")

    print("\n--- Structured JSON output ---")
    print(json.dumps(structured, indent=2, ensure_ascii=False))

    print("\n--- Per-detection summary ---")
    for det in structured["detections"]:
        cat  = det.get("category", "?")
        icon = "🔴" if cat == "road_defect" else "🔵"
        sev  = det.get("severity") or "—"
        mask = "✓ mask" if det.get("mask_available") else "  bbox"
        lw   = ""
        if det.get("crack_length_px"):
            lw = f"  L:{det['crack_length_px']:.0f}px W:{det['crack_width_px_avg']:.1f}px"
        print(f"  {icon} [{det['id']}] {det['class_name']}  conf={det['confidence']:.2f}"
              f"  sev={sev}  {mask}{lw}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HKA MAPS — road damage inference test")
    parser.add_argument("--image",      required=True, help="Path to input image")
    parser.add_argument("--no-seg",     action="store_true", help="Disable segmentation stage")
    parser.add_argument("--no-measure", action="store_true", help="Disable measurement stage")
    args = parser.parse_args()

    run_test(
        image_path=args.image,
        enable_seg=not args.no_seg,
        enable_measure=not args.no_measure,
    )
