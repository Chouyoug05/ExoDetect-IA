import argparse
import json
import os
from typing import Dict, List

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, confusion_matrix

LABEL_INV_MAP: Dict[int, str] = {
	-1: "FALSE POSITIVE",
	0: "CANDIDATE",
	1: "CONFIRMED",
}

FEATURES_K2: List[str] = ["koi_period", "koi_prad"]


def train_model_k2(
	cleaned_csv: str,
	model_path: str = "models/model_k2.joblib",
	metrics_path: str = "models/metrics_k2.json",
	random_state: int = 42,
) -> Dict:
	if not os.path.exists(cleaned_csv):
		raise FileNotFoundError(cleaned_csv)
	df = pd.read_csv(cleaned_csv)
	for c in FEATURES_K2 + ["label"]:
		if c not in df.columns:
			raise ValueError(f"Colonne manquante: {c}")

	X = df[FEATURES_K2].copy()
	y = df["label"].astype(int).values

	clf = RandomForestClassifier(
		random_state=random_state,
		n_estimators=300,
		class_weight="balanced_subsample",
		n_jobs=-1,
	)
	clf.fit(X, y)
	y_pred = clf.predict(X)
	acc = float(accuracy_score(y, y_pred))
	labels_sorted = sorted(LABEL_INV_MAP.keys())
	cm = confusion_matrix(y, y_pred, labels=labels_sorted)

	metrics = {
		"accuracy": acc,
		"confusion_matrix": cm.tolist(),
		"labels_order": labels_sorted,
		"labels_names": [LABEL_INV_MAP[i] for i in labels_sorted],
		"rows": int(df.shape[0]),
		"features": FEATURES_K2,
	}

	os.makedirs(os.path.dirname(model_path), exist_ok=True)
	joblib.dump(clf, model_path)
	with open(metrics_path, "w", encoding="utf-8") as f:
		json.dump(metrics, f, ensure_ascii=False, indent=2)

	return metrics


def main() -> None:
	parser = argparse.ArgumentParser(description="Entraîne un modèle K2 minimal (period, prad)")
	parser.add_argument("--cleaned", required=True)
	parser.add_argument("--model", default="models/model_k2.joblib")
	parser.add_argument("--metrics", default="models/metrics_k2.json")
	parser.add_argument("--random_state", type=int, default=42)
	args = parser.parse_args()

	m = train_model_k2(
		cleaned_csv=args.cleaned,
		model_path=args.model,
		metrics_path=args.metrics,
		random_state=args.random_state,
	)
	print(json.dumps(m, ensure_ascii=False, indent=2))


if __name__ == "__main__":
	main()
