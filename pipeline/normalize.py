"""
Salt composition normalization for Indian medicine matching.

Canonical key = sorted, normalized salts with standardized strengths,
tagged by dosage form and release type. Two brands match IFF they share
the same canonical key.
"""

import re
from typing import Optional

# ── Spelling variants (Indian pharmacopeia → INN standard) ──────────────
SPELLING_MAP: dict[str, str] = {
    "amoxycillin": "amoxicillin",
    "ampicillin": "ampicillin",
    "cephalexin": "cefalexin",
    "cephadroxil": "cefadroxil",
    "chlorpheniramine": "chlorphenamine",
    "cloxacillin": "cloxacillin",
    "dicloxacillin": "dicloxacillin",
    "frusemide": "furosemide",
    "lignocaine": "lidocaine",
    "metformine": "metformin",
    "norfloxacine": "norfloxacin",
    "ofloxacine": "ofloxacin",
    "paracetamol": "paracetamol",  # keep — WHO INN
    "phenobarbitone": "phenobarbital",
    "prednisolone": "prednisolone",
    "ranitidine": "ranitidine",
    "rifampicine": "rifampicin",
    "sulphadiazine": "sulfadiazine",
    "sulphamethoxazole": "sulfamethoxazole",
    "sulphasalazine": "sulfasalazine",
    "tetracycline": "tetracycline",
    "thiopentone": "thiopental",
    "adrenaline": "epinephrine",
    "noradrenaline": "norepinephrine",
    "methyldopa": "methyldopa",
    "dextropropoxyphene": "dextropropoxyphene",
    "bendrofluazide": "bendroflumethiazide",
    "chlorthalidone": "chlortalidone",
    "cyclopentolate": "cyclopentolate",
    "glyceryl trinitrate": "nitroglycerin",
    "hydroxychloroquine": "hydroxychloroquine",
    "isoprenaline": "isoproterenol",
    "pethidine": "meperidine",
    "salbutamol": "albuterol",
    "trimethoprime": "trimethoprim",
}

# ── Narrow Therapeutic Index drugs ──────────────────────────────────────
# Matched as SUBSTRINGS of the normalized salt name (see is_nti), because the
# source dataset spells these many different ways (e.g. Levothyroxine appears
# as "Thyroxine"). Keep entries as short, distinctive stems.
NTI_SALTS: set[str] = {
    "warfarin",
    "acenocoumarol",
    "phenytoin",
    "fosphenytoin",
    "lithium",
    "levothyroxine",
    "thyroxine",
    "liothyronine",
    "cyclosporine",
    "ciclosporin",
    "cyclosporin",
    "digoxin",
    "carbamazepine",
    "valproic acid",
    "valproate",
    "divalproex",
    "theophylline",
    "aminophylline",
    "tacrolimus",
    "sirolimus",
    "everolimus",
    "mycophenolate",
    "mycophenolic acid",
    "clonidine",
    "procainamide",
    "disopyramide",
    "quinidine",
}

# ── Unit conversion to base (mg) ───────────────────────────────────────
UNIT_TO_MG: dict[str, float] = {
    "g": 1000.0,
    "gm": 1000.0,
    "gram": 1000.0,
    "grams": 1000.0,
    "kg": 1_000_000.0,
    "mg": 1.0,
    "mcg": 0.001,
    "ug": 0.001,
    "microgram": 0.001,
    "micrograms": 0.001,
    "ml": 1.0,  # for liquids, keep as-is in mg-equiv
    "iu": 1.0,  # international units — no conversion, keep numeric
    "unit": 1.0,
    "units": 1.0,
    "meq": 1.0,
    "%": 1.0,   # percentage — keep numeric
    "w/v": 1.0,
    "w/w": 1.0,
}

# ── Release type keywords ──────────────────────────────────────────────
RELEASE_PATTERNS: list[tuple[str, str]] = [
    (r"\b(?:sr|sustained[- ]?release)\b", "SR"),
    (r"\b(?:xr|extended[- ]?release|er)\b", "XR"),
    (r"\b(?:cr|controlled[- ]?release)\b", "CR"),
    (r"\b(?:mr|modified[- ]?release)\b", "MR"),
    (r"\b(?:dr|delayed[- ]?release|enteric[- ]?coated|ec)\b", "DR"),
    (r"\b(?:la|long[- ]?acting)\b", "LA"),
    (r"\b(?:xl)\b", "XL"),
    (r"\bretard\b", "SR"),
]

