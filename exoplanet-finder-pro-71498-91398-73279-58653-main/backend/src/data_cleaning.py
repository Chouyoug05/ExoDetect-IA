import argparse
import json
import os
from glob import glob
from typing import List
import io

import pandas as pd


IMPORTANT_COLUMNS: List[str] = [
	"koi_period",
	"koi_duration",
	"koi_depth",
	"koi_prad",
	"koi_disposition",
]

LABEL_MAP = {
	"CONFIRMED": 1,
	"CANDIDATE": 0,
	"FALSE POSITIVE": -1,
}


def _robust_read_csv(path: str) -> pd.DataFrame:
	# Essaye lecture explicite (NEA: séparateur virgule, commentaires '#') puis fallback
	encodings = ["utf-8", "latin-1"]
	for enc in encodings:
		try:
			return pd.read_csv(
				path,
				engine="python",
				sep=",",
				on_bad_lines="skip",
				comment="#",
				encoding=enc,
				skip_blank_lines=True,
				low_memory=False,
			)
		except Exception:
			pass
	# Fallback: auto-détection
	for enc in encodings:
		try:
			return pd.read_csv(
				path,
				engine="python",
				sep=None,
				on_bad_lines="skip",
				comment="#",
				encoding=enc,
				skip_blank_lines=True,
				low_memory=False,
			)
		except Exception:
			pass
	# Fallback avancé: scanner pour trouver la ligne d'en-tête et reconstruire un buffer en mémoire
	for enc in encodings:
		try:
			with open(path, "r", encoding=enc, errors="ignore") as f:
				lines = [ln for ln in f.readlines() if ln and not ln.lstrip().startswith("#")]
			if not lines:
				continue
			# Trouver index de l'entête (ligne contenant des colonnes attendues NEA ou KOI)
			header_idx = None
			for i, line in enumerate(lines):
				l = line.strip().lower()
				if l.startswith("pl_name,") or l.startswith("koi_period,"):
					header_idx = i
					break
			if header_idx is None:
				continue
			content = "".join(lines[header_idx:])
			buffer = io.StringIO(content)
			return pd.read_csv(
				buffer,
				engine="python",
				sep=",",
				on_bad_lines="skip",
				skip_blank_lines=True,
				low_memory=False,
			)
		except Exception:
			continue
	# Fallback: détecter la ligne d'entête dans le fichier brut et lire avec header index
	for enc in encodings:
		try:
			with open(path, "r", encoding=enc, errors="ignore") as f:
				all_lines = f.readlines()
			header_idx = None
			for i, ln in enumerate(all_lines[:500]):
				l = ln.strip().lower()
				if l.startswith("pl_name,") or l.startswith("koi_period,"):
					header_idx = i
					break
			if header_idx is not None:
				return pd.read_csv(
					path,
					engine="python",
					sep=",",
					header=header_idx,
					low_memory=False,
				)
		except Exception:
			continue
	# Autres séparateurs possibles
	seps = [",", ";", "\t", "|"]
	for enc in encodings:
		for s in seps:
			try:
				return pd.read_csv(
					path,
					engine="python",
					sep=s,
					on_bad_lines="skip",
					comment="#",
					encoding=enc,
					skip_blank_lines=True,
					low_memory=False,
				)
			except Exception:
				continue
	raise ValueError(f"Impossible de lire le CSV: {path}. Vérifiez séparateur/encodage.")


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
	# Supprime les espaces superflus et standardise en minuscules
	df = df.copy()
	df.columns = [str(c).strip().lower() for c in df.columns]
	return df


def _try_adapt_dataset(df: pd.DataFrame) -> pd.DataFrame:
	try:
		from .dataset_adapter import adapt_to_canonical
		return adapt_to_canonical(df)
	except Exception as e:
		raise ValueError(f"Adaptation de schéma échouée: {e}")


