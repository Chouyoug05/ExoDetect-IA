import json
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd


FEATURES: List[str] = ["koi_period", "koi_duration", "koi_depth", "koi_prad"]


def compute_preprocessor_config(df: pd.DataFrame, features: List[str] = FEATURES) -> Dict:
	stats = {}
	for col in features:
		series = pd.to_numeric(df[col], errors="coerce").dropna()
		if series.empty:
			raise ValueError(f"Colonne {col} vide après conversion numérique")
		q01 = float(series.quantile(0.01))
		q99 = float(series.quantile(0.99))
		stats[col] = {
			"median": float(series.median()),
			"min": float(series.min()),
			"max": float(series.max()),
			"clip_min": q01,
			"clip_max": q99,
		}
	return {"features": features, "stats": stats}


def apply_inference_preprocessing(
	df: pd.DataFrame,
	config: Dict,
) -> Tuple[pd.DataFrame, Dict]:
	features: List[str] = config.get("features", FEATURES)
	stats: Dict = config["stats"]

	# Conserver et convertir les colonnes nécessaires
	work = df.copy()
	for col in features:
		work[col] = pd.to_numeric(work[col], errors="coerce")

	before_rows = int(work.shape[0])
	work = work[features]
	work = work.dropna(subset=features).copy()

	# Clipping aux bornes apprises
	for col in features:
		clip_min = stats[col]["clip_min"]
		clip_max = stats[col]["clip_max"]
		work[col] = work[col].clip(lower=clip_min, upper=clip_max)

	after_rows = int(work.shape[0])
	info = {
		"rows_in": before_rows,
		"rows_out": after_rows,
		"dropped_rows": before_rows - after_rows,
	}
	return work, info


def save_preprocessor_config(config: Dict, path: str) -> None:
	with open(path, "w", encoding="utf-8") as f:
		json.dump(config, f, ensure_ascii=False, indent=2)


def load_preprocessor_config(path: str) -> Dict:
	with open(path, "r", encoding="utf-8") as f:
		return json.load(f)
