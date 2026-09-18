#!/usr/bin/env python3
"""
SameSalt Pipeline: Kaggle A-Z Medicine Dataset → SQLite database.

Usage:
    python build_db.py [--csv path/to/A_Z_medicines.csv] [--out path/to/samesalt.db]

Downloads the dataset from Kaggle if not present (requires kaggle CLI configured).
"""

import argparse
import os
import re
import sqlite3
import sys
import time
from pathlib import Path

import pandas as pd

from normalize import (
    build_canonical_key,
    compute_per_unit_price,
    extract_dosage_form,
    extract_release_type,
    is_jan_aushadhi,
    is_nti,
    parse_pack_size,
    parse_salt_composition,
)

DEFAULT_CSV = Path(__file__).parent / "data" / "A_Z_medicines_dataset_of_India.csv"
DEFAULT_OUT = Path(__file__).parent.parent / "assets" / "samesalt.db"


def clean_price(val) -> float | None:
    """Parse price from dataset — handles '₹ 120.5', '120.5', etc."""
    if pd.isna(val):
        return None
    s = str(val).strip()
    s = re.sub(r"[₹$,\s]", "", s)
    try:
        return float(s)
    except ValueError:
        return None


def build_database(csv_path: Path, db_path: Path) -> None:
    """Main pipeline: read CSV, normalize, build SQLite."""
    print(f"📖 Reading {csv_path}...")
    df = pd.read_csv(csv_path, low_memory=False)
    print(f"   {len(df):,} rows loaded")

    # Identify columns (dataset has inconsistent naming across versions)
    col_map = {}
    composition_cols = []
    for col in df.columns:
        cl = col.strip().lower().replace(" ", "_")
        if cl == "name" or ("medicine" in cl and "name" in cl):
            col_map["name"] = col
        elif "composition" in cl or "salt" in cl:
            composition_cols.append(col)
        elif "price" in cl and "unit" not in cl:
            col_map["price"] = col
        elif "manufacturer" in cl or "company" in cl:
            col_map["manufacturer"] = col
        elif "pack" in cl and "size" in cl:
            col_map["pack_size"] = col
        elif "use" in cl or "side_effect" in cl:
            pass  # skip
        elif cl in ("type", "dosage_form", "form"):
            col_map["form"] = col
        elif "discontinued" in cl:
            col_map["discontinued"] = col

    if composition_cols:
        col_map["composition_cols"] = sorted(composition_cols)

    required = ["name"]
    missing = [k for k in required if k not in col_map]
    if missing or not composition_cols:
        print(f"❌ Missing required columns: {missing or ['composition']}")
        print(f"   Available: {list(df.columns)}")
        sys.exit(1)

    print(f"   Column mapping: {col_map}")

    # Ensure output directory exists
    db_path.parent.mkdir(parents=True, exist_ok=True)
    if db_path.exists():
        db_path.unlink()

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # Create schema
    cur.executescript("""
        CREATE TABLE medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            manufacturer TEXT,
            salt_composition TEXT,
            canonical_key TEXT,
            price REAL,
            pack_size REAL,
            per_unit_price REAL,
            dosage_form TEXT,
            release_type TEXT,
            is_nti INTEGER DEFAULT 0,
            is_jan_aushadhi INTEGER DEFAULT 0,
            composition_incomplete INTEGER DEFAULT 0
        );

        CREATE INDEX idx_canonical_key ON medicines(canonical_key);
        CREATE INDEX idx_name ON medicines(name COLLATE NOCASE);
        CREATE INDEX idx_salt ON medicines(salt_composition COLLATE NOCASE);

        CREATE TABLE metadata (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    """)

    print("🔧 Processing medicines...")
    start = time.time()

    # Pattern for names that encode 3+ strengths (e.g. "100mg/325mg/15mg") —
    # the dataset only has two composition columns, so these are truncated to
    # two salts and must not be treated as a complete/reliable composition.
    incomplete_pattern = re.compile(r"\d+\.?\d*\s*(?:mg|mcg|ml|g|iu)\s*/\s*\d+\.?\d*\s*(?:mg|mcg|ml|g|iu)\s*/\s*\d+", re.IGNORECASE)

    batch = []
    skipped = 0
    discontinued_skipped = 0
    nti_count = 0
    ja_count = 0
    incomplete_count = 0

    for i, row in df.iterrows():
        name = str(row[col_map["name"]]).strip() if pd.notna(row[col_map["name"]]) else ""
        composition = " + ".join(
            str(row[c]).strip() for c in col_map["composition_cols"]
            if pd.notna(row[c]) and str(row[c]).strip()
        )
        manufacturer = str(row.get(col_map.get("manufacturer", ""), "")).strip() if col_map.get("manufacturer") and pd.notna(row.get(col_map["manufacturer"])) else ""

        price_raw = row.get(col_map.get("price", "")) if "price" in col_map else None
        price = clean_price(price_raw)

        pack_size_raw = str(row.get(col_map.get("pack_size", ""), "")) if "pack_size" in col_map else ""
        pack_size = parse_pack_size(pack_size_raw)

        form_raw = str(row.get(col_map.get("form", ""), "")) if "form" in col_map else ""

        if "discontinued" in col_map:
            discontinued_raw = row.get(col_map["discontinued"])
            if pd.notna(discontinued_raw) and str(discontinued_raw).strip().lower() in ("true", "1", "yes"):
                discontinued_skipped += 1
                continue

        if not name or not composition or composition.lower() in ("na", "nan", "-", "not available"):
            skipped += 1
            continue

        # Parse and normalize salts
        salts = parse_salt_composition(composition)
        if not salts:
            skipped += 1
            continue

        # Extract dosage form and release type
        dosage_form = extract_dosage_form(form_raw) or extract_dosage_form(name)
        release_type = extract_release_type(name) or extract_release_type(composition)

        # Build canonical key
        canonical = build_canonical_key(salts, dosage_form, release_type)

        # Compute per-unit price
        per_unit = compute_per_unit_price(price, pack_size)

        # NTI check
        nti = is_nti(salts)
        if nti:
            nti_count += 1

        # Jan Aushadhi check
        ja = is_jan_aushadhi(name, manufacturer)
        if ja:
            ja_count += 1

        # Flag names that encode 3+ strengths — the dataset only has two
        # composition columns, so these are stored with a truncated,
        # unreliable canonical key and must be excluded from alternative
        # matching (still searchable by name).
        incomplete = bool(incomplete_pattern.search(name))
        if incomplete:
            incomplete_count += 1

        batch.append((
            name,
            manufacturer,
            composition,
            canonical,
            price,
            pack_size,
            per_unit,
            dosage_form,
            release_type,
            1 if nti else 0,
            1 if ja else 0,
            1 if incomplete else 0,
        ))

        if len(batch) >= 5000:
            cur.executemany(
                "INSERT INTO medicines (name, manufacturer, salt_composition, canonical_key, price, pack_size, per_unit_price, dosage_form, release_type, is_nti, is_jan_aushadhi, composition_incomplete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                batch,
            )
            batch = []

        if (i + 1) % 50000 == 0:
            print(f"   ...processed {i + 1:,} rows")

    # Insert remaining
    if batch:
        cur.executemany(
            "INSERT INTO medicines (name, manufacturer, salt_composition, canonical_key, price, pack_size, per_unit_price, dosage_form, release_type, is_nti, is_jan_aushadhi, composition_incomplete) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            batch,
        )

    # Store metadata
    total = cur.execute("SELECT COUNT(*) FROM medicines").fetchone()[0]
    unique_keys = cur.execute("SELECT COUNT(DISTINCT canonical_key) FROM medicines WHERE canonical_key != ''").fetchone()[0]
    
    cur.executemany(
        "INSERT INTO metadata (key, value) VALUES (?, ?)",
        [
            ("dataset_date", "November 2022"),
            ("dataset_source", "Kaggle A-Z Medicine Dataset of India"),
            ("total_medicines", str(total)),
            ("unique_compositions", str(unique_keys)),
            ("pipeline_version", "1.0.0"),
            ("built_at", time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())),
        ],
    )

    conn.commit()

    elapsed = time.time() - start
    db_size = db_path.stat().st_size / (1024 * 1024)

    print(f"\n✅ Database built in {elapsed:.1f}s")
    print(f"   📊 {total:,} medicines indexed ({skipped:,} skipped, {discontinued_skipped:,} discontinued excluded)")
    print(f"   🔑 {unique_keys:,} unique salt compositions")
    print(f"   ⚠️  {nti_count:,} NTI-flagged entries")
    print(f"   🏥 {ja_count:,} Jan Aushadhi entries")
    print(f"   🧩 {incomplete_count:,} entries flagged composition_incomplete (3+ salts truncated to 2)")
    print(f"   💾 {db_size:.1f} MB → {db_path}")

    conn.close()


def main():
    parser = argparse.ArgumentParser(description="Build SameSalt SQLite database from Kaggle CSV")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Path to input CSV")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="Path to output SQLite DB")
    args = parser.parse_args()

    if not args.csv.exists():
        print(f"❌ CSV not found: {args.csv}")
        print(f"   Download the dataset from:")
        print(f"   https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india")
        print(f"   Place it at: {args.csv}")
        sys.exit(1)

    build_database(args.csv, args.out)


if __name__ == "__main__":
    main()
