/**
 * Computer Vision Engine — Roboflow Integration
 * 
 * Modul untuk mengirim frame kamera ke Roboflow API
 * dan menerima hasil deteksi kerusakan jalan + aset tol.
 */

const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const ROBOFLOW_MODEL_ID = import.meta.env.VITE_ROBOFLOW_MODEL_ID || 'road-pothole-detection-fmjio/1';



// Mapping dari class label Roboflow → tipe internal kita
const DAMAGE_CLASS_MAP = {
  'pothole': 'Lubang',
  'longitudinal-crack': 'Retak Memanjang',
  'longitudinal_crack': 'Retak Memanjang',
  'transverse-crack': 'Retak Melintang',
  'transverse_crack': 'Retak Melintang',
  'alligator-crack': 'Retak Buaya',
  'alligator_crack': 'Retak Buaya',
  'crack': 'Retak Memanjang',
  'D00': 'Retak Memanjang',
  'D01': 'Retak Melintang',
  'D10': 'Retak Buaya',
  'D11': 'Retak Buaya',
  'D20': 'Lubang',
  'D40': 'Retak Memanjang',
  'D43': 'Retak Melintang',
  'D44': 'Lubang',
};

const ASSET_CLASS_MAP = {
  'street_light': 'Lampu Jalan',
  'streetlight': 'Lampu Jalan',
  'lamp': 'Lampu Jalan',
  'barrier': 'Pembatas Jalan',
  'guardrail': 'Guardrail',
  'sign': 'Plang/Rambu',
  'traffic_sign': 'Plang/Rambu',
  'cctv': 'CCTV',
  'camera': 'CCTV',
  'gantry': 'Gantry Tol',
  'toll_gantry': 'Gantry Tol',
};

/**
 * Mengubah canvas/video element menjadi base64 string
 */
export function captureFrameAsBase64(videoElement, maxWidth = 640) {
  // Guard: video belum siap (belum ada frame)
  if (!videoElement.videoWidth || !videoElement.videoHeight) {
    return null;
  }

  const canvas = document.createElement('canvas');
  const ratio = videoElement.videoWidth / videoElement.videoHeight;
  canvas.width = maxWidth;
  canvas.height = Math.round(maxWidth / ratio);
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  
  // Return base64 without data: prefix
  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  
  // Guard: canvas kosong
  if (!dataUrl || !dataUrl.includes(',')) {
    return null;
  }

  return {
    base64: dataUrl.split(',')[1],
    dataUrl,
    blob: dataURLtoBlob(dataUrl),
    width: canvas.width,
    height: canvas.height,
  };
}

function dataURLtoBlob(dataUrl) {
  try {
    const arr = dataUrl.split(',');
    if (arr.length < 2 || !arr[0] || !arr[1]) return null;
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.warn('dataURLtoBlob failed:', e);
    return null;
  }
}

/**
 * Mengirim frame ke Roboflow API dan menerima hasil deteksi
 * @returns {{ predictions: Array, damages: Array, assets: Array }}
 */
export async function analyzeFrame(base64Image) {
  if (!ROBOFLOW_API_KEY) {
    return { error: 'API Key Roboflow Belum Dikonfigurasi di Environment' };
  }

  try {
    const WORKFLOW_URL = `https://detect.roboflow.com/infer/workflows/hka-maps/highway-pipeline`;
    const payload = {
        api_key: ROBOFLOW_API_KEY || "x7SrAJhRbVnnDyv45CRG",
        inputs: {
            image: {
                type: "base64",
                value: base64Image
            }
        }
    };

    const response = await fetch(WORKFLOW_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Roboflow API error:', response.status, errText);
      return { error: `Roboflow API Error: ${response.status} - Pastikan API Key Valid` };
    }

    const data = await response.json();
    let trackedObjects = [];
    if (data && data.outputs && data.outputs.length > 0) {
        trackedObjects = data.outputs[0].tracked_objects || data.outputs[0].byte_tracker || [];
    }
    
    // Klasifikasikan untuk backward compatiblity dengan UI lama
    const result = classifyPredictions(trackedObjects);
    return { ...result, rawTracked: trackedObjects };
  } catch (err) {
    console.error('CV Engine Network error:', err);
    return { error: `Gagal menghubungi server Roboflow: ${err.message}` };
  }
}


/**
 * Mengklasifikasikan prediksi mentah dari Roboflow
 * menjadi kategori kerusakan vs aset
 */