# ── Dosage form keywords ──────────────────────────────────────────────
FORM_PATTERNS: list[tuple[str, str]] = [
    (r"\b(?:tablet|tab)\b", "tablet"),
    (r"\b(?:capsule|cap)\b", "capsule"),
    (r"\b(?:syrup|suspension|liquid|solution|oral solution|drops)\b", "liquid"),
    (r"\b(?:injection|inj|vial|ampoule)\b", "injection"),
    (r"\b(?:cream|ointment|gel|lotion|topical)\b", "topical"),
    (r"\b(?:inhaler|respule|rotacap|nebulisation)\b", "inhaler"),
    (r"\b(?:eye drop|ear drop|nasal drop|ophthalmic)\b", "drops"),
    (r"\b(?:suppository|pessary)\b", "suppository"),
    (r"\b(?:patch|transdermal)\b", "patch"),
    (r"\b(?:powder|sachet|granule)\b", "powder"),
    (r"\b(?:spray|nasal spray)\b", "spray"),
    (r"\b(?:mouth ?wash|gargle)\b", "mouthwash"),
    (r"\b(?:lozenge|pastille)\b", "lozenge"),
    (r"\b(?:chewable)\b", "chewable"),
    (r"\b(?:effervescent)\b", "effervescent"),
    (r"\b(?:dry syrup|dry suspension)\b", "dry_syrup"),
    (r"\b(?:respules?)\b", "respule"),
]


def normalize_spelling(salt: str) -> str:
    """Normalize Indian pharmacopeia spelling to INN standard."""
    lower = salt.strip().lower()
    return SPELLING_MAP.get(lower, lower)


def standardize_strength(text: str) -> str:
    """
    Convert strength to canonical mg form.
    '0.5g' → '500mg', '250mcg' → '0.25mg', '10%' → '10%'
    """
    # Match number + optional space + unit
    pattern = r"(\d+\.?\d*)\s*(g|gm|gram|grams|kg|mg|mcg|ug|microgram|micrograms|ml|iu|units?|meq|%|w/v|w/w)\b"
    
    def replace_unit(m: re.Match) -> str:
        value = float(m.group(1))
        unit = m.group(2).lower()
        
        # Don't convert percentages, IU, mEq — just normalize the unit text
        if unit in ("%", "w/v", "w/w"):
            return f"{m.group(1)}%"
        if unit in ("iu",):
            return f"{m.group(1)}IU"
        if unit in ("meq",):
            return f"{m.group(1)}mEq"
        if unit in ("ml",):
            return f"{m.group(1)}ml"
        if unit in ("units", "unit"):
            return f"{m.group(1)}units"
        
        factor = UNIT_TO_MG.get(unit, 1.0)
        mg_value = value * factor
        
        # Clean up: 500.0 → 500, 0.25 stays 0.25
        if mg_value == int(mg_value):
            return f"{int(mg_value)}mg"
        return f"{mg_value}mg"
    
    return re.sub(pattern, replace_unit, text, flags=re.IGNORECASE)


def extract_release_type(text: str) -> Optional[str]:
    """Extract release type from medicine name or salt composition."""
    lower = text.lower()
    for pattern, release in RELEASE_PATTERNS:
        if re.search(pattern, lower):
            return release
    return None


def extract_dosage_form(text: str) -> Optional[str]:
    """Extract dosage form from medicine name."""
    lower = text.lower()
    for pattern, form in FORM_PATTERNS:
        if re.search(pattern, lower):
            return form
    return None


def parse_salt_composition(raw: str) -> list[tuple[str, str]]:
    """
    Parse a salt composition string into list of (salt_name, strength).
    
    Input formats:
      "Amoxycillin (250mg) + Clavulanic Acid (125mg)"
      "Paracetamol 500mg + Caffeine 65mg"
      "Metformin Hydrochloride IP 500mg"
      "Amlodipine (5mg)"
    
    Returns sorted list of (normalized_salt, standardized_strength).
    """
    if not raw or raw.strip().lower() in ("na", "nan", "", "-", "not available"):
        return []
    
    # Split on + (the standard separator in the dataset)
    parts = re.split(r"\s*\+\s*", raw.strip())
    
    salts: list[tuple[str, str]] = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        
        # Extract strength in parentheses: "Amoxicillin (250mg)"
        paren_match = re.search(r"\(([^)]+)\)", part)
        if paren_match:
            strength_raw = paren_match.group(1).strip()
            salt_name = re.sub(r"\s*\([^)]+\)\s*", " ", part).strip()
        else:
            # Try to extract trailing strength: "Paracetamol 500mg"
            trailing = re.search(
                r"(\d+\.?\d*\s*(?:g|gm|mg|mcg|ug|ml|iu|units?|meq|%|w/v|w/w)\b.*?)$",
                part, re.IGNORECASE
            )
            if trailing:
                strength_raw = trailing.group(1).strip()
                salt_name = part[:trailing.start()].strip()
            else:
                strength_raw = ""
                salt_name = part
        
        # Remove IP/BP/USP suffixes
        salt_name = re.sub(r"\b(?:IP|BP|USP|Ph\.?\s*Eur\.?|NF)\b", "", salt_name, flags=re.IGNORECASE).strip()
        # Remove trailing punctuation
        salt_name = salt_name.rstrip(" ,;:-")
        
        if not salt_name:
            continue
        
        normalized_name = normalize_spelling(salt_name)
        standardized_str = standardize_strength(strength_raw) if strength_raw else ""
        
        salts.append((normalized_name, standardized_str))
    
    # Sort alphabetically by salt name for canonical ordering
    salts.sort(key=lambda x: x[0])
    return salts


