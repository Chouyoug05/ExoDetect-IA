import argparse
from typing import List


def write_filtered_csv(input_path: str, output_path: str) -> None:
	encodings: List[str] = ["utf-8", "latin-1"]
	last_err: Exception | None = None
	for enc in encodings:
		try:
			with open(input_path, "r", encoding=enc, errors="ignore") as f:
				all_lines = f.readlines()
			non_comment = [ln for ln in all_lines if not ln.lstrip().startswith("#")]
			if not non_comment:
				raise ValueError("Fichier vide après filtrage des commentaires")
			# Trouver l'entête
			header_idx = 0
			for i, ln in enumerate(non_comment[:500]):
				l = ln.strip().lower()
				if l.startswith("pl_name,") or l.startswith("koi_period,"):
					header_idx = i
					break
			with open(output_path, "w", encoding="utf-8", newline="") as out:
				out.write("".join(non_comment[header_idx:]))
			return
		except Exception as e:
			last_err = e
			continue
	# Si tous les encodages échouent
	raise RuntimeError(f"Impossible de filtrer le fichier: {input_path}. Dernière erreur: {last_err}")


def main() -> None:
	parser = argparse.ArgumentParser(description="Filtre un CSV K2 (supprime commentaires, détecte entête)")
	parser.add_argument("--input", required=True, type=str)
	parser.add_argument("--output", required=True, type=str)
	args = parser.parse_args()
	write_filtered_csv(args.input, args.output)
	print(f"Écrit: {args.output}")


if __name__ == "__main__":
	main()
