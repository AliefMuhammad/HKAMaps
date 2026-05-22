# Model Documentation — HKA MAPS CV Pipeline

Dokumen ini mendeskripsikan semua model yang digunakan dalam pipeline deteksi kerusakan jalan HKA MAPS,
termasuk arsitektur, dataset pelatihan, performa, lisensi, dan keterbatasan.

---

## Daftar Model

| # | Model | File | Ukuran | Fungsi | Status |
|---|-------|------|--------|--------|--------|
| 1 | YOLO12s RDD2022 | `yolo12s_RDD2022_best.pt` | 18 MB | Deteksi kerusakan jalan (Stage 1) | **AKTIF** |
| 2 | YOLOv8s-World v2 | `yolov8s-worldv2.pt` | 25 MB | Deteksi aset jalan zero-shot | Nonaktif (default) |
| 3 | YOLO11n COCO | `yolo11n.pt` | 5.4 MB | Fallback jika model utama tidak tersedia | Fallback |
| 4 | Classical Segmenter | — (no weights) | 0 MB | Segmentasi retakan (Stage 2) | **AKTIF** |
| 5 | CV Measurement | — (no weights) | 0 MB | Estimasi panjang/lebar/luas (Stage 3) | **AKTIF** |

---

## Model 1 — YOLO12s Road Damage Detection (Model Utama)

### Identitas

| Field | Value |
|-------|-------|
| **Nama model** | yolo12s-road-damage-rdd2022 |
| **HuggingFace repo** | `rezzzq/yolo12s-road-damage-rdd2022` |
| **File weight** | `yolo12s_RDD2022_best.pt` |
| **Ukuran file** | ~18 MB |
| **Arsitektur** | YOLO12s (scale=s) |
| **Task** | Object Detection (bounding box) |
| **Framework** | Ultralytics 8.3.205 |
| **Tanggal training** | 10 Oktober 2025 |
| **Lisensi** | **AGPL-3.0** ⚠️ |

### Arsitektur

```
YOLO12s — scale 's' dari keluarga YOLO12:
  depth_multiple  : 0.5   (kedalaman backbone)
  width_multiple  : 0.5   (lebar channel)
  max_channels    : 1024

Total parameter   : 9,255,071 (~9.3 juta)
Input size        : 640 × 640 pixel
Output            : Bounding box (x1, y1, x2, y2) + class + confidence
```

YOLO12 menggunakan Attention-based architecture (berbeda dari YOLO11 yang pure CNN),
dengan Area Attention mechanism untuk memproses long-range dependencies lebih efisien
pada gambar beresolusi tinggi seperti foto permukaan jalan.

### Dataset Pelatihan — RDD2022

**Road Damage Dataset 2022 (RDD2022)**

| Field | Detail |
|-------|--------|
| **Nama** | Road Damage Dataset 2022 |
| **Penyelenggara** | Tohoku University (Japan) / Sekilab Research Group |
| **Tahun** | 2022 |
| **Negara cakupan** | Jepang, India, Ceko, Norwegia, Amerika Serikat, China |
| **Jumlah gambar** | ±47.000 gambar |
| **Format annotasi** | Pascal VOC XML + YOLO TXT |
| **Metode pengambilan** | Smartphone terpasang di dashboard kendaraan |
| **Kondisi jalan** | Aspal, beton, jalan tol, jalan kota |

Dataset ini mengikuti taksonomi kerusakan jalan dari MLIT Jepang (Ministry of Land, Infrastructure, Transport and Tourism):

### Kelas yang Dideteksi (5 kelas)

| Kode RDD | Nama Kelas | Deskripsi | Karakteristik |
|----------|------------|-----------|---------------|
| **D00** | Longitudinal Crack | Retak memanjang | Sejajar sumbu jalan, terbentuk akibat kelelahan bending atau tepi perkerasan |
| **D10** | Transverse Crack | Retak melintang | Tegak lurus sumbu jalan, terbentuk akibat thermal stress atau shrinkage |
| **D20** | Alligator Crack | Retak buaya / mesh | Pola jaring-jaring, indikasi kegagalan struktural lapisan pondasi |
| **D40** | Pothole | Lubang jalan | Kerusakan permukaan yang sudah mencapai tahap berlubang, risiko tinggi |
| **Repair** | Repair / Patching | Area tambalan | Bekas perbaikan sebelumnya, perlu monitoring integritas |

> **Catatan:** Kode D00–D40 mengikuti standar Jepang, bukan urutan numerik dari tingkat keparahan.

