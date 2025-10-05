import argparse
import json

import pandas as pd

from .data_cleaning import clean_kepler_df
from .train_model import train_model


def main() -> None:
	parser = argparse.ArgumentParser(description="Nettoyage puis entraînement sur dataset K2")
	parser.add_argument("--input", required=True, help="Chemin du CSV filtré (sans commentaires)")
	parser.add_argument("--cleaned", required=True, help="Chemin de sortie du CSV propre")
	parser.add_argument("--model", default="models/model_k2.joblib")
	parser.add_argument("--metrics", default="models/metrics_k2.json")
	parser.add_argument("--preproc", default="models/preprocessor_k2.json")
	args = parser.parse_args()

	# Lire le CSV filtré
	df = pd.read_csv(args.input)
	print(f"Chargé: {args.input} rows={df.shape[0]} cols={df.shape[1]}")

	# Nettoyage via pipeline DataFrame
	clean_path = clean_kepler_df(df, args.cleaned)
	print(f"CSV propre: {clean_path}")

	# Entraînement
	metrics = train_model(
		cleaned_csv=clean_path,
		model_path=args.model,
		metrics_path=args.metrics,
		preproc_path=args.preproc,
	)
	print(json.dumps(metrics, ensure_ascii=False, indent=2))


if __name__ == "__main__":
	main()
