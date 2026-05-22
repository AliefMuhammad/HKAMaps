"""
class_mapping.py — canonical class taxonomy for road damage detection.

RDD2022 standard codes (Japanese Road Damage Dataset 2022):
  D00  Longitudinal Crack   — cracks parallel to road axis
  D10  Transverse Crack     — cracks perpendicular to road axis
  D20  Alligator Crack      — fatigue/mesh cracking
  D40  Pothole              — surface deformation / rutting / potholes

Extended classes (JICA AMS + Indonesian toll road SPM):
  D50  Patching             — existing repair area
  D60  Raveling             — surface wear / pelepasan butir
  D70  Water Ponding        — genangan air di permukaan
  D80  Rutting              — alur roda
  D81  Surface Depression   — penurunan permukaan
  D90  Shoulder Crack       — retak bahu jalan
  D91  Shoulder Pothole     — lubang bahu jalan

NOTE: The previous vision_service.py had D10/D20/D40 mapped incorrectly.
This file contains the authoritative, corrected mapping used by all pipeline stages.
"""

# ---------------------------------------------------------------------------
# RDD2022 code → (canonical_class_name, class_code, readable_label)
# ---------------------------------------------------------------------------

RDD_CODE_TO_CLASS: dict[str, tuple[str, str, str]] = {
    # Standard RDD2022
    "D00":    ("longitudinal_crack",  "D00", "Longitudinal Crack"),
    "D10":    ("transverse_crack",    "D10", "Transverse Crack"),
    "D20":    ("alligator_crack",     "D20", "Alligator Crack"),
    "D40":    ("pothole",             "D40", "Pothole"),

    # Extended sub-type codes
    "D01":    ("longitudinal_crack",  "D00", "Longitudinal Crack"),
    "D11":    ("transverse_crack",    "D10", "Transverse Crack"),
    "D43":    ("pothole",             "D40", "Pothole"),
    "D44":    ("pothole",             "D40", "Pothole"),

    # Repair / patching
    "Repair": ("patching",            "D50", "Repair / Patching"),
    "repair": ("patching",            "D50", "Repair / Patching"),
    "D50":    ("patching",            "D50", "Repair / Patching"),

    # Extended JICA classes
    "D60":    ("raveling",            "D60", "Raveling / Surface Deterioration"),
    "D70":    ("water_ponding",       "D70", "Water Ponding"),
    "D80":    ("rutting",             "D80", "Rutting"),
    "D81":    ("surface_depression",  "D81", "Surface Depression"),
    "D90":    ("shoulder_crack",      "D90", "Shoulder Crack"),
    "D91":    ("shoulder_pothole",    "D91", "Shoulder Pothole"),
}

# Human-readable labels (Indonesian + English) for every canonical class
CLASS_LABELS: dict[str, str] = {
    "longitudinal_crack":  "Retak Memanjang (Longitudinal Crack)",
    "transverse_crack":    "Retak Melintang (Transverse Crack)",
    "alligator_crack":     "Retak Buaya (Alligator Crack)",
    "pothole":             "Lubang (Pothole)",
    "patching":            "Tambalan (Repair / Patching)",
    "raveling":            "Pelepasan Butir (Raveling)",
    "water_ponding":       "Genangan Air (Water Ponding)",
    "rutting":             "Alur (Rutting)",
    "surface_depression":  "Penurunan Permukaan (Surface Depression)",
    "shoulder_crack":      "Retak Bahu Jalan (Shoulder Crack)",
    "shoulder_pothole":    "Lubang Bahu Jalan (Shoulder Pothole)",
    "hairline_crack":      "Retak Rambut (Hairline Crack)",
    "unknown_damage":      "Kerusakan Tidak Teridentifikasi",
}

# English-only labels for API responses
CLASS_LABELS_EN: dict[str, str] = {
    "longitudinal_crack":  "Longitudinal Crack",
    "transverse_crack":    "Transverse Crack",
    "alligator_crack":     "Alligator Crack",
    "pothole":             "Pothole",
    "patching":            "Repair / Patching",
    "raveling":            "Raveling / Surface Deterioration",
    "water_ponding":       "Water Ponding",
    "rutting":             "Rutting",
    "surface_depression":  "Surface Depression",
    "shoulder_crack":      "Shoulder Crack",
    "shoulder_pothole":    "Shoulder Pothole",
    "hairline_crack":      "Hairline Crack",
    "unknown_damage":      "Unknown Road Damage",
}