### Parameter Training

| Parameter | Nilai |
|-----------|-------|
| Pretrained dari | `yolo12s.pt` (ImageNet backbone) |
| Epochs | 300 |
| Batch size | 32 |
| Image size | 640 × 640 |
| Optimizer | Auto (AdamW) |
| Learning rate | 0.01 |
| Weight decay | 0.0005 |
| Data augmentation | Mosaic, mixup bawaan YOLO (augment=auto) |

### Metrik Performa

Metrik berikut diambil langsung dari checkpoint (`train_metrics` di dalam file `.pt`):

| Metrik | Nilai | Keterangan |
|--------|-------|------------|
| **Precision** | **95.96%** | Dari semua deteksi positif, berapa yang benar |
| **Recall** | **90.79%** | Dari semua kerusakan nyata, berapa yang terdeteksi |
| **mAP@0.5** | **95.19%** | Mean Average Precision dengan IoU threshold 0.5 |
| **mAP@0.5:0.95** | **76.60%** | mAP rata-rata dari IoU 0.5 hingga 0.95 (metrik utama COCO) |
| Val Box Loss | 0.913 | Loss lokalisasi bounding box (lebih rendah = lebih baik) |
| Val Cls Loss | 0.499 | Loss klasifikasi kelas |
| Val DFL Loss | 0.987 | Distribution Focal Loss (loss regresi koordinat) |

> **Interpretasi:** mAP@0.5 = 95.19% menunjukkan model sangat akurat dalam mendeteksi dan melokalisasi
> kerusakan jalan dalam kondisi evaluasi dataset RDD2022. Performa nyata di lapangan (out-of-distribution)
> bisa berbeda, terutama untuk:
> - Gambar diambil dari angle/jarak yang berbeda dari training data
> - Kondisi pencahayaan ekstrem (malam, backlight)
> - Kerusakan jalan tol aspal Indonesia yang mungkin berbeda teksturnya dari dataset Jepang/India

### Cara Model Diload di HKA MAPS

```python
# backend/cv_models/detector.py — HFRoadDefectDetector
from huggingface_hub import hf_hub_download
from ultralytics import YOLO

path = hf_hub_download(
    repo_id="rezzzq/yolo12s-road-damage-rdd2022",
    filename="yolo12s_RDD2022_best.pt",
)
model = YOLO(path)
# Model di-cache di ~/.cache/huggingface/hub/
# Tidak perlu download ulang setelah pertama kali
```

### Thresholds yang Dipakai

```python
# backend/config.py
CONFIDENCE_THRESHOLD_DEFECT = 0.25   # minimum confidence untuk dihitung sebagai deteksi
NMS_IOU_THRESHOLD           = 0.45   # IoU threshold untuk Non-Maximum Suppression
INFERENCE_IMAGE_MAX_WIDTH   = 1024   # resize image sebelum inference (aspect-ratio aware)
```

---

## Model 2 — YOLOv8s-World v2 (Asset Detection, Nonaktif Default)

### Identitas

| Field | Value |
|-------|-------|
| **Nama model** | YOLOv8s-World v2 |
| **File weight** | `yolov8s-worldv2.pt` |
| **Ukuran file** | ~25 MB |
| **Total parameter** | 12,759,880 (~12.8 juta) |
| **Task** | Open-vocabulary Object Detection |
| **Framework** | Ultralytics 8.1.21 |
| **Lisensi** | **AGPL-3.0** ⚠️ |

### Cara Kerja

YOLO-World adalah model open-vocabulary: class-nya **tidak ditraining secara fixed**, melainkan
di-set via text label saat runtime menggunakan CLIP text encoder. Ini memungkinkan deteksi
objek apapun yang bisa dideskripsikan dengan teks, tanpa re-training.

```python
# Di HKA MAPS, labels di-set ke aset jalan tol:
labels = [
    "street lamp", "power line pole", "highway sign", "traffic sign",
    "chevron board", "warning sign", "billboard", "digital billboard",
    "guardrail", "concrete barrier", "cctv camera", "toll gantry",
    "delineator", "road marking"
]
model.set_classes(labels)
```

### Status

- **Default: NONAKTIF** (`USE_ZERO_SHOT_ASSETS=false` di `.env`)
- Aktifkan dengan: `USE_ZERO_SHOT_ASSETS=true`
- Dinonaktifkan karena membutuhkan PyTorch CLIP encoder (~200ms/frame overhead)
- Berguna untuk demo deteksi aset infrastruktur tanpa training data

