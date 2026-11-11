"""Verified disk cache for immutable R2 keys; all reads still require route authorization."""

import hashlib
import json
import os
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from app.core.settings import settings


@dataclass
class CachedObject:
    path: Path
    content_type: str
    sha256: str
    size: int


class StorageCache:
    def __init__(self):
        self.root = Path(settings.R2_CACHE_DIRECTORY)

    def paths(self, key):
        digest = hashlib.sha256(key.encode()).hexdigest()
        directory = self.root / digest[:2]
        return directory / (digest + ".bin"), directory / (digest + ".json")

    def get(self, key):
        path, metadata = self.paths(key)
        try:
            info = json.loads(metadata.read_text())
            stat = path.stat()
            if info["key"] != key or stat.st_size != info["size"]:
                return None
            if stat.st_mtime_ns != info["mtime_ns"]:
                with path.open("rb") as data:
                    if hashlib.file_digest(data, "sha256").hexdigest() != info["sha256"]:
                        return None
            return CachedObject(path, info["content_type"], info["sha256"], info["size"])
        except (OSError, ValueError, KeyError, TypeError):
            return None

    def write(self, key, chunks, content_type, expected_sha256=None):
        path, metadata = self.paths(key)
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.root.chmod(0o700)
        path.parent.chmod(0o700)
        temporary = path.with_suffix("." + uuid4().hex + ".part")
        digest, size = hashlib.sha256(), 0
        try:
            with temporary.open("xb") as file:
                os.chmod(temporary, 0o600)
                for chunk in chunks:
                    file.write(chunk)
                    digest.update(chunk)
                    size += len(chunk)
            checksum = digest.hexdigest()
            if expected_sha256 and checksum != expected_sha256:
                raise ValueError("Storage cache checksum mismatch")
            temporary.replace(path)
            info = {"key": key, "content_type": content_type, "sha256": checksum,
                    "size": size, "mtime_ns": path.stat().st_mtime_ns}
            temp_meta = metadata.with_suffix("." + uuid4().hex + ".tmp")
            try:
                temp_meta.write_text(json.dumps(info))
                temp_meta.chmod(0o600)
                temp_meta.replace(metadata)
            finally:
                temp_meta.unlink(missing_ok=True)
            return CachedObject(path, content_type, checksum, size)
        finally:
            temporary.unlink(missing_ok=True)

    def import_file(self, key, source, content_type, expected_sha256):
        with Path(source).open("rb") as data:
            return self.write(key, iter(lambda: data.read(1024 * 1024), b""), content_type, expected_sha256)