def build_canonical_key(
    salts: list[tuple[str, str]],
    dosage_form: Optional[str] = None,
    release_type: Optional[str] = None,
) -> str:
    """
    Build a canonical key from parsed salts + form + release type.
    
    Key format: "salt1:strength1+salt2:strength2|form|release"
    """
    if not salts:
        return ""
    
    salt_parts = []
    for name, strength in salts:
        if strength:
            salt_parts.append(f"{name}:{strength}")
        else:
            salt_parts.append(name)
    
    key = "+".join(salt_parts)
    
    if dosage_form:
        key += f"|{dosage_form}"
    if release_type:
        key += f"|{release_type}"
    
    return key


def is_nti(salts: list[tuple[str, str]]) -> bool:
    """Check if any salt in the composition is a Narrow Therapeutic Index drug.

    Uses substring matching against normalized salt names, since the source
    dataset spells the same active many different ways (e.g. "Thyroxine",
    "Divalproex Sodium", "Fosphenytoin Sodium") and exact-set matching missed
    the majority of real NTI rows in the shipped dataset.
    """
    for name, _ in salts:
        for nti in NTI_SALTS:
            if nti in name:
                return True
    return False


def parse_pack_size(pack_size_str: str) -> Optional[float]:
    """
    Parse pack size string to get number of units.

    The real dataset format is "strip of 10 tablets", "bottle of 100 ml Syrup",
    "vial of 1 Injection", etc — the number does not lead the string, so this
    searches anywhere in the text rather than anchoring at position 0.

    Examples:
      "strip of 10 tablets" → 10
      "bottle of 100 ml Syrup" → 100
      "10 tablets in 1 strip" → 10
      "30" → 30
    """
    if not pack_size_str or str(pack_size_str).strip().lower() in ("na", "nan", "", "-"):
        return None

    text = str(pack_size_str).strip().lower()

    # Prefer a number immediately followed by a unit word, anywhere in the string:
    # "strip of 10 tablets", "bottle of 100 ml Syrup", "vial of 2 ml Injection"
    m = re.search(
        r"(\d+\.?\d*)\s*(?:ml|tablets?|capsules?|pills?|sachets?|vials?|ampoules?|"
        r"pieces?|drops?|respules?|injections?|units?)\b",
        text,
    )
    if m:
        return float(m.group(1))

    # Bare number anywhere
    m = re.search(r"(\d+\.?\d*)", text)
    if m:
        return float(m.group(1))

    return None


def compute_per_unit_price(price: Optional[float], pack_size: Optional[float]) -> Optional[float]:
    """Compute price per unit (tablet/ml/etc)."""
    if price is None or pack_size is None or pack_size <= 0:
        return None
    return round(price / pack_size, 4)


def is_jan_aushadhi(name: str, manufacturer: str) -> bool:
    """Check if a medicine is a Jan Aushadhi generic."""
    lower_name = name.lower() if name else ""
    lower_mfr = manufacturer.lower() if manufacturer else ""
    
    # NOTE: "generic pharmacy" was removed — it matched "DavaIndia Generic
    # Pharmacy", a private retail chain (Zota Healthcare), not the government
    # Pradhan Mantri Bhartiya Janaushadhi Pariyojana (PMBJP) scheme. The
    # shipped dataset contains zero genuine PMBJP products, so this function
    # is expected to return False for every row until real PMBJP data exists.
    keywords = [
        "jan aushadhi",
        "janaushadhi",
        "pmbjp",
        "pradhan mantri bhartiya",
        "bureau of pharma",
    ]
    
    combined = f"{lower_name} {lower_mfr}"
    return any(kw in combined for kw in keywords)
