"""
spm_mapper.py — JICA Toll Road Standard Performance Measurement (SPM) mapping.

Maps canonical damage classes → SPM indicator codes + recommended maintenance actions.

Based on:
  - JICA Toll Road Asset Management Guidelines (AMS, e-SPM, SPM fulfillment)
  - Bina Marga Road Damage Classification
  - Indonesian Toll Road Standards (SPM Jalan Tol, PP No. 15/2005 jo. PP No. 43/2013)

SPM Fulfillment Levels:
  Level 1 (Memuaskan) : No defects visible, IRI < 2.5 m/km
  Level 2 (Baik)      : Minor defects, IRI 2.5–4.0 m/km
  Level 3 (Sedang)    : Moderate defects, IRI 4.0–6.0 m/km — requires attention
  Level 4 (Buruk)     : Severe defects, IRI > 6.0 m/km — requires immediate repair
"""

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SPMInfo:
    code: str          # e.g. "C-4"
    name_id: str       # Indonesian: e.g. "Lubang"
    name_en: str       # English: e.g. "Pothole"
    category: str      # "surface" | "structural" | "drainage" | "edge"
    priority: int      # 1 (highest urgency) – 5 (lowest)


# ---------------------------------------------------------------------------
# SPM indicator catalog (JICA standard, adapted for Indonesian toll roads)
# ---------------------------------------------------------------------------

SPM_CATALOG: dict[str, SPMInfo] = {
    "longitudinal_crack": SPMInfo(
        code="C-1", name_id="Retak Memanjang", name_en="Longitudinal Crack",
        category="surface", priority=3,
    ),
    "transverse_crack": SPMInfo(
        code="C-2", name_id="Retak Melintang", name_en="Transverse Crack",
        category="surface", priority=3,
    ),
    "alligator_crack": SPMInfo(
        code="C-3", name_id="Retak Buaya", name_en="Alligator / Fatigue Crack",
        category="structural", priority=2,
    ),
    "pothole": SPMInfo(
        code="C-4", name_id="Lubang", name_en="Pothole",
        category="surface", priority=1,
    ),
    "rutting": SPMInfo(
        code="C-5", name_id="Alur", name_en="Rutting",
        category="structural", priority=2,
    ),
    "patching": SPMInfo(
        code="C-6", name_id="Tambalan", name_en="Patching / Repair Area",
        category="surface", priority=4,
    ),
    "raveling": SPMInfo(
        code="C-7", name_id="Pelepasan Butir", name_en="Raveling / Surface Deterioration",
        category="surface", priority=3,
    ),
    "water_ponding": SPMInfo(
        code="C-8", name_id="Genangan Air", name_en="Water Ponding",
        category="drainage", priority=2,
    ),
    "surface_depression": SPMInfo(
        code="C-9", name_id="Penurunan Permukaan", name_en="Surface Depression",
        category="structural", priority=2,
    ),
    "shoulder_crack": SPMInfo(
        code="C-10", name_id="Retak Bahu Jalan", name_en="Shoulder Crack",
        category="edge", priority=3,
    ),
    "shoulder_pothole": SPMInfo(
        code="C-11", name_id="Lubang Bahu Jalan", name_en="Shoulder Pothole",
        category="edge", priority=2,
    ),
    "hairline_crack": SPMInfo(
        code="C-1a", name_id="Retak Rambut", name_en="Hairline Crack",
        category="surface", priority=4,
    ),
    "unknown_damage": SPMInfo(
        code="C-99", name_id="Kerusakan Tidak Teridentifikasi", name_en="Unidentified Damage",
        category="surface", priority=3,
    ),
}


# ---------------------------------------------------------------------------
# Recommended action matrix  [damage_type][severity] → action
# ---------------------------------------------------------------------------

