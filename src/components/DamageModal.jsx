import React, { useState } from 'react';
import { X, AlertTriangle, Camera, MapPin, Cpu, Package, Clock, Wifi, ExternalLink } from 'lucide-react';

const SEVERITY_STYLES = {
  Ringan: { bg: 'bg-green-100', text: 'text-green-700', bar: 'bg-green-500', label: 'RINGAN' },
  Sedang: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500', label: 'SEDANG' },
  Parah:  { bg: 'bg-red-100',   text: 'text-red-700',   bar: 'bg-red-500',   label: 'PARAH'  },
};

const SEVERITY_COLORS = {
  Ringan: '#22C55E',
  Sedang: '#F59E0B',
  Parah:  '#EF4444',
};

const CONDITION_STYLES = {
  Baik:          { bg: 'bg-green-100',  text: 'text-green-700',  bar: 'bg-green-500'  },
  'Rusak Ringan':{ bg: 'bg-amber-100',  text: 'text-amber-700',  bar: 'bg-amber-500'  },
  'Rusak Parah': { bg: 'bg-red-100',    text: 'text-red-700',    bar: 'bg-red-500'    },
};

const ASSET_TYPE_CONFIG = {
  'Lampu Jalan':      { icon: '💡', color: '#FBBF24' },
  'Tiang Listrik':    { icon: '⚡', color: '#A78BFA' },
  'Pembatas Jalan':   { icon: '🚧', color: '#FB923C' },
  'Plang/Rambu':      { icon: '🪧', color: '#60A5FA' },
  'Rambu Arah':       { icon: '🛣️', color: '#34D399' },
  'Rambu Peringatan': { icon: '⚠️', color: '#FBBF24' },
  'Guardrail':        { icon: '🛡️', color: '#A78BFA' },
  'CCTV':             { icon: '📹', color: '#34D399' },
  'Gantry Tol':       { icon: '🏗️', color: '#F472B6' },
  'Billboard':        { icon: '📢', color: '#94A3B8' },
  'Videotron':        { icon: '📺', color: '#64748B' },
  'Delineator':       { icon: '🔶', color: '#F97316' },
  'Marka Jalan':      { icon: '〰️', color: '#CBD5E1' },
  'Lainnya':          { icon: '📦', color: '#94A3B8' },
};

// Detect whether this report is an asset or damage
function isAssetReport(report) {
  return Boolean(report.asset_type || report.condition);
}

export default function DamageModal({ report, onClose }) {
  if (!report) return null;

  const isAsset = isAssetReport(report);

  return isAsset
    ? <AssetModal report={report} onClose={onClose} />
    : <DamageReportModal report={report} onClose={onClose} />;
}

