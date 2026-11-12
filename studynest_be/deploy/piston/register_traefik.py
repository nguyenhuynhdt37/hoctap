"""Add the runner route to the existing KTCT gateway without changing its routes."""

import argparse
import os
import shutil
import tempfile
import time
from pathlib import Path

import yaml


def register(path, domain, upstream):
    original = path.read_bytes()
    data = yaml.safe_load(original)
    router = {
        "entryPoints": ["websecure"],
        "rule": f"Host(`{domain}`)",
        "service": "studynest-piston-svc",
        "tls": {"certResolver": "letsencrypt"},
    }
    service = {"loadBalancer": {"servers": [{"url": upstream}]}}
    http = data.setdefault("http", {})
    for kind, name, value in [
        ("routers", "studynest-piston-router", router),
        ("services", "studynest-piston-svc", service),
    ]:
        objects = http.setdefault(kind, {})
        if name in objects and objects[name] != value:
            raise ValueError("Existing runner route differs; manual review needed")
        objects[name] = value
    rendered = yaml.safe_dump(data, sort_keys=False, allow_unicode=True)
    if yaml.safe_load(rendered) != data:
        raise ValueError("Generated YAML validation failed")
    backup_dir = path.parent.parent / "backups"
    backup_dir.mkdir(exist_ok=True)
    backup = backup_dir / (
        path.name + ".before-piston-" + time.strftime("%Y%m%dT%H%M%SZ", time.gmtime())
    )
    shutil.copy2(path, backup)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".piston-", suffix=".tmp")
    try:
        with os.fdopen(fd, "w") as output:
            output.write(rendered)
        shutil.copymode(path, temporary)
        if path.read_bytes() != original:
            raise RuntimeError("Gateway config changed concurrently; retry")
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)
    print("Route installed:", domain, "->", upstream)
    print("Backup:", backup)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--config", type=Path, default=Path("/opt/traefik/config/dynamic.yml")
    )
    parser.add_argument("--domain", default="piston.itup.io.vn")
    parser.add_argument("--upstream", default="http://10.10.10.100:14000")
    args = parser.parse_args()
    register(args.config, args.domain, args.upstream)