export function classifyPredictions(predictions) {
  const damages = [];
  const assets = [];

  for (const pred of predictions) {
    const cls = pred.class?.toLowerCase() || '';
    const confidence = pred.confidence * 100;

    // Cek apakah ini kerusakan
    const damageType = Object.entries(DAMAGE_CLASS_MAP)
      .find(([key]) => cls.includes(key));
    
    if (damageType) {
      damages.push({
        type: damageType[1],
        severity: confidence >= 85 ? 'Parah' : confidence >= 60 ? 'Sedang' : 'Ringan',
        confidence: Math.round(confidence * 10) / 10,
        bbox: { x: pred.x, y: pred.y, width: pred.width, height: pred.height },
        rawClass: pred.class,
      });
      continue;
    }

    // Cek apakah ini aset
    const assetType = Object.entries(ASSET_CLASS_MAP)
      .find(([key]) => cls.includes(key));
    
    if (assetType) {
      assets.push({
        type: assetType[1],
        condition: confidence >= 80 ? 'Baik' : confidence >= 50 ? 'Rusak Ringan' : 'Rusak Berat',
        confidence: Math.round(confidence * 10) / 10,
        bbox: { x: pred.x, y: pred.y, width: pred.width, height: pred.height },
        rawClass: pred.class,
      });
    }
  }

  return { predictions, damages, assets };
}

/**
 * Mode simulasi — menghasilkan deteksi dummy jika API tidak tersedia
 */
function simulateDetection() {
  const rand = Math.random();
  const damages = [];
  const assets = [];

  // 15% chance mendeteksi kerusakan (Diperkecil agar lebih akurat/tidak berisik)
  if (rand < 0.15) {
    const types = ['Lubang', 'Retak Memanjang', 'Retak Melintang', 'Retak Buaya'];
    const sevs = ['Ringan', 'Sedang', 'Parah'];
    damages.push({
      type: types[Math.floor(Math.random() * types.length)],
      severity: sevs[Math.floor(Math.random() * sevs.length)],
      confidence: Math.round((80 + Math.random() * 18) * 10) / 10,
      bbox: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 200, width: 80, height: 60 },
      rawClass: 'simulated',
    });
  }

  // 10% chance mendeteksi aset
  if (rand > 0.90) {
    const types = ['Lampu Jalan', 'Pembatas Jalan', 'Plang/Rambu', 'Guardrail', 'CCTV'];
    assets.push({
      type: types[Math.floor(Math.random() * types.length)],
      condition: 'Baik',
      confidence: Math.round((80 + Math.random() * 18) * 10) / 10,
      bbox: { x: 100 + Math.random() * 300, y: 50 + Math.random() * 150, width: 100, height: 120 },
      rawClass: 'simulated',
    });
  }

  return { predictions: [], damages, assets };
}

export const setupInferencePipeline = async (videoElement, sessionId, onDetection) => {
  let isActive = true;

  const processFrame = async () => {
    if (!isActive || !videoElement || videoElement.paused || videoElement.ended) return;
    
    try {
      const frameData = captureFrameAsBase64(videoElement);
      if (frameData) {
        // Endpoint Roboflow Workflows Hosted API
        const WORKFLOW_URL = `https://detect.roboflow.com/infer/workflows/hka-maps/highway-pipeline`;
        
        const payload = {
            api_key: ROBOFLOW_API_KEY || "x7SrAJhRbVnnDyv45CRG",
            inputs: {
                image: {
                    type: "base64",
                    value: frameData.base64
                }
            }
        };

        const response = await fetch(WORKFLOW_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
           const data = await response.json();
           
           // Cari output 'tracked_objects' berdasar JSON Workflow kita
           if (data && data.outputs && data.outputs.length > 0) {
              // Roboflow Workflows bisa mengembalikan berbagai key di dalam outputs[0]
              const trackedObjects = data.outputs[0].tracked_objects || data.outputs[0].byte_tracker || [];
              if (trackedObjects.length > 0) {
                 // Untuk batch handler, pass deteksi ini (raw) ke hook useHighwayDetection
                 onDetection(trackedObjects, sessionId);
              }
           }
        }
      }
    } catch (e) {
      console.error("Inference Pipeline Fetch Error:", e);
    }
    
    // Looping menggunakan RequestAnimationFrame dengan delay sedikit (15fps) jika isActive
    if (isActive) {
        setTimeout(() => requestAnimationFrame(processFrame), 66);
    }
  };
  
  processFrame();
  
  // Return cleanup function
  return () => { isActive = false; };
};

