import React from 'react';
import { X, AlertTriangle, Camera, MapPin, Cpu } from 'lucide-react';

const SEVERITY_STYLES = {
  Ringan: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-400' },
  Sedang: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-400' },
  Parah: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-400' },
};

const BBOX_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah: '#EF4444',
};

/*
  Simulated bounding box positions — in a real app these would come from
  the AI detection model. Each damage type gets a slightly different box
  placement & size to make the demo feel realistic.
*/
const BBOX_PRESETS = {
  'Retak Memanjang': { top: '30%', left: '15%', width: '60%', height: '18%' },
  'Retak Melintang': { top: '40%', left: '20%', width: '55%', height: '12%' },
  'Retak Buaya': { top: '35%', left: '25%', width: '45%', height: '30%' },
  'Lubang': { top: '38%', left: '30%', width: '28%', height: '28%' },
};

export default function DamageModal({ report, onClose }) {
  if (!report) return null;

  const sev = SEVERITY_STYLES[report.severity] || SEVERITY_STYLES.Ringan;
  const bboxColor = BBOX_COLORS[report.severity] || '#F59E0B';
  const bbox = BBOX_PRESETS[report.damage_type] || BBOX_PRESETS['Lubang'];

  // Simulated frame name
  const frameName = `IMG_${String(Math.floor(1000 + Math.random() * 9000))}`;
  // Simulated location
  const locationLabel = 'Pasar Rebo — Cawang';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-hka-red/10 flex items-center justify-center">
              <AlertTriangle size={18} className="text-hka-red" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-800">{report.damage_type}</h3>
              <p className="text-[10px] text-surface-400">AI Detection Result</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${sev.bg} ${sev.text}`}>
              {report.severity}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
              <X size={18} className="text-surface-400" />
            </button>
          </div>
        </div>

        {/* Image with bounding box */}
        <div className="relative bg-surface-900">
          <img
            src={report.image_url || 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600'}
            alt="Road damage"
            className="w-full h-64 object-cover opacity-90"
          />

          {/* AI Bounding Box overlay */}
          <div
            className="absolute pointer-events-none"
            style={{
              ...bbox,
              border: `2.5px solid ${bboxColor}`,
              borderRadius: '4px',
              boxShadow: `0 0 12px ${bboxColor}60`,
            }}
          >
            {/* Top-left corner accent */}
            <div className="absolute -top-0.5 -left-0.5 w-3 h-3 border-t-[3px] border-l-[3px] rounded-tl" style={{ borderColor: bboxColor }} />
            {/* Top-right corner accent */}
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 border-t-[3px] border-r-[3px] rounded-tr" style={{ borderColor: bboxColor }} />
            {/* Bottom-left corner accent */}
            <div className="absolute -bottom-0.5 -left-0.5 w-3 h-3 border-b-[3px] border-l-[3px] rounded-bl" style={{ borderColor: bboxColor }} />
            {/* Bottom-right corner accent */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-b-[3px] border-r-[3px] rounded-br" style={{ borderColor: bboxColor }} />

            {/* Label */}
            <div
              className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold text-white"
              style={{ backgroundColor: bboxColor }}
            >
              {report.damage_type} ({report.ai_confidence}%)
            </div>
          </div>

          {/* AI confidence badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg">
            <Cpu size={12} />
            <span className="text-[11px] font-semibold">AI Conf: {report.ai_confidence}%</span>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <DetailItem icon={<MapPin size={13} />} label="Koordinat" value={`${report.lat}, ${report.lng}`} />
            <DetailItem icon={<Camera size={13} />} label="Jarak" value={`${report.distance_meter} m`} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface-50 border-t border-surface-200">
          <div className="text-xs text-surface-400">
            <span className="font-medium text-surface-500">{frameName}</span> • {report.quarter_period}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <MapPin size={12} />
            <span>{locationLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-surface-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-surface-400">{label}</p>
        <p className="font-medium text-surface-700">{value}</p>
      </div>
    </div>
  );
}
