"""Render the existing Zov vector identity. Requires rsvg-convert and Pillow."""
from io import BytesIO
from pathlib import Path
import json
import subprocess
import xml.etree.ElementTree as ET

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
VERSION = "graphite-3"
SVG = "http://www.w3.org/2000/svg"
mark = ET.parse(PUBLIC / "brand/v2/zov-mark.svg").getroot()
shape = "".join(ET.tostring(node, encoding="unicode") for node in mark if node.tag != f"{{{SVG}}}title")


def icon(maskable=False):
    size = 368 if maskable else 448
    offset = (512 - size) / 2
    radius = 0 if maskable else 112
    return f'''<svg xmlns="{SVG}" viewBox="0 0 512 512" width="512" height="512">
<defs><linearGradient id="face" x2="0" y2="1"><stop stop-color="#303030"/><stop offset="1" stop-color="#171717"/></linearGradient></defs>
<rect width="512" height="512" rx="{radius}" fill="url(#face)"/>
<g transform="translate({offset} {offset}) scale({size / 64})">{shape}</g>
</svg>\n'''


def png(svg, size=None):
    args = ["rsvg-convert", "--format", "png"]
    if size:
        args += ["--width", str(size), "--height", str(size)]
    return subprocess.run(args, input=svg.encode(), check=True, capture_output=True).stdout


standard = icon()
maskable = icon(maskable=True)
(PUBLIC / "favicon.svg").write_text(standard)
(PUBLIC / "favicon.png").write_bytes(png(standard, 64))
Image.open(BytesIO(png(standard, 64))).save(PUBLIC / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
(PUBLIC / "apple-touch-icon.png").write_bytes(png(maskable, 180))
for size in [192, 512]:
    (PUBLIC / f"icon-{size}.png").write_bytes(png(standard, size))
    (PUBLIC / f"icon-maskable-{size}.png").write_bytes(png(maskable, size))

for key, name, domain, description, language in [
    ("sozvon", "sozvon", "sozvon.now", "Видеозвонки без регистрации.", "ru"),
]:
    lockup = ET.parse(PUBLIC / f"brand/v2/zov-{key}-lockup.svg").getroot()
    width = float(lockup.attrib["viewBox"].split()[2])
    art = "".join(ET.tostring(node, encoding="unicode") for node in lockup if node.tag != f"{{{SVG}}}title")
    social = f'''<svg xmlns="{SVG}" viewBox="0 0 1200 630" width="1200" height="630" role="img" aria-label="{name}">
<title>{name}</title>
<rect width="1200" height="630" fill="#101010"/>
<g transform="translate({(1200 - width * 3) / 2:.2f} 204) scale(3)">{art}</g>
<text x="600" y="438" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#909090">{domain}</text>
</svg>\n'''
    (PUBLIC / f"og-{key}.svg").write_text(social)
    (PUBLIC / f"og-{key}.png").write_bytes(png(social))
    manifest = {
        "id": "/", "name": name, "short_name": name, "description": description,
        "lang": language, "start_url": "/", "scope": "/", "display": "standalone",
        "background_color": "#101010", "theme_color": "#101010",
        "icons": [{"src": f"/{prefix}{size}.png?v={VERSION}", "sizes": f"{size}x{size}", "type": "image/png", "purpose": purpose}
                  for prefix, purpose in [("icon-", "any"), ("icon-maskable-", "maskable")] for size in [192, 512]],
    }
    filename = "manifest.json"
    (PUBLIC / filename).write_text(json.dumps(manifest, ensure_ascii=False, indent="\t") + "\n")