def clean_kepler_csv(input_path: str, output_path: str) -> str:
	df = _robust_read_csv(input_path)
	df = _normalize_columns(df)

	missing_cols = [c for c in IMPORTANT_COLUMNS if c not in df.columns]
	if missing_cols:
		# Essayer d'adapter automatiquement (permet K2 et autres sources)
		df = _try_adapt_dataset(df)

	# Après adaptation éventuelle, revérifier
	missing_cols2 = [c for c in IMPORTANT_COLUMNS if c not in df.columns]
	if missing_cols2:
		raise ValueError(f"Colonnes manquantes dans {input_path}: {missing_cols2}")

	before_rows = int(df.shape[0])
	df = df[IMPORTANT_COLUMNS].copy()

	# Nettoyage du label
	df["koi_disposition"] = (
		df["koi_disposition"].astype(str).str.strip().str.upper()
	)

	# Supprimer lignes avec valeurs manquantes
	df = df.dropna(subset=["koi_period", "koi_duration", "koi_depth", "koi_prad", "koi_disposition"]).copy()
	after_dropna = int(df.shape[0])

	# Convertir en numérique (sécurise la suite) puis filtrer les outliers
	for col in ["koi_period", "koi_duration", "koi_depth", "koi_prad"]:
		df[col] = pd.to_numeric(df[col], errors="coerce")
	df = df.dropna(subset=["koi_period", "koi_duration", "koi_depth", "koi_prad"]).copy()
	after_numeric = int(df.shape[0])

	# Filtrer les valeurs aberrantes
	df = df[(df["koi_period"] <= 1000) & (df["koi_prad"] <= 30)].copy()
	after_outliers = int(df.shape[0])

	# Garder uniquement les labels connus
	valid_labels = set(LABEL_MAP.keys())
	df = df[df["koi_disposition"].isin(valid_labels)].copy()
	after_label = int(df.shape[0])

	if df.empty:
		raise ValueError(
			"Aucune ligne restante après nettoyage. Vérifiez séparateur, colonnes et filtres (period<=1000, prad<=30)."
		)

	# Transformer le label
	df["label"] = df["koi_disposition"].map(LABEL_MAP)

	# Réordonner colonnes
	df = df[["koi_period", "koi_duration", "koi_depth", "koi_prad", "label"]]

	os.makedirs(os.path.dirname(output_path), exist_ok=True)
	df.to_csv(output_path, index=False)

	# Sauvegarde d'un petit manifeste
	manifest = {
		"source": os.path.abspath(input_path),
		"rows_before": before_rows,
		"rows_after": int(df.shape[0]),
		"pipeline_counts": {
			"after_dropna_raw": after_dropna,
			"after_numeric": after_numeric,
			"after_outliers": after_outliers,
			"after_label_filter": after_label,
		},
		"columns": list(df.columns),
		"filters": {
			"dropna": True,
			"koi_period_max": 1000,
			"koi_prad_max": 30,
			"label_map": LABEL_MAP,
		},
		"output": os.path.abspath(output_path),
	}
	with open(os.path.join(os.path.dirname(output_path), "cleaning_manifest.json"), "w", encoding="utf-8") as f:
		json.dump(manifest, f, ensure_ascii=False, indent=2)

	return output_path