/* ─────────────── DAMAGE REPORT MODAL ─────────────── */
function DamageReportModal({ report, onClose }) {
  const [imgError, setImgError] = useState(false);

  const sev = SEVERITY_STYLES[report.severity] || SEVERITY_STYLES.Sedang;
  const bboxColor = SEVERITY_COLORS[report.severity] || '#F59E0B';

  const hasRealImage = Boolean(report.image_url) && !imgError;

  const lat = report.lat != null ? Number(report.lat).toFixed(6) : '—';
  const lng = report.lng != null ? Number(report.lng).toFixed(6) : '—';

  const scannedAt = report.scanned_at
    ? new Date(report.scanned_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : report.quarter_period || '—';

  const gmapsUrl = report.lat && report.lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-hka-red/10 flex items-center justify-center">
              <AlertTriangle size={20} className="text-hka-red" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-800">{report.damage_type || 'Kerusakan Jalan'}</h3>
              <p className="text-[10px] text-surface-400 flex items-center gap-1">
                {report.source === 'ai_scanner' ? (
                  <><Cpu size={9} className="text-blue-500" /> AI Detection Result</>
                ) : (
                  <><Camera size={9} /> Laporan Manual</>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${sev.bg} ${sev.text}`}>
              {sev.label}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
              <X size={18} className="text-surface-400" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-surface-900 overflow-hidden" style={{ minHeight: 200 }}>
          {hasRealImage ? (
            <img
              src={report.image_url}
              alt="Road damage"
              className="w-full object-cover"
              style={{ maxHeight: 260 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full flex flex-col items-center justify-center gap-3 bg-surface-800"
              style={{ minHeight: 200 }}
            >
              <Camera size={36} className="text-surface-500" />
              {imgError && report.image_url ? (
                <>
                  <p className="text-surface-400 text-xs">Gambar tidak dapat dimuat langsung</p>
                  <a
                    href={report.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Buka Foto Scan
                  </a>
                </>
              ) : (
                <p className="text-surface-500 text-xs">Tidak ada foto tersimpan</p>
              )}
            </div>
          )}

          {/* AI badge */}
          {report.ai_confidence && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg">
              <Cpu size={12} />
              <span className="text-[11px] font-semibold">AI Conf: {report.ai_confidence}%</span>
            </div>
          )}

          {/* Source badge */}
          {report.source === 'ai_scanner' && (
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-600/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
              <Wifi size={10} />
              <span className="text-[10px] font-bold">AI SCANNER</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          {/* GPS Coordinates — prominent */}
          <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
            <p className="text-[9px] text-surface-400 uppercase tracking-wider font-bold mb-1.5">📍 Koordinat GPS</p>
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm font-semibold text-surface-800">
                {lat}, {lng}
              </p>
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={11} /> Maps
                </a>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaItem
              icon={<Clock size={13} />}
              label="Waktu Scan"
              value={scannedAt}
            />
            <MetaItem
              icon={<Camera size={13} />}
              label="Jarak"
              value={`${report.distance_meter ?? 0} m`}
            />
          </div>

          {/* Confidence bar */}
          {report.ai_confidence && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-surface-400 font-semibold">Confidence AI</p>
                <p className="text-[10px] font-bold text-surface-700">{report.ai_confidence}%</p>
              </div>
              <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${sev.bar}`}
                  style={{ width: `${report.ai_confidence}%`, transition: 'width 0.6s ease' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface-50 border-t border-surface-200">
          <div className="text-xs text-surface-400">
            <span className="font-medium text-surface-500">{report.quarter_period || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <MapPin size={12} />
            <span>{lat}, {lng}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── ASSET MODAL ─────────────── */
function AssetModal({ report, onClose }) {
  const [imgError, setImgError] = useState(false);

  const assetType = report.asset_type || 'Lainnya';
  const cfg = ASSET_TYPE_CONFIG[assetType] || { icon: '📦', color: '#94A3B8' };
  const cond = CONDITION_STYLES[report.condition] || CONDITION_STYLES['Baik'];

  const hasRealImage = Boolean(report.image_url) && !imgError;

  const lat = report.lat != null ? Number(report.lat).toFixed(6) : '—';
  const lng = report.lng != null ? Number(report.lng).toFixed(6) : '—';

  const scannedAt = report.scanned_at
    ? new Date(report.scanned_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

  const gmapsUrl = report.lat && report.lng
    ? `https://maps.google.com/?q=${lat},${lng}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                 style={{ backgroundColor: cfg.color + '22', border: `1.5px solid ${cfg.color}44` }}>
              {cfg.icon}
            </div>
            <div>
              <h3 className="text-sm font-bold text-surface-800">{assetType}</h3>
              <p className="text-[10px] text-surface-400 flex items-center gap-1">
                <Cpu size={9} className="text-blue-500" /> AI Asset Detection
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${cond.bg} ${cond.text}`}>
              {report.condition || 'Tidak Diketahui'}
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 transition-colors cursor-pointer">
              <X size={18} className="text-surface-400" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className="relative bg-surface-900 overflow-hidden" style={{ minHeight: 200 }}>
          {hasRealImage ? (
            <img
              src={report.image_url}
              alt={assetType}
              className="w-full object-cover"
              style={{ maxHeight: 260 }}
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full flex flex-col items-center justify-center gap-3 bg-surface-800"
              style={{ minHeight: 200 }}
            >
              <Camera size={36} className="text-surface-500" />
              {imgError && report.image_url ? (
                <>
                  <p className="text-surface-400 text-xs">Gambar tidak dapat dimuat langsung</p>
                  <a
                    href={report.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <ExternalLink size={12} /> Buka Foto Scan
                  </a>
                </>
              ) : (
                <p className="text-surface-500 text-xs">Tidak ada foto tersimpan</p>
              )}
            </div>
          )}

          {report.ai_confidence && (
            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm text-white px-2.5 py-1 rounded-lg">
              <Cpu size={12} />
              <span className="text-[11px] font-semibold">AI Conf: {report.ai_confidence}%</span>
            </div>
          )}

          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-blue-600/80 backdrop-blur-sm text-white px-2 py-1 rounded-lg">
            <Package size={10} />
            <span className="text-[10px] font-bold">ASET TERDEKSI</span>
          </div>
        </div>

        {/* Details */}
        <div className="px-5 py-4 space-y-3">
          {/* GPS Coordinates */}
          <div className="bg-surface-50 rounded-xl p-3 border border-surface-200">
            <p className="text-[9px] text-surface-400 uppercase tracking-wider font-bold mb-1.5">📍 Koordinat GPS</p>
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm font-semibold text-surface-800">
                {lat}, {lng}
              </p>
              {gmapsUrl && (
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-600 font-semibold hover:underline"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink size={11} /> Maps
                </a>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <MetaItem icon={<Clock size={13} />} label="Waktu Scan" value={scannedAt} />
            <MetaItem
              icon={<Package size={13} />}
              label="Kondisi"
              value={report.condition || '—'}
            />
          </div>

          {/* Confidence bar */}
          {report.ai_confidence && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-surface-400 font-semibold">Confidence AI</p>
                <p className="text-[10px] font-bold text-surface-700">{report.ai_confidence}%</p>
              </div>
              <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{ width: `${report.ai_confidence}%`, transition: 'width 0.6s ease' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-surface-50 border-t border-surface-200">
          <div className="text-xs text-surface-400">
            Ruas: <span className="font-medium text-surface-600">{report.toll_road_id || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <MapPin size={12} />
            <span>{lat}, {lng}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────── Helper ─────────────── */
function MetaItem({ icon, label, value }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-surface-400 mt-0.5">{icon}</span>
      <div>
        <p className="text-surface-400">{label}</p>
        <p className="font-semibold text-surface-700">{value}</p>
      </div>
    </div>
  );
}
