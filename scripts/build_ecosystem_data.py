#!/usr/bin/env python3
"""Build content/ecosystem.json from the verified GBA institution CSV.

Source of truth: the research pass that produced
~/Downloads/ntx_gba_neuro_university_map.csv (and the Notion database
"NTX Asia — China Neurotech Ecosystem"). Nothing is invented here: rows are
transformed, and the three additions verified in the follow-up pass are appended.

    python scripts/build_ecosystem_data.py [path/to/csv]
"""
from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CSV = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "ntx_gba_neuro_university_map.csv"
OUT = ROOT / "content" / "ecosystem.json"

CITY_MAP = {
    "Shenzhen": "Shenzhen",
    "Hong Kong": "Hong Kong",
    "Guangzhou": "Guangzhou",
    "Dongguan": "Dongguan",
    "Zhuhai": "Zhuhai",
    "Macau": "Macau",
}

TYPE_MAP = [
    ("Research infrastructure", "Research infrastructure"),
    ("Research institute", "Research institute"),
    ("University institute", "University institute"),
    ("University centre", "University centre"),
    ("University lab", "University lab"),
    ("University", "University"),
    ("Hospital", "Hospital"),
    ("Network", "Network"),
    ("Non-profit", "Non-profit"),
    ("Industry", "Industry"),
]


def city_of(raw: str) -> str:
    head = raw.split(" (")[0].strip()
    return CITY_MAP.get(head, head)


def type_of(raw: str) -> str:
    for prefix, label in TYPE_MAP:
        if raw.startswith(prefix):
            return label
    return raw


def split_name(name: str) -> tuple[str, str]:
    """Fallback only: used when the CSV has no separate native-name column."""
    m = re.search(r"\(([^()]*[\u4e00-\u9fff][^()]*)\)\s*$", name)
    if m:
        native = m.group(1)
        return name[: m.start()].strip(), native
    return name, ""


def load() -> list[dict]:
    rows = []
    with CSV.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            name = r["Institution"].strip()
            native = (r.get("Native name") or "").strip()
            if not native:
                name, native = split_name(name)
            rows.append(
                {
                    "name": name,
                    "native": native,
                    "type": type_of(r["Type"]),
                    "city": city_of(r["City"]),
                    "fields": [x.strip() for x in r["Fields"].split(",") if x.strip()],
                    "website": r["Website"] if r["Website"].startswith("http") else None,
                    "verified": r["Verification"].startswith("Verified"),
                    "hook": r["NTX hook"],
                }
            )
    return rows


ADDITIONS = [
    {
        "name": "Great Bay University",
        "native": "大湾区大学",
        "type": "University",
        "city": "Dongguan",
        "fields": ["CN", "NAI", "CS"],
        "website": "https://www.gbu.edu.cn",
        "verified": True,
        "hook": "Approved by the Ministry of Education in June 2025; holds a Guangdong key lab on dynamical systems and nervous-system cross-disciplinary research.",
    },
    {
        "name": "Guangdong Biomedical Engineering Society",
        "native": "广东省生物医学工程学会",
        "type": "Industry association",
        "city": "Guangzhou",
        "fields": ["NE", "AIH"],
        "website": "http://gdsbme.com",
        "verified": True,
        "hook": "Provincial BME society based at Jinan University: annual conference, science award, standards and specialist branches.",
    },
    {
        "name": "Global BCI Application Demonstration Center",
        "native": "全球脑机接口应用示范中心",
        "type": "Industry",
        "city": "Shenzhen",
        "fields": ["BCI"],
        "website": None,
        "verified": False,
        "hook": "Public BCI experience centre opened in Huaqiangbei in October 2026, operated by Macrotellect with the subdistrict office.",
    },
]

if __name__ == "__main__":
    data = load() + ADDITIONS
    data.sort(key=lambda e: (e["city"], e["name"]))
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data)} entries")
    counts = {}
    for e in data:
        counts[e["city"]] = counts.get(e["city"], 0) + 1
    print("by city:", counts)
