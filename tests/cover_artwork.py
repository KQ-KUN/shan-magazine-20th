from __future__ import annotations

import hashlib
import json
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
ASSET = ROOT / "assets" / "cover" / "SHAN_FRONT_COVER_FINAL.pdf"
MM_PER_PT = 25.4 / 72
TOLERANCE_MM = 0.001


def size_mm(box: object) -> tuple[float, float]:
    return float(box.width) * MM_PER_PT, float(box.height) * MM_PER_PT


def assert_size(box: object, width: float, height: float, name: str) -> None:
    actual_width, actual_height = size_mm(box)
    assert abs(actual_width - width) <= TOLERANCE_MM, f"{name} width: {actual_width}"
    assert abs(actual_height - height) <= TOLERANCE_MM, f"{name} height: {actual_height}"


hashes = json.loads((ROOT / "spec" / "INPUT_HASHES.json").read_text(encoding="utf-8"))
status = json.loads((ROOT / "workflow" / "MODULE_STATUS.json").read_text(encoding="utf-8"))["cover_system"]
reader = PdfReader(ASSET)

assert len(reader.pages) == 1
page = reader.pages[0]
assert page.rotation == 0
assert_size(page.mediabox, 191, 266, "MediaBox")
assert_size(page.cropbox, 191, 266, "CropBox")
assert_size(page.bleedbox, 191, 266, "BleedBox")
assert_size(page.trimbox, 185, 260, "TrimBox")
assert_size(page.artbox, 185, 260, "ArtBox")

trim = tuple(float(value) * MM_PER_PT for value in page.trimbox)
expected_trim = (3.0, 3.0, 188.0, 263.0)
assert all(abs(actual - expected) <= TOLERANCE_MM for actual, expected in zip(trim, expected_trim))

digest = hashlib.sha256(ASSET.read_bytes()).hexdigest()
assert digest == hashes["assets/cover/SHAN_FRONT_COVER_FINAL.pdf"]
assert status["frontCover"] == {
    "status": "APPROVED",
    "sourceType": "EXTERNAL_ARTWORK",
    "asset": "assets/cover/SHAN_FRONT_COVER_FINAL.pdf",
    "assemblyMode": "DIRECT_PDF_LINK",
    "jsxStatus": "SUPERSEDED_BY_EXTERNAL_ARTWORK",
}
assert status["backCover"]["status"] == "PENDING"
assert status["spine"]["status"] == "WIDTH_PENDING"

print("PASS approved front cover: 1 page, 185x260 mm trim, 3 mm bleed, direct linked external artwork")