---

## Model 3 — YOLO11n COCO (Fallback)

### Identitas

| Field | Value |
|-------|-------|
| **Nama model** | YOLO11n (nano) |
| **File weight** | `yolo11n.pt` |
| **Ukuran file** | ~5.4 MB |
| **Total parameter** | 2,624,080 (~2.6 juta) |
| **Task** | Object Detection |
| **Dataset** | COCO (80 kelas umum, **bukan road damage**) |
| **Framework** | Ultralytics 8.2.100 |
| **Lisensi** | **AGPL-3.0** ⚠️ |

### Kapan Dipakai

Model ini **hanya aktif sebagai fallback** jika:
1. `USE_HF_DEFECT_MODEL=false`, DAN
2. `MODEL_DEFECT_PATH` dan `MODEL_ASSET_PATH` tidak diset atau file tidak ditemukan

**Tidak direkomendasikan untuk produksi** — 80 kelas COCO tidak mengandung kategori
kerusakan jalan (D00/D10/D20/D40). Accuracy untuk road damage mendekati 0%.
Hanya berguna untuk memverifikasi bahwa pipeline berjalan tanpa model khusus.

---

## Model 4 — Classical Crack Segmenter (Tanpa Weights)

### Algoritma

Tidak menggunakan neural network. Murni OpenCV + image processing klasik.

```
Input : Gambar BGR di area bounding box dari Stage 1
Output: Binary mask + contour polygon dari retakan

Pipeline:
  1. Crop bbox dengan padding 4%
  2. Convert ke grayscale
  3. CLAHE (clipLimit=2.5, tileSize=8×8)
     → meningkatkan kontras retakan di perkerasan gelap/terang
  4. Gaussian blur (5×5) → reduce noise
  5. Adaptive Threshold (GAUSSIAN_C, THRESH_BINARY_INV, blockSize=21, C=5)
     → retakan = piksel gelap di atas perkerasan terang
  6. Morphological Closing (kernel 5×5) → sambungkan segmen retakan
  7. Morphological Opening (kernel 3×3) → hilangkan noise kecil
  8. Keep largest connected component → buang noise terpisah
  9. Contour approximation → polygon output
```

### Kelas yang Di-segmentasi

| Kelas | Di-segmentasi? | Alasan |
|-------|---------------|--------|
| Longitudinal Crack | ✅ Ya | Linear, kontras jelas terhadap aspal |
| Transverse Crack | ✅ Ya | Linear, kontras jelas |
| Alligator Crack | ✅ Ya | Mesh pattern, threshold masih efektif |
| Hairline Crack | ✅ Ya | Perlu CLAHE untuk kontras lemah |
| Repair/Patching | ✅ Ya | Area terang berbeda warna dari aspal |
| **Pothole** | ❌ Tidak | 3D depression — threshold menangkap bayangan, bukan tepi retakan |

### Keterbatasan

- Tidak akurat pada: aspal sangat gelap (malam), permukaan basah, crack berwarna terang (concrete)
- False positive pada: garis marka jalan putih, noda oli, shadow
- Resolusi minimum crop: 8×8 pixel (bbox terlalu kecil dilewati)

---

## Model 5 — CV Measurement (Tanpa Weights)

### Metode Pengukuran per Tipe Kerusakan

#### Linear Cracks (D00, D10, Hairline)

```
Panjang : Skeletonization (scikit-image) → hitung pixel skeleton
          Fallback: min-area rectangle dari contour → dimensi terpanjang
Lebar   : Distance Transform (cv2.distanceTransform)
          → setiap pixel crack, jarak ke background × 2 = lebar lokal
          → mean dan max dilaporkan
Luas    : np.count_nonzero(mask)
```

#### Area Damage (D20 Alligator, D40 Pothole, Patching)

```
Span    : max(bbox_width, bbox_height)   ← bukan skeleton length!
          (skeleton alligator crack bisa trace semua cabang → nilai misleading)
Lebar   : min(bbox_width, bbox_height)
Luas    : mask pixel count (jika mask tersedia) atau bbox area
Diameter ekivalen : 2 × √(area / π)   ← diameter lingkaran dengan luas sama
```

### Keterbatasan Pengukuran

