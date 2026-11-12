"""Install the Piston runtimes used by the seeded lessons (safe to rerun)."""

import argparse
import json
import os
from urllib.request import Request, urlopen


def main(base_url=None):
    # dotenv is available in the app venv; a deployed host can use stdlib only.
    if base_url is None:
        from dotenv import load_dotenv

        load_dotenv()
    base_url = (base_url or os.getenv("PISTON_URL", "http://localhost:4000")).rstrip(
        "/"
    )
    packages = [
        ("python", "3.11.0"),
        ("node", "20.11.1"),
        ("typescript", "5.0.3"),
        ("gcc", "10.2.0"),
        ("java", "15.0.2"),
        ("go", "1.16.2"),
        ("rust", "1.68.2"),
        ("bash", "5.1.0"),
        ("kotlin", "1.8.20"),
        ("php", "8.2.3"),
        ("ruby", "3.0.1"),
    ]
    with urlopen(f"{base_url}/api/v2/packages", timeout=30) as response:
        installed = {
            (package["language"], package["language_version"])
            for package in json.load(response)
            if package["installed"]
        }
    for language, version in packages:
        if (language, version) in installed:
            print(f"Already installed: {language} {version}", flush=True)
            continue
        print(f"Installing: {language} {version}", flush=True)
        request = Request(
            f"{base_url}/api/v2/packages",
            data=json.dumps({"language": language, "version": version}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urlopen(request, timeout=900) as response:
            print(response.read().decode(), flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        help="Local admin URL; package APIs are blocked on the public domain",
    )
    main(parser.parse_args().base_url)