# RDD class codes for canonical classes
CLASS_CODES: dict[str, str] = {
    "longitudinal_crack":  "D00",
    "transverse_crack":    "D10",
    "alligator_crack":     "D20",
    "pothole":             "D40",
    "patching":            "D50",
    "raveling":            "D60",
    "water_ponding":       "D70",
    "rutting":             "D80",
    "surface_depression":  "D81",
    "shoulder_crack":      "D90",
    "shoulder_pothole":    "D91",
    "hairline_crack":      "D00",
    "unknown_damage":      "D99",
}

# Classes that are road defects (vs infrastructure assets)
ROAD_DEFECT_CLASSES: frozenset[str] = frozenset({
    "pothole", "longitudinal_crack", "transverse_crack", "alligator_crack",
    "hairline_crack", "patching", "rutting", "surface_depression",
    "raveling", "water_ponding", "shoulder_crack", "shoulder_pothole",
    "unknown_damage",
    # raw RDD codes
    "D00", "D01", "D10", "D11", "D20", "D40", "D43", "D44", "D50",
    "D60", "D70", "D80", "D81", "D90", "D91",
    # common string variants
    "crack", "longitudinal-crack", "transverse-crack", "alligator-crack",
    # Roboflow Indonesian dataset class names
    "alligator_cracking", "lateral_cracking", "longitudinal_cracking",
    # Zero-shot labels
    "surface raveling", "pavement raveling", "water ponding on road",
    "road surface rutting", "road shoulder crack", "shoulder pothole",
    "asphalt patch", "road repair patch",
})

ASSET_CLASSES: frozenset[str] = frozenset({
    "concrete_barrier", "guardrail", "barrier",
    "traffic_sign", "direction_sign", "highway_sign", "overhead_sign", "warning_sign",
    "street_light", "utility_pole",
    "billboard", "videotron",
    "road_marking", "gantry", "cctv_pole", "delineator",
    "sign", "streetlight", "lamp", "cctv", "camera",
    "toll_gantry", "street-light",
})

# ---------------------------------------------------------------------------
# Zero-shot label → (canonical_class, category)
# ---------------------------------------------------------------------------
ZERO_SHOT_LABEL_MAP: dict[str, tuple[str, str]] = {
    # --- Road damage (new extended labels) ---
    "surface raveling":            ("raveling",        "road_defect"),
    "pavement raveling":           ("raveling",        "road_defect"),
    "asphalt deterioration":       ("raveling",        "road_defect"),
    "road surface deterioration":  ("raveling",        "road_defect"),
    "pavement surface damage":     ("raveling",        "road_defect"),
    "aggregate loss":              ("raveling",        "road_defect"),
    "water ponding on road":       ("water_ponding",   "road_defect"),
    "road surface water":          ("water_ponding",   "road_defect"),
    "standing water on road":      ("water_ponding",   "road_defect"),
    "road flooding":               ("water_ponding",   "road_defect"),
    "road surface rutting":        ("rutting",         "road_defect"),
    "wheel track depression":      ("rutting",         "road_defect"),
    "pavement rutting":            ("rutting",         "road_defect"),
    "road groove":                 ("rutting",         "road_defect"),
    "asphalt patch":               ("patching",        "road_defect"),
    "road repair patch":           ("patching",        "road_defect"),
    "road shoulder crack":         ("shoulder_crack",  "road_defect"),
    "road edge crack":             ("shoulder_crack",  "road_defect"),
    "shoulder crack":              ("shoulder_crack",  "road_defect"),
    "road margin crack":           ("shoulder_crack",  "road_defect"),
    "shoulder pothole":            ("shoulder_pothole","road_defect"),
    "road edge pothole":           ("shoulder_pothole","road_defect"),
    "road margin pothole":         ("shoulder_pothole","road_defect"),

    # --- Infrastructure assets ---
    "guardrail":              ("guardrail",        "asset"),
    "concrete barrier":       ("concrete_barrier", "asset"),
    "jersey barrier":         ("concrete_barrier", "asset"),
    "traffic sign":           ("traffic_sign",     "asset"),
    "road sign":              ("traffic_sign",     "asset"),
    "direction sign":         ("direction_sign",   "asset"),
    "highway sign":           ("direction_sign",   "asset"),
    "overhead road sign":     ("direction_sign",   "asset"),
    "green road sign":        ("direction_sign",   "asset"),
    "blue road sign":         ("direction_sign",   "asset"),
    "overhead gantry":        ("gantry",           "asset"),
    "sign bridge":            ("gantry",           "asset"),
    "toll gantry":            ("gantry",           "asset"),
    "street light":           ("street_light",     "asset"),
    "lamp post":              ("street_light",     "asset"),
    "light pole":             ("street_light",     "asset"),
    "street lamp":            ("street_light",     "asset"),
    "utility pole":           ("utility_pole",     "asset"),
    "power pole":             ("utility_pole",     "asset"),
    "electricity pole":       ("utility_pole",     "asset"),
    "electric pole":          ("utility_pole",     "asset"),
    "telephone pole":         ("utility_pole",     "asset"),
    "power line pole":        ("utility_pole",     "asset"),
    "chevron board":          ("warning_sign",     "asset"),
    "road chevron":           ("warning_sign",     "asset"),
    "road marker board":      ("warning_sign",     "asset"),
    "warning sign":           ("warning_sign",     "asset"),
    "chevron sign":           ("warning_sign",     "asset"),
    "road warning sign":      ("warning_sign",     "asset"),
    "hazard sign":            ("warning_sign",     "asset"),
    "yellow sign":            ("warning_sign",     "asset"),
    "billboard":              ("billboard",        "asset"),
    "advertisement board":    ("billboard",        "asset"),
    "digital billboard":      ("videotron",        "asset"),
    "LED display":            ("videotron",        "asset"),
    "videotron":              ("videotron",        "asset"),
    "digital sign":           ("videotron",        "asset"),
    "cctv camera":            ("cctv_pole",        "asset"),
    "surveillance camera":    ("cctv_pole",        "asset"),
    "delineator":             ("delineator",       "asset"),
    "road marking":           ("road_marking",     "asset"),
    "road stud":              ("delineator",       "asset"),
}