def clean_kepler_df(df: pd.DataFrame, output_path: str) -> str:
	# Normaliser colonnes
	df = _normalize_columns(df)

	missing_cols = [c for c in IMPORTANT_COLUMNS if c not in df.columns]
	if missing_cols:
		# Essayer d'adapter automatiquement (permet K2 et autres sources)
		df = _try_adapt_dataset(df)

	# Après adaptation éventuelle, revérifier
	missing_cols2 = [c for c in IMPORTANT_COLUMNS if c not in df.columns]
	if missing_cols2:
		raise ValueError(f"Colonnes manquantes: {missing_cols2}")

	before_rows = int(df.shape[0])
	df = df[IMPORTANT_COLUMNS].copy()

	# Nettoyage du label
	df["koi_disposition"] = (
		df["koi_disposition"].astype(str).str.strip().str.upper()
	)

	# Supprimer lignes avec valeurs manquantes
	df = df.dropna(subset=["koi_period", "koi_duration", "koi_depth", "koi_prad", "koi_disposition"]).copy()

	# Convertir en numérique puis filtrer les outliers
	for col in ["koi_period", "koi_duration", "koi_depth", "koi_prad"]:
		df[col] = pd.to_numeric(df[col], errors="coerce")
	df = df.dropna(subset=["koi_period", "koi_duration", "koi_depth", "koi_prad"]).copy()

	# Filtrer valeurs aberrantes
	df = df[(df["koi_period"] <= 1000) & (df["koi_prad"] <= 30)].copy()

	# Filtrer labels inconnus
	valid_labels = set(LABEL_MAP.keys())
	df = df[df["koi_disposition"].isin(valid_labels)].copy()

	if df.empty:
		raise ValueError("Aucune ligne restante après nettoyage")

	# Transformer label
	df["label"] = df["koi_disposition"].map(LABEL_MAP)

	# Réordonner colonnes
	df = df[["koi_period", "koi_duration", "koi_depth", "koi_prad", "label"]]

	os.makedirs(os.path.dirname(output_path), exist_ok=True)
	df.to_csv(output_path, index=False)
	return output_path


def clean_k2_df(df: pd.DataFrame, output_path: str) -> str:
	# K2 minimal: only koi_period, koi_prad and koi_disposition are required
	df = _normalize_columns(df)

	required = ["koi_period", "koi_prad", "koi_disposition"]
	missing = [c for c in required if c not in df.columns]
	if missing:
		# tenter adaptation
		df = _try_adapt_dataset(df)
		missing2 = [c for c in required if c not in df.columns]
		if missing2:
			raise ValueError(f"Colonnes manquantes pour K2 minimal: {missing2}")

	before_rows = int(df.shape[0])
	df = df[required].copy()

	# Nettoyage label
	df["koi_disposition"] = df["koi_disposition"].astype(str).str.strip().str.upper()

	# Convertir en numérique
	for col in ["koi_period", "koi_prad"]:
		df[col] = pd.to_numeric(df[col], errors="coerce")

	# Drop lignes invalides
	df = df.dropna(subset=["koi_period", "koi_prad", "koi_disposition"]).copy()

	# Filtrer outliers de base
	df = df[(df["koi_period"] <= 1000) & (df["koi_prad"] <= 30)].copy()

	# Labels connus
	valid_labels = set(LABEL_MAP.keys())
	df = df[df["koi_disposition"].isin(valid_labels)].copy()

	if df.empty:
		raise ValueError("Aucune ligne restante après nettoyage K2 minimal")

	# Label numérique
	df["label"] = df["koi_disposition"].map(LABEL_MAP)

	# Sortie minimale
	df = df[["koi_period", "koi_prad", "label"]]

	os.makedirs(os.path.dirname(output_path), exist_ok=True)
	df.to_csv(output_path, index=False)
	return output_path


def find_default_input(pattern: str = "cumulative_*.csv") -> str:
	candidates = sorted(glob(pattern))
	if not candidates:
		raise FileNotFoundError(
			"Aucun fichier cumulative_*.csv trouvé dans le dossier courant. "
			"Spécifiez --input."
		)
	return candidates[-1]


def main() -> None:
	parser = argparse.ArgumentParser(description="Nettoyage du tableau KOI (Kepler/K2)")
	parser.add_argument("--input", type=str, default=None, help="Chemin du CSV brut (Kepler/K2) (défaut: cumulative_*.csv)")
	parser.add_argument("--output", type=str, default="data/cleaned_kepler.csv", help="Chemin de sortie du CSV propre")
	args = parser.parse_args()

	input_path = args.input or find_default_input()
	output_path = args.output

	cleaned = clean_kepler_csv(input_path, output_path)
	print(f"CSV propre sauvegardé: {cleaned}")


if __name__ == "__main__":
	main()
