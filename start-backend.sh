#!/bin/zsh
# HKA MAPS — Backend Starter
# Jalankan file ini di terminal, biarkan tetap terbuka selama pakai aplikasi

echo ""
echo "================================================"
echo "  HKA MAPS Backend — CV Road Damage Detection"
echo "================================================"
echo ""

cd "$(dirname "$0")/backend"
source venv/bin/activate

# Fix torch dylib jika corrupt (sering terjadi di macOS)
python -c "import torch" 2>/dev/null || {
    echo "⚠️  Torch corrupt, reinstalling..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu -q
    echo "✅ Torch fixed"
}

echo "Models yang akan diload:"
echo "  ✅ YOLO12s — Road Damage RDD2022 (primary detector)"
echo "  ✅ YOLO-World L — Extended zero-shot labels"
echo "  ✅ RT-DETR L — False positive filter"
echo ""
echo "⏳ Loading... (30-60 detik pertama kali)"
echo "   Tunggu: 'Uvicorn running on http://0.0.0.0:8000'"
echo ""

python main.py
