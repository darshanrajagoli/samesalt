# Data License

`assets/samesalt.db` is built from:

- **Dataset:** A-Z Medicine Dataset of India
- **Creator:** Shudhanshu Singh
- **Source:** https://www.kaggle.com/datasets/shudhanshusingh/az-medicine-dataset-of-india
- **License:** CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/)
- **Original publish date:** November 2022 (see the in-app disclaimer — prices
  and availability may have changed since)

## Modifications made

`pipeline/build_db.py` and `pipeline/normalize.py` transform the raw CSV into
`assets/samesalt.db`:

- Salt names normalized to INN spelling (e.g. "Amoxycillin" → "Amoxicillin")
- Strengths standardized to a common unit (e.g. "0.5g" → "500mg")
- A canonical matching key built from sorted salts + strength + dosage form +
  release type
- Narrow Therapeutic Index (NTI) and composition-completeness flags added
- Data converted from CSV to SQLite, with derived indexes

The underlying names, prices, and manufacturer data are reproduced from the
source dataset, not independently collected.

## Your obligations if you reuse this data

Per CC BY-SA 4.0, any redistribution of `assets/samesalt.db` (or a derivative)
must: credit the creator and link to the license, indicate that changes were
made (as above), and be licensed under CC BY-SA 4.0 or a compatible license —
not under this repository's MIT license, which covers the application code
only.
