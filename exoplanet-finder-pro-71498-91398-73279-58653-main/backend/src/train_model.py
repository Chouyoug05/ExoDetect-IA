import argparse
import json
import os
from typing import Dict, List

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, roc_auc_score
from sklearn.preprocessing import label_binarize

from .preprocessing import FEATURES, compute_preprocessor_config, save_preprocessor_config


LABEL_INV_MAP: Dict[int, str] = {
	-1: "FALSE POSITIVE",
	0: "CANDIDATE",
	1: "CONFIRMED",
}


def train_model(
	cleaned_csv: str = "data/cleaned_kepler.csv",
	model_path: str = "models/model.joblib",
	metrics_path: str = "models/metrics.json",
	preproc_path: str = "models/preprocessor_config.json",
	n_estimators: int = 300,
	random_state: int = 42,
) -> Dict:
	if not os.path.exists(cleaned_csv):
		raise FileNotFoundError(
			f"Fichier nettoyé introuvable: {cleaned_csv}. Lancez d'abord data_cleaning.py"
		)

	df = pd.read_csv(cleaned_csv)
	for c in FEATURES + ["label"]:
		if c not in df.columns:
			raise ValueError(f"Colonne manquante dans le CSV propre: {c}")

	# Préprocesseur basé sur le dataset d'entraînement
	preproc_cfg = compute_preprocessor_config(df, FEATURES)
	os.makedirs(os.path.dirname(preproc_path), exist_ok=True)
	save_preprocessor_config(preproc_cfg, preproc_path)

	X = df[FEATURES].copy()
	y = df["label"].astype(int).values

	clf = RandomForestClassifier(
		n_estimators=n_estimators,
		random_state=random_state,
		class_weight="balanced_subsample",
		n_jobs=-1,
	)
	clf.fit(X, y)

	y_pred = clf.predict(X)
	y_proba = clf.predict_proba(X)

	acc = float(accuracy_score(y, y_pred))
	labels_sorted = sorted(LABEL_INV_MAP.keys())
	cm = confusion_matrix(y, y_pred, labels=labels_sorted)

	# AUC ROC (micro-average) pour multi-classes
	y_bin = label_binarize(y, classes=labels_sorted)
	auc_micro = float(roc_auc_score(y_bin, y_proba, average="micro", multi_class="ovr"))

	metrics = {
		"accuracy": acc,
		"confusion_matrix": cm.tolist(),
		"labels_order": labels_sorted,
		"labels_names": [LABEL_INV_MAP[i] for i in labels_sorted],
		"auc_micro_ovr": auc_micro,
		"rows": int(df.shape[0]),
		"features": FEATURES,
	}

	os.makedirs(os.path.dirname(model_path), exist_ok=True)
	joblib.dump(clf, model_path)
	with open(metrics_path, "w", encoding="utf-8") as f:
		json.dump(metrics, f, ensure_ascii=False, indent=2)

	return metrics


def main() -> None:
	parser = argparse.ArgumentParser(description="Entraîne un modèle RandomForest pour KOI")
	parser.add_argument("--cleaned", type=str, default="data/cleaned_kepler.csv")
	parser.add_argument("--model", type=str, default="models/model.joblib")
	parser.add_argument("--metrics", type=str, default="models/metrics.json")
	parser.add_argument("--preproc", type=str, default="models/preprocessor_config.json")
	parser.add_argument("--n_estimators", type=int, default=300)
	parser.add_argument("--random_state", type=int, default=42)
	args = parser.parse_args()

	m = train_model(
		cleaned_csv=args.cleaned,
		model_path=args.model,
		metrics_path=args.metrics,
		preproc_path=args.preproc,
		n_estimators=args.n_estimators,
		random_state=args.random_state,
	)
	print(json.dumps(m, indent=2, ensure_ascii=False))


if __name__ == "__main__":
	main()