# COCO pretrained class → (canonical, category)
COCO_ASSET_MAP: dict[str, tuple[str, str]] = {
    "traffic light": ("traffic_sign", "asset"),
    "stop sign":     ("traffic_sign", "asset"),
}

# COCO classes that indicate a False Positive when overlapping damage bbox
# (used by RTDETRFPFilter in detector.py)
COCO_VEHICLE_PERSON_CLASSES: frozenset[str] = frozenset({
    "person", "bicycle", "car", "motorcycle", "bus", "truck", "train",
    "traffic light", "fire hydrant", "stop sign",
})

# BGR colours for bounding-box drawing
BBOX_COLORS: dict[str, tuple[int, int, int]] = {
    "road_defect": (0,  60, 220),
    "asset":       (0, 165, 255),
    "unknown":     (120, 120, 120),
}

# Per-class bbox colors for damage type differentiation
DAMAGE_CLASS_COLORS: dict[str, tuple[int, int, int]] = {
    "pothole":            (0,   0, 255),    # red
    "alligator_crack":    (0,  30, 200),    # dark red
    "rutting":            (20,  0, 180),    # deep red
    "water_ponding":      (200, 100, 0),    # blue-ish
    "longitudinal_crack": (0,  80, 255),    # red-orange
    "transverse_crack":   (0, 100, 255),    # orange-red
    "hairline_crack":     (0, 140, 255),    # amber
    "shoulder_crack":     (0,  50, 220),    # dark red-orange
    "shoulder_pothole":   (0,  20, 200),    # darker red
    "raveling":           (60, 60, 200),    # medium red
    "patching":           (0, 200, 200),    # teal
    "surface_depression": (0,  60, 180),    # brownish red
}

# Severity colour overlay (mask fill)
SEVERITY_COLORS_BGR: dict[str, tuple[int, int, int]] = {
    "high":   (0,   0, 220),
    "medium": (0, 140, 255),
    "low":    (0, 200, 100),
}


# ---------------------------------------------------------------------------
# Normalisation helper
# ---------------------------------------------------------------------------

