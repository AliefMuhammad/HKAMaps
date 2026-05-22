"""
test_road_damage_video.py — local test for the CV pipeline (video mode).

Usage:
  python test_road_damage_video.py --video sample.mp4
  python test_road_damage_video.py --video sample.mp4 --sample-rate 2 --max-frames 30

What it does:
  1. Loads the pipeline
  2. Extracts frames at the given sample rate
  3. Runs the full pipeline on each sampled frame
  4. Applies duplicate/event deduplication
  5. Saves annotated frames to output/
  6. Prints a JSON summary of all detected events
"""
import argparse
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))


def run_test(video_path: str, sample_rate: float, max_frames: int):
    import cv2

    from cv_models.pipeline import RoadDamagePipeline, build_structured_output
    from duplicate_filter import DetectionEventTracker
    import config as cfg

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: Cannot open video: {video_path}")
        sys.exit(1)

    fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_sec = total_frames / fps
    interval     = max(1, int(fps / sample_rate))

    print(f"\nVideo : {video_path}")
    print(f"  FPS={fps:.1f}  total_frames={total_frames}  duration={duration_sec:.1f}s")
    print(f"  Sample rate={sample_rate} fps → every {interval} frames")

    out_dir = Path(video_path).parent / "output"
    out_dir.mkdir(exist_ok=True)

    print("\nLoading pipeline…")
    pipeline = RoadDamagePipeline()
    print(f"  Models: {pipeline.model_info}")
    print(f"  Simulation: {pipeline.is_simulation_mode}")

    tracker = DetectionEventTracker(
        iou_threshold=cfg.IOU_DUPLICATE_THRESHOLD,
        time_window_seconds=cfg.TIME_DUPLICATE_WINDOW_SECONDS,
        gps_radius_meters=cfg.GPS_DUPLICATE_RADIUS_METERS,
    )

    frame_idx   = 0
    sample_num  = 0
    total_dets  = 0
    frame_times = []

    print("\nProcessing frames…")
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if sample_num >= max_frames:
            break

        video_sec = frame_idx / fps

        if frame_idx % interval == 0:
            t0 = time.perf_counter()

            if pipeline.is_simulation_mode:
                detections, annotated, proc_ms = pipeline.simulate()
            else:
                detections, annotated, proc_ms = pipeline.run(frame)

            elapsed = (time.perf_counter() - t0) * 1000
            frame_times.append(elapsed)
            total_dets += len(detections)

            det_str = ", ".join(
                f"{d['class_name']}({d.get('confidence', 0):.2f})" for d in detections
            ) or "—"
            print(f"  Frame {sample_num:3d}  t={video_sec:.1f}s  {elapsed:.0f}ms  [{det_str}]")

            for det in detections:
                # Map internal bbox dict to tracker format
                tracker.add_detection(
                    detection={
                        "class_name": det["class_name"],
                        "category":   det.get("category", "road_defect"),
                        "bbox": det.get("bbox", {"x1": 0, "y1": 0, "x2": 0, "y2": 0}),
                        "confidence": det.get("confidence", 0),
                        "severity":   det.get("severity"),
                    },
                    timestamp_second=video_sec,
                    frame_index=sample_num,
                )

            if detections and annotated is not None:
                ann_name = f"frame_{sample_num:04d}_annotated.jpg"
                cv2.imwrite(str(out_dir / ann_name), annotated, [cv2.IMWRITE_JPEG_QUALITY, 88])

            sample_num += 1

        frame_idx += 1

    cap.release()

    events = tracker.get_events(min_appearances=cfg.MIN_EVENT_APPEARANCES)

    avg_ms = sum(frame_times) / len(frame_times) if frame_times else 0
    print(f"\n--- Summary ---")
    print(f"  Frames processed : {sample_num}")
    print(f"  Total detections : {total_dets}")
    print(f"  Unique events    : {len(events)}")
    print(f"  Avg inference    : {avg_ms:.0f} ms/frame")
    print(f"  Annotated frames : {out_dir}/")

    if events:
        print("\n--- Detection Events (after deduplication) ---")
        for ev in events:
            print(f"  [{ev['event_id'][:8]}] {ev['class_name']}"
                  f"  conf={ev['best_confidence']:.2f}"
                  f"  seen={ev['detection_count']}x"
                  f"  sev={ev.get('severity') or '—'}"
                  f"  t={ev['first_seen_second']:.1f}s–{ev['last_seen_second']:.1f}s")
    else:
        print("\n  No events passed deduplication filter.")

    # Structured summary JSON
    summary = {
        "video_path":       video_path,
        "frames_processed": sample_num,
        "total_detections": total_dets,
        "events":           events,
        "avg_inference_ms": round(avg_ms, 1),
    }
    json_path = out_dir / "events.json"
    json_path.write_text(json.dumps(summary, indent=2, default=str))
    print(f"\nEvents saved: {json_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HKA MAPS — road damage video test")
    parser.add_argument("--video",       required=True, help="Path to input video")
    parser.add_argument("--sample-rate", type=float, default=1.0,
                        help="Frames per second to sample (default: 1.0)")
    parser.add_argument("--max-frames",  type=int, default=100,
                        help="Maximum sampled frames to process (default: 100)")
    args = parser.parse_args()

    run_test(
        video_path=args.video,
        sample_rate=args.sample_rate,
        max_frames=args.max_frames,
    )
