"""Tests for the salt normalization pipeline."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from normalize import (
    normalize_spelling,
    standardize_strength,
    parse_salt_composition,
    build_canonical_key,
    is_nti,
    parse_pack_size,
    compute_per_unit_price,
    extract_release_type,
    extract_dosage_form,
    is_jan_aushadhi,
)


class TestNormalizeSpelling:
    def test_amoxycillin(self):
        assert normalize_spelling("Amoxycillin") == "amoxicillin"

    def test_frusemide(self):
        assert normalize_spelling("Frusemide") == "furosemide"

    def test_lignocaine(self):
        assert normalize_spelling("Lignocaine") == "lidocaine"

    def test_unknown_passes_through(self):
        assert normalize_spelling("Atorvastatin") == "atorvastatin"

    def test_preserves_paracetamol(self):
        assert normalize_spelling("Paracetamol") == "paracetamol"

    def test_strips_whitespace(self):
        assert normalize_spelling("  Amoxycillin  ") == "amoxicillin"


class TestStandardizeStrength:
    def test_grams_to_mg(self):
        assert standardize_strength("0.5g") == "500mg"

    def test_grams_to_mg_whole(self):
        assert standardize_strength("1g") == "1000mg"

    def test_mcg_to_mg(self):
        assert standardize_strength("250mcg") == "0.25mg"

    def test_mg_stays_mg(self):
        assert standardize_strength("500mg") == "500mg"

    def test_percentage_stays(self):
        assert standardize_strength("10%") == "10%"

    def test_iu_stays(self):
        assert standardize_strength("5000iu") == "5000IU"

    def test_ml_stays(self):
        assert standardize_strength("100ml") == "100ml"


class TestParseSaltComposition:
    def test_single_salt_with_parentheses(self):
        result = parse_salt_composition("Amlodipine (5mg)")
        assert len(result) == 1
        assert result[0] == ("amlodipine", "5mg")

    def test_combination_with_plus(self):
        result = parse_salt_composition("Amoxycillin (250mg) + Clavulanic Acid (125mg)")
        assert len(result) == 2
        # Sorted alphabetically
        assert result[0][0] == "amoxicillin"  # normalized from Amoxycillin
        assert result[0][1] == "250mg"
        assert result[1][0] == "clavulanic acid"
        assert result[1][1] == "125mg"

    def test_strength_without_parentheses(self):
        result = parse_salt_composition("Paracetamol 500mg + Caffeine 65mg")
        assert len(result) == 2
        assert result[0][0] == "caffeine"  # alphabetically first
        assert result[1][0] == "paracetamol"

    def test_ip_suffix_removed(self):
        result = parse_salt_composition("Metformin Hydrochloride IP (500mg)")
        assert len(result) == 1
        assert "ip" not in result[0][0].lower()
        assert "IP" not in result[0][0]

    def test_na_returns_empty(self):
        assert parse_salt_composition("NA") == []
        assert parse_salt_composition("") == []
        assert parse_salt_composition("nan") == []

    def test_unit_conversion_in_strength(self):
        result = parse_salt_composition("Levothyroxine (0.5g)")
        assert result[0][1] == "500mg"

    def test_three_salts_sorted(self):
        result = parse_salt_composition("Zinc (10mg) + Vitamin C (100mg) + Amoxicillin (250mg)")
        names = [s[0] for s in result]
        assert names == sorted(names)


class TestBuildCanonicalKey:
    def test_basic_key(self):
        salts = [("amlodipine", "5mg")]
        key = build_canonical_key(salts)
        assert key == "amlodipine:5mg"

    def test_multi_salt_key(self):
        salts = [("amoxicillin", "250mg"), ("clavulanic acid", "125mg")]
        key = build_canonical_key(salts)
        assert key == "amoxicillin:250mg+clavulanic acid:125mg"

    def test_with_form(self):
        salts = [("paracetamol", "500mg")]
        key = build_canonical_key(salts, dosage_form="tablet")
        assert key == "paracetamol:500mg|tablet"

    def test_with_release_type(self):
        salts = [("metformin", "500mg")]
        key = build_canonical_key(salts, dosage_form="tablet", release_type="SR")
        assert key == "metformin:500mg|tablet|SR"

    def test_empty_salts(self):
        assert build_canonical_key([]) == ""

    def test_salt_without_strength(self):
        salts = [("zinc", "")]
        key = build_canonical_key(salts)
        assert key == "zinc"


class TestIsNTI:
    def test_warfarin(self):
        assert is_nti([("warfarin", "5mg")]) is True

    def test_phenytoin(self):
        assert is_nti([("phenytoin", "100mg")]) is True

    def test_lithium_carbonate(self):
        assert is_nti([("lithium carbonate", "300mg")]) is True

    def test_digoxin(self):
        assert is_nti([("digoxin", "0.25mg")]) is True

    def test_levothyroxine(self):
        assert is_nti([("levothyroxine", "50mg")]) is True

    def test_non_nti(self):
        assert is_nti([("paracetamol", "500mg")]) is False

    def test_combo_with_one_nti(self):
        assert is_nti([("amlodipine", "5mg"), ("warfarin", "2mg")]) is True

    # Regression tests: the real dataset spells these differently than the
    # idealized INN names above, and exact-set matching missed all of them.
    def test_thyroxine_spelling_is_flagged(self):
        assert is_nti([("thyroxine", "100mcg")]) is True

    def test_divalproex_is_flagged(self):
        assert is_nti([("divalproex sodium", "500mg")]) is True

    def test_acenocoumarol_is_flagged(self):
        assert is_nti([("acenocoumarol", "2mg")]) is True

    def test_fosphenytoin_is_flagged(self):
        assert is_nti([("fosphenytoin sodium", "150mg")]) is True


class TestParsePackSize:
    def test_tablets_in_strip(self):
        assert parse_pack_size("10 tablets in 1 strip") == 10

    def test_capsules_in_bottle(self):
        assert parse_pack_size("15 capsules in 1 bottle") == 15

    def test_ml_in_bottle(self):
        assert parse_pack_size("100ml in 1 bottle") == 100

    def test_bare_number(self):
        assert parse_pack_size("30") == 30

    def test_na_returns_none(self):
        assert parse_pack_size("NA") is None
        assert parse_pack_size("") is None

    # Regression tests: these are the actual pack_size_label formats in the
    # shipped dataset — the original regex was anchored at position 0 and
    # required a leading digit, so every one of these returned None.
    def test_strip_of_n_tablets(self):
        assert parse_pack_size("strip of 10 tablets") == 10

    def test_bottle_of_n_ml_syrup(self):
        assert parse_pack_size("bottle of 100 ml Syrup") == 100

    def test_vial_of_n_ml_injection(self):
        assert parse_pack_size("vial of 2 ml Injection") == 2

    def test_packet_of_n_sachet(self):
        assert parse_pack_size("packet of 5 sachets") == 5


class TestComputePerUnitPrice:
    def test_basic(self):
        assert compute_per_unit_price(100, 10) == 10.0

    def test_fractional(self):
        assert compute_per_unit_price(125.50, 10) == 12.55

    def test_none_price(self):
        assert compute_per_unit_price(None, 10) is None

    def test_none_pack(self):
        assert compute_per_unit_price(100, None) is None

    def test_zero_pack(self):
        assert compute_per_unit_price(100, 0) is None


class TestExtractReleaseType:
    def test_sr(self):
        assert extract_release_type("Metformin SR 500mg") == "SR"

    def test_sustained_release(self):
        assert extract_release_type("Sustained Release Tablet") == "SR"

    def test_xr(self):
        assert extract_release_type("Metformin XR 500mg") == "XR"

    def test_cr(self):
        assert extract_release_type("Controlled Release") == "CR"

    def test_none(self):
        assert extract_release_type("Amoxicillin 500mg") is None


class TestExtractDosageForm:
    def test_tablet(self):
        assert extract_dosage_form("Paracetamol 500mg Tablet") == "tablet"

    def test_capsule(self):
        assert extract_dosage_form("Amoxicillin 250mg Capsule") == "capsule"

    def test_syrup(self):
        assert extract_dosage_form("Cough Syrup 100ml") == "liquid"

    def test_injection(self):
        assert extract_dosage_form("Insulin Injection") == "injection"

    def test_cream(self):
        assert extract_dosage_form("Betamethasone Cream") == "topical"

    def test_none(self):
        assert extract_dosage_form("Something else entirely") is None


class TestIsJanAushadhi:
    def test_jan_aushadhi_in_name(self):
        assert is_jan_aushadhi("Jan Aushadhi Paracetamol", "") is True

    def test_pmbjp_in_manufacturer(self):
        assert is_jan_aushadhi("Paracetamol 500mg", "PMBJP") is True

    def test_private_generic_chain_is_not_jan_aushadhi(self):
        # "Generic Pharmacy" (e.g. DavaIndia Generic Pharmacy) is a private
        # retail chain, not the government PMBJP scheme — must NOT be flagged.
        assert is_jan_aushadhi("Paracetamol", "DavaIndia Generic Pharmacy") is False

    def test_genuine_pmbjp_is_jan_aushadhi(self):
        assert is_jan_aushadhi("Paracetamol", "Pradhan Mantri Bhartiya Janaushadhi Pariyojana") is True
        assert is_jan_aushadhi("Paracetamol IP", "Jan Aushadhi Kendra") is True

    def test_normal_medicine(self):
        assert is_jan_aushadhi("Crocin", "GSK") is False


class TestEndToEnd:
    """Integration tests for the full normalization pipeline."""

    def test_two_brands_same_salt_match(self):
        """Two brands with identical salt compositions should produce the same canonical key."""
        salt1 = parse_salt_composition("Amoxycillin (500mg) + Clavulanic Acid (125mg)")
        salt2 = parse_salt_composition("Amoxicillin (500mg) + Clavulanic Acid (125mg)")
        
        key1 = build_canonical_key(salt1, dosage_form="tablet")
        key2 = build_canonical_key(salt2, dosage_form="tablet")
        
        assert key1 == key2

    def test_different_strengths_dont_match(self):
        """Same salts, different strengths should NOT match."""
        salt1 = parse_salt_composition("Amlodipine (5mg)")
        salt2 = parse_salt_composition("Amlodipine (10mg)")
        
        key1 = build_canonical_key(salt1)
        key2 = build_canonical_key(salt2)
        
        assert key1 != key2

    def test_sr_doesnt_match_regular(self):
        """SR and regular formulations should NOT match."""
        salt = parse_salt_composition("Metformin (500mg)")
        
        key_regular = build_canonical_key(salt, dosage_form="tablet")
        key_sr = build_canonical_key(salt, dosage_form="tablet", release_type="SR")
        
        assert key_regular != key_sr

    def test_unit_normalization_match(self):
        """0.5g and 500mg should match."""
        salt1 = parse_salt_composition("Paracetamol (0.5g)")
        salt2 = parse_salt_composition("Paracetamol (500mg)")
        
        key1 = build_canonical_key(salt1)
        key2 = build_canonical_key(salt2)
        
        assert key1 == key2

    def test_order_independence(self):
        """Order of salts should not affect the canonical key."""
        salt1 = parse_salt_composition("Zinc (10mg) + Vitamin C (100mg)")
        salt2 = parse_salt_composition("Vitamin C (100mg) + Zinc (10mg)")
        
        key1 = build_canonical_key(salt1)
        key2 = build_canonical_key(salt2)
        
        assert key1 == key2
