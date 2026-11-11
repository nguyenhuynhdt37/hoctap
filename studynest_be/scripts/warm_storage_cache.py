"""Warm the R2 file cache from the locally verified migration backup."""

import argparse
import json
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

from app.services.shares.storage_cache import StorageCache


def main(manifest):
    entries = json.loads(manifest.read_text())
    cache = StorageCache()
    for entry in entries:
        if not entry.get('verified'):
            raise ValueError('Migration asset was not verified')
        source = Path(entry['local_path'])
        if not source.is_absolute():
            source = BACKEND / source
        cache.import_file(entry['key'], source, entry['mime_type'], entry['sha256'])
    print('Warmed', len(entries), 'assets; all source SHA-256 checks passed')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--manifest', type=Path, default=BACKEND / 'backups/drive-migration/manifest.json')
    main(parser.parse_args().manifest)
