# Training & Fine-tuning Guide — HKA MAPS

## Prerequisites

```bash
pip install ultralytics>=8.3.0 opencv-python-headless numpy
```

---

## Folder Structure

```
HKA MAPS/
├── datasets/
│   ├── raw/                    ← taruh video/gambar mentah di sini
│   └── processed/
│       ├── images/
│       │   ├── train/          ← gambar untuk training
│       │   ├── val/            ← gambar untuk validasi
│       │   └── test/           ← gambar untuk testing (opsional)
│       └── labels/
│           ├── train/          ← label YOLO (.txt) untuk training
│           ├── val/            ← label YOLO (.txt) untuk validasi
│           └── test/
├── training/
│   ├── dataset.yaml            ← konfigurasi dataset
│   ├── train_model.py          ← script training
│   ├── validate_model.py       ← script validasi
│   └── predict_sample.py       ← test prediksi
├── backend/
│   └── models/
│       ├── combined_detector.pt   ← model produksi (taruh di sini)
│       ├── asset_detector.pt      ← opsional: model khusus aset
│       └── road_defect_detector.pt ← opsional: model khusus kerusakan
└── runs/
    ├── train/                  ← output training (auto-generated)
    └── predict/                ← output prediksi (auto-generated)
```

---

## Format Dataset YOLO

Setiap gambar memiliki file label `.txt` dengan format:
```
<class_id> <x_center> <y_center> <width> <height>
```
Koordinat dalam range 0.0–1.0 (normalized). Satu baris per objek.

Contoh label file `gambar_001.txt`:
```
0 0.512 0.648 0.320 0.180
2 0.230 0.410 0.180 0.095
```

---

## Labeling Tools (Gratis)

| Tool | Link | Rekomendasi |
|------|------|-------------|
| CVAT | [cvat.ai](https://cvat.ai) | Terbaik untuk video annotation |
| Label Studio | [labelstud.io](https://labelstud.io) | Multi-format |
| Roboflow | [roboflow.com](https://roboflow.com) | Free tier 3 project |
| Labelimg | via pip | Sederhana, offline |

---

## Target Class (Priority MVP)

| ID | Class | Kategori |
|----|-------|----------|
| 0  | pothole | road_defect |
| 1  | longitudinal_crack | road_defect |
| 2  | transverse_crack | road_defect |
| 3  | alligator_crack | road_defect |
| 8  | concrete_barrier | asset |
| 9  | guardrail | asset |
| 10 | traffic_sign | asset |
| 12 | street_light | asset |

Mulai dengan 7 kelas prioritas, tambahkan kelas lain setelah model stabil.

---

## Dataset Rekomendasi Minimum

| Kelas | Min Images | Target |
|-------|-----------|--------|
| pothole | 200 | 500+ |
| longitudinal_crack | 150 | 400+ |
| alligator_crack | 150 | 400+ |
| Setiap kelas aset | 100 | 300+ |

80% train / 20% val adalah split yang baik untuk awal.

---

## Cara Menjalankan Training

```bash
# Training dasar (YOLO11n, 100 epoch)
python training/train_model.py

# Training dengan model lebih besar
python training/train_model.py --model yolo11s.pt --epochs 150

# Resume training yang terputus
python training/train_model.py --resume

# Custom output directory
python training/train_model.py --project runs/train --name v2_experiment
```

---

## Cara Menjalankan Validasi

```bash
# Validasi model produksi
python training/validate_model.py --model backend/models/combined_detector.pt

# Simpan metrics sebagai JSON
python training/validate_model.py \
  --model runs/train/hka_maps/weights/best.pt \
  --save-json
```

---

## Test Prediksi pada Sampel

```bash
# Test pada gambar
python training/predict_sample.py --source datasets/raw/test.jpg --show

# Test pada video
python training/predict_sample.py --source datasets/raw/test_video.mp4

# Test via webcam (realtime)
python training/predict_sample.py --source 0 --show
```

---

## Deploy Model ke Produksi

Setelah training selesai, copy best weights ke backend:

```bash
# Copy sebagai combined model
cp runs/train/hka_maps/weights/best.pt backend/models/combined_detector.pt

# Atau set path di backend/.env:
MODEL_COMBINED_PATH=./models/combined_detector.pt
```

Restart backend agar model baru dimuat:
```bash
uvicorn main:app --reload
```

---

## Metrics Target

| Metric | Acceptable | Good | Excellent |
|--------|-----------|------|-----------|
| mAP50 | >0.50 | >0.65 | >0.80 |
| mAP50-95 | >0.30 | >0.45 | >0.60 |
| Precision | >0.60 | >0.75 | >0.85 |
| Recall | >0.55 | >0.70 | >0.80 |

---

## Tips

- Kumpulkan gambar dari berbagai kondisi: siang, malam, hujan, kering
- Sertakan gambar dari sudut pandang dashcam (tidak hanya top-down)
- Augmentasi sudah dikonfigurasi untuk kondisi jalan tol Indonesia
- Untuk deteksi retak, resolusi tinggi sangat penting — jangan resize terlalu kecil
- Pisahkan model asset dan defect jika data cukup banyak per kategori
