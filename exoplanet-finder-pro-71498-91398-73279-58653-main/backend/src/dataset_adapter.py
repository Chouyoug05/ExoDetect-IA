import pandas as pd
from typing import Dict, List

# Schéma canonique attendu en sortie
CANONICAL_FEATURES: List[str] = [
	"koi_period",
	"koi_duration",
	"koi_depth",
	"koi_prad",
	"koi_disposition",
]

# Dictionnaires d'alias possibles par source
COLUMN_ALIASES: Dict[str, List[str]] = {
	"koi_period": [
		"koi_period", "orbital_period", "period", "k2_period", "kep_period",
		"pl_orbper", "pl_orbper_err1", "pl_orbper_err2", "orbital_period_days",
	],
	"koi_duration": [
		"koi_duration", "transit_duration", "duration", "k2_duration", "kep_duration",
		"pl_trandur", "pl_trandur_err1", "pl_trandur_err2", "transit_duration_hours",
	],
	"koi_depth": [
		"koi_depth", "transit_depth", "depth", "k2_depth", "kep_depth",
		"pl_trandep", "pl_trandep_err1", "pl_trandep_err2", "transit_depth_ppm",
	],
	"koi_prad": [
		"koi_prad", "planet_radius", "radius", "k2_prad", "kep_prad",
		"pl_rade", "pl_rade_err1", "pl_rade_err2", "planet_radius_earth_units",
	],
	"koi_disposition": [
		"koi_disposition", "disposition", "status", "label", "pl_discmethod",
		"k2_disposition", "kep_disposition", "exoplanet_disposition",
	],
}

K2_LABEL_MAPPINGS = {
	"CONFIRMED": ["CONFIRMED", "Confirmed", "confirmed", "1"],
	"CANDIDATE": ["CANDIDATE", "Candidate", "candidate", "0", "FP", "FALSE POSITIVE"],
	"FALSE POSITIVE": ["FALSE POSITIVE", "False Positive", "false positive", "-1", "FP"],
}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
	df = df.copy()
	df.columns = [str(c).strip().lower() for c in df.columns]
	return df


def _normalize_disposition_values(df: pd.DataFrame) -> pd.DataFrame:
	df = df.copy()
	if "koi_disposition" in df.columns:
		reverse_mapping: Dict[str, str] = {}
		for canonical, aliases in K2_LABEL_MAPPINGS.items():
			for alias in aliases:
				reverse_mapping[alias.lower().strip()] = canonical
		df["koi_disposition"] = (
			df["koi_disposition"].astype(str).str.strip().str.upper().map(reverse_mapping).fillna(df["koi_disposition"])
		)
	return df


def adapt_to_canonical(df: pd.DataFrame) -> pd.DataFrame:
	"""
	Essaie d'adapter un DataFrame arbitraire (Kepler/K2/...) au schéma canonique.
	- Renomme les colonnes via COLUMN_ALIASES
	- Normalise les valeurs de disposition
	- Crée les colonnes manquantes à NaN (la suite du pipeline filtrera si besoin)
	"""
	df = _normalize_columns(df)

	# Construire le mapping alias -> canonique
	mapping: Dict[str, str] = {}
	for canonical, aliases in COLUMN_ALIASES.items():
		for alias in aliases:
			if alias in df.columns:
				mapping[alias] = canonical
				break

	# Appliquer le renommage
	adapted = df.rename(columns=mapping)

	# Créer les colonnes manquantes à NaN
	for col in CANONICAL_FEATURES:
		if col not in adapted.columns:
			adapted[col] = pd.NA

	# Normaliser la disposition
	adapted = _normalize_disposition_values(adapted)

	# Restreindre aux colonnes canoniques
	return adapted[CANONICAL_FEATURES].copy()


def get_supported_aliases() -> Dict[str, List[str]]:
	return COLUMN_ALIASES.copy()


def detect_dataset_type(df: pd.DataFrame) -> str:
	df_norm = _normalize_columns(df)
	if any("k2" in col for col in df_norm.columns):
		return "K2"
	elif any("kep" in col or "koi" in col for col in df_norm.columns):
		return "Kepler"
	elif any("pl_" in col for col in df_norm.columns):
		return "NASA_Exoplanet_Archive"
	else:
		return "Unknown"
