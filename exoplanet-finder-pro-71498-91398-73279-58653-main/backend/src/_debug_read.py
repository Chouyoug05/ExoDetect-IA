import io
import sys


def main() -> None:
	path = sys.argv[1] if len(sys.argv) > 1 else 'k2pandc_2025.10.04_10.51.38.csv'
	encodings = ['utf-8', 'latin-1']
	for enc in encodings:
		try:
			with open(path, 'r', encoding=enc, errors='ignore') as f:
				raw = f.read()
			print(f'enc={enc} bytes={len(raw)}')
			lines = [ln for ln in raw.splitlines(True) if ln and not ln.lstrip().startswith('#')]
			print('lines_after_comment_filter', len(lines))
			for i, ln in enumerate(lines[:200]):
				l = ln.strip().lower()
				if l.startswith('pl_name,') or l.startswith('koi_period,'):
					print('header_idx', i)
					print('header', ln.strip()[:120])
					break
		except Exception as e:
			print('enc', enc, 'err', e)


if __name__ == '__main__':
	main()