> ⚠️ **SEMUA PENGUKURAN ADALAH ESTIMASI PIXEL, BUKAN METER**
>
> Konversi ke satuan nyata (meter) tidak mungkin akurat tanpa:
> - Kalibrasi kamera (focal length, sensor size)
> - Ketinggian kamera dari permukaan jalan
> - Homography matrix (jika kamera tilted)
> - Depth sensor / stereo camera / LiDAR
>
> Pipeline selalu menyertakan field:
> ```json
> "depth_estimation_available": false,
> "depth_note": "Depth cannot be accurately estimated from a single RGB image..."
> "measurement_unit": "pixel_estimate_from_mask"
> ```

---

## Catatan Lisensi ⚠️

**Semua model (YOLO12s, YOLOv8s-World, YOLO11n) berlisensi AGPL-3.0.**

| Kondisi Penggunaan | Status |
|-------------------|--------|
| Research / akademik | ✅ Bebas |
| Internal non-komersial | ✅ Bebas |
| Produk komersial (source terbuka) | ✅ Diperbolehkan (source wajib open) |
| **Produk komersial (source tertutup)** | ❌ **Wajib beli lisensi Ultralytics** |
| SaaS / cloud inference komersial | ❌ **Wajib beli lisensi Ultralytics** |

> **Implikasi untuk PT HKA:** Jika HKA MAPS di-deploy sebagai produk komersial atau SaaS
> dengan source code tertutup, diperlukan **Ultralytics Enterprise License**.
> Hubungi: https://ultralytics.com/license
>
> Alternatif open-source dengan lisensi lebih permisif:
> - RT-DETR (Apache-2.0) — dari PaddlePaddle
> - DINO (Apache-2.0) — Meta AI
> - Model fine-tuned dari torchvision (BSD)

---

## Keterbatasan Model Secara Umum

### Out-of-Distribution Risk

RDD2022 dikumpulkan dari **kamera smartphone di dashboard kendaraan** yang bergerak.
Performa bisa turun signifikan untuk:

| Kondisi | Risiko |
|---------|--------|
| Gambar diambil dari atas (drone) | Tinggi — sudut berbeda dari training |
| Foto close-up dari samping jalan | Sedang — seperti contoh di screenshot |
| Gambar malam / low-light | Tinggi |
| Jalan beton (bukan aspal) | Sedang — tekstur berbeda |
| Jalan tol Indonesia yang kondisinya berbeda dari dataset Jepang/India | Sedang |
| Gambar blur / motion blur | Tinggi |

### Yang Tidak Bisa Dideteksi Model Ini

- Retak hairline < 2mm lebar (resolusi terlalu rendah)
- Kerusakan struktural bawah permukaan (tidak terlihat secara visual)
- Penurunan elevasi / settlement (butuh LiDAR atau stereo)
- Kerusakan pada marka jalan, drainase, struktur jembatan

---

## Cara Mengganti Model

### Menggunakan model custom (fine-tuned sendiri)

```bash
# Di backend/.env
MODEL_DEFECT_PATH=/path/ke/model_custom.pt
USE_HF_DEFECT_MODEL=false
```

### Menggunakan model HuggingFace lain

```bash
# Di backend/.env
HF_DEFECT_MODEL_ID=nama_user/nama_repo
HF_DEFECT_FILENAME=nama_file.pt
```

### Rekomendasi model alternatif yang bisa dicoba

| Model | HuggingFace | Keunggulan | Lisensi |
|-------|-------------|------------|---------|
| YOLO12s RDD2022 (saat ini) | `rezzzq/yolo12s-road-damage-rdd2022` | mAP50=95.2%, terbaru | AGPL-3.0 |
| YOLOv8n RDD2022 | Cari di HF dengan tag `rdd2022` | Lebih ringan | AGPL-3.0 |
| RT-DETR RDD | Belum tersedia | Lisensi lebih bebas | Apache-2.0 |

---

## Ringkasan Konfigurasi Aktif (default)

```
Stage 1 — Detection:
  Model   : YOLO12s (rezzzq/yolo12s-road-damage-rdd2022)
  Classes : D00, D10, D20, D40, Repair → dipetakan ke nama readable
  Conf    : 0.25 (defect), 0.35 (asset)
  NMS IoU : 0.45
  Resolusi: 1024px lebar (aspect-ratio preserved)

Stage 2 — Segmentation:
  Method  : Classical (CLAHE + Adaptive Threshold + Morphology)
  Weights : Tidak ada
  Toggle  : ENABLE_SEGMENTATION=true

Stage 3 — Measurement:
  Method  : Skeletonization (scikit-image) + Distance Transform (OpenCV)
  Unit    : Pixel estimate (bukan meter)
  Toggle  : ENABLE_MEASUREMENT=true
```