def normalise_class(raw: str) -> tuple[str, str]:
    """
    Return (canonical_class_name, category) for any raw model output string.
    Handles RDD codes, common English names, Indonesian names, zero-shot labels,
    COCO class names, and fallbacks.
    """
    if not raw:
        return "unknown_damage", "road_defect"

    # RDD code exact match
    if raw in RDD_CODE_TO_CLASS:
        cls_name, _, _ = RDD_CODE_TO_CLASS[raw]
        return cls_name, "road_defect"

    # Zero-shot label exact match
    if raw in ZERO_SHOT_LABEL_MAP:
        return ZERO_SHOT_LABEL_MAP[raw]

    n = raw.lower().replace("-", "_").replace(" ", "_")

    # Road defect keywords — specific first
    if "shoulder" in n and "pothole" in n:     return "shoulder_pothole",    "road_defect"
    if "shoulder" in n and "crack" in n:       return "shoulder_crack",      "road_defect"
    if "shoulder" in n and "edge" in n:        return "shoulder_crack",      "road_defect"
    if "water" in n and ("pond" in n or "flood" in n or "standing" in n):
                                               return "water_ponding",       "road_defect"
    if "ponding" in n or "flooding" in n:      return "water_ponding",       "road_defect"
    if "ravel" in n or "aggregate_loss" in n:  return "raveling",            "road_defect"
    if "pothole" in n:                         return "pothole",             "road_defect"
    if "alligator" in n:                       return "alligator_crack",     "road_defect"
    if "longitudinal" in n:                    return "longitudinal_crack",  "road_defect"
    if "transverse" in n or "lateral" in n:    return "transverse_crack",    "road_defect"
    if "hairline" in n:                        return "hairline_crack",      "road_defect"
    if "patching" in n or "patch" in n or "repair" in n:
                                               return "patching",            "road_defect"
    if "rutting" in n or "rut" in n or "groove" in n:
                                               return "rutting",             "road_defect"
    if "depression" in n or "subsidence" in n: return "surface_depression",  "road_defect"
    if "crack" in n:                           return "longitudinal_crack",  "road_defect"

    # Signs — specific types first
    if "highway_sign" in n or "overhead_sign" in n or "overhead_road" in n:
        return "direction_sign", "asset"
    if "direction_sign" in n or "direction" in n: return "direction_sign", "asset"
    if "highway" in n and "sign" in n:             return "direction_sign", "asset"
    if "green_road" in n or "blue_road" in n:      return "direction_sign", "asset"
    if "traffic_sign" in n or "road_sign" in n:    return "traffic_sign",   "asset"
    if "sign_bridge" in n:                         return "gantry",         "asset"

    # Lighting
    if "street_light" in n or "streetlight" in n or n == "lamp":
        return "street_light", "asset"
    if "lamp_post" in n or "light_pole" in n or "street_lamp" in n:
        return "street_light", "asset"

    # Poles
    if "utility_pole" in n or "power_pole" in n or "power_line_pole" in n:
        return "utility_pole", "asset"
    if "electricity_pole" in n or "electric_pole" in n or "telephone_pole" in n:
        return "utility_pole", "asset"

    # Warning signs
    if "warning_sign" in n or "warning" in n or "chevron" in n or "hazard_sign" in n:
        return "warning_sign", "asset"

    # Barriers
    if "guardrail" in n:                return "guardrail",        "asset"
    if "barrier" in n or "jersey" in n: return "concrete_barrier", "asset"

    # Screens
    if "billboard" in n or "advertisement" in n: return "billboard", "asset"
    if "videotron" in n or "led_display" in n or "digital_billboard" in n or "digital_sign" in n:
        return "videotron", "asset"

    # Other infrastructure
    if "cctv" in n or "camera" in n or "surveillance" in n: return "cctv_pole",    "asset"
    if "gantry" in n or "toll_gantry" in n:                 return "gantry",       "asset"
    if "delineator" in n or "road_stud" in n:               return "delineator",   "asset"
    if "marking" in n:                                       return "road_marking", "asset"
    if "sign" in n:                                          return "traffic_sign", "asset"

    # COCO fallback
    if raw in COCO_ASSET_MAP:
        return COCO_ASSET_MAP[raw]

    return raw, "unknown"


def get_class_code(canonical_name: str) -> str:
    return CLASS_CODES.get(canonical_name, "D99")


def get_class_label(canonical_name: str, lang: str = "id") -> str:
    if lang == "en":
        return CLASS_LABELS_EN.get(canonical_name, canonical_name.replace("_", " ").title())
    return CLASS_LABELS.get(canonical_name, canonical_name.replace("_", " ").title())


def get_damage_color(class_name: str) -> tuple[int, int, int]:
    return DAMAGE_CLASS_COLORS.get(class_name, BBOX_COLORS["road_defect"])
