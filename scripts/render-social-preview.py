"""Render the repository social card from its SVG source; requires rsvg-convert."""
from pathlib import Path
import subprocess
root = Path(__file__).resolve().parents[1]
subprocess.run([
    "rsvg-convert", "--format", "png",
    "--output", str(root / "docs/assets/social-preview.png"),
    str(root / "docs/assets/social-preview.svg"),
], check=True)