_ACTION_MATRIX: dict[str, dict[str, str]] = {
    "longitudinal_crack": {
        "low":    "Monitoring dan pencatatan berkala (inspeksi tiap 3 bulan)",
        "medium": "Pengisian celah retak (crack sealing) — segera jadwalkan",
        "high":   "Pengisian celah + overlay aspal tipis — perbaikan mendesak",
    },
    "transverse_crack": {
        "low":    "Monitoring — kemungkinan akibat penyusutan termal",
        "medium": "Crack sealing dan pemantauan kedalaman",
        "high":   "Crack sealing + overlay — koordinasi dengan tim e-SPM",
    },
    "alligator_crack": {
        "low":    "Monitoring intensif — indikasi kelelahan struktural awal",
        "medium": "Penggalian dan penggantian lapis pondasi + overlay aspal",
        "high":   "Rekonstruksi penuh (full-depth reclamation) — DARURAT",
    },
    "pothole": {
        "low":    "Penambalan dingin sementara — jadwalkan penambalan permanen",
        "medium": "Penambalan panas permanen — selesaikan dalam 7 hari",
        "high":   "Perbaikan darurat <24 jam — koordinasi PJR + unit pemeliharaan",
    },
    "rutting": {
        "low":    "Monitoring kedalaman alur (survei profil melintang)",
        "medium": "Pelapisan ulang (overlay) — cek drainase bawah perkerasan",
        "high":   "Rekonstruksi lapisan aus + base course — segera rencanakan",
    },
    "patching": {
        "low":    "Monitoring kondisi tambalan — periksa batas tepi",
        "medium": "Evaluasi integritas tambalan dan rencanakan pelapisan ulang",
        "high":   "Ganti tambalan + rekonstruksi area sekitar",
    },
    "raveling": {
        "low":    "Monitoring — aplikasi surface treatment jika berlanjut",
        "medium": "Chip seal atau micro-surfacing untuk mengembalikan tekstur",
        "high":   "Overlay aspal tipis atau slurry seal — segera",
    },
    "water_ponding": {
        "low":    "Periksa dan bersihkan saluran drainase sekitar",
        "medium": "Perbaikan kemiringan melintang + pembersihan drainase",
        "high":   "Rekonstruksi drainase + perbaikan kemiringan — PRIORITAS",
    },
    "surface_depression": {
        "low":    "Monitoring penurunan — pasang patok referensi",
        "medium": "Penggantian lapis perkerasan + investigasi tanah dasar",
        "high":   "Investigasi geoteknik + rekonstruksi — tutup lajur jika perlu",
    },
    "shoulder_crack": {
        "low":    "Monitoring tepi bahu — periksa kondisi median dan drainase",
        "medium": "Perbaikan bahu jalan + crack sealing tepi",
        "high":   "Rekonstruksi bahu + stabilisasi tepi perkerasan utama",
    },
    "shoulder_pothole": {
        "low":    "Penambalan bahu — pasang delineator peringatan",
        "medium": "Penambalan permanen bahu + periksa drainase",
        "high":   "Rekonstruksi bahu — perlambat arus lalu lintas sementara",
    },
    "hairline_crack": {
        "low":    "Monitoring — umumnya tidak memerlukan tindakan segera",
        "medium": "Aplikasi sealant preventif",
        "high":   "Investigasi lebih lanjut — mungkin indikasi crack sistemik",
    },
    "_default": {
        "low":    "Monitoring dan dokumentasi — laporkan ke supervisor",
        "medium": "Jadwalkan inspeksi mendalam dan rencanakan perbaikan",
        "high":   "Perbaikan segera — koordinasi unit pemeliharaan",
    },
}

# SPM Fulfillment level per severity
_SPM_FULFILLMENT: dict[str, str] = {
    "low":    "Level 2 (Baik)",
    "medium": "Level 3 (Sedang) — perlu perhatian",
    "high":   "Level 4 (Buruk) — perlu perbaikan segera",
}

# AMS deterioration trend flag
_DETERIORATION_FLAG: dict[str, str] = {
    "pothole":           "rapid",    # deteriorates fast if untreated
    "alligator_crack":   "rapid",
    "water_ponding":     "rapid",
    "rutting":           "moderate",
    "surface_depression":"moderate",
    "shoulder_pothole":  "moderate",
    "longitudinal_crack":"slow",
    "transverse_crack":  "slow",
    "raveling":          "slow",
    "shoulder_crack":    "slow",
    "patching":          "stable",
    "hairline_crack":    "stable",
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_spm_info(class_name: str) -> SPMInfo:
    return SPM_CATALOG.get(class_name, SPM_CATALOG["unknown_damage"])


def get_recommended_action(class_name: str, severity: Optional[str]) -> str:
    sev = (severity or "low").lower()
    actions = _ACTION_MATRIX.get(class_name, _ACTION_MATRIX["_default"])
    return actions.get(sev, actions.get("medium", "Laporkan ke supervisor"))


def get_spm_fulfillment(severity: Optional[str]) -> str:
    sev = (severity or "low").lower()
    return _SPM_FULFILLMENT.get(sev, "Level 2 (Baik)")


def get_deterioration_flag(class_name: str) -> str:
    return _DETERIORATION_FLAG.get(class_name, "moderate")


def map_finding(class_name: str, severity: Optional[str]) -> dict:
    """
    Return complete SPM + action mapping for a single finding.
    Convenience wrapper used by pipeline and findings_service.
    """
    info = get_spm_info(class_name)
    return {
        "spm_indicator":     info.code,
        "spm_name":          info.name_id,
        "spm_category":      info.category,
        "spm_priority":      info.priority,
        "spm_fulfillment":   get_spm_fulfillment(severity),
        "recommended_action": get_recommended_action(class_name, severity),
        "deterioration_flag": get_deterioration_flag(class_name),
    }
