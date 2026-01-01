#!/usr/bin/env python3
"""Fetch Amir El-Ghoussani's Google Scholar publications and store them as JSON."""
from __future__ import annotations

import html
import json
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen

SCHOLAR_USER_ID = "ADA3mb8AAAAJ"
BASE_URL = "https://scholar.google.com"
PAGE_TEMPLATE = (
    "https://scholar.google.com/citations?hl=en&user={user}&cstart={start}&pagesize=100"
)
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}
MAX_PAGES = 6

RESOURCE_OVERRIDES = {
    "Revisiting Gradient-Based Uncertainty for Monocular Depth Estimation": [
        {"label": "arXiv", "url": "https://arxiv.org/abs/2502.05964"},
        {"label": "PDF", "url": "https://arxiv.org/pdf/2502.05964"},
        {"label": "Code", "url": "https://github.com/jhornauer/GrUMoDepth"},
    ],
    "Consistency Regularisation for Unsupervised Domain Adaptation in Monocular Depth Estimation": [
        {"label": "arXiv", "url": "https://arxiv.org/abs/2405.17704"},
        {"label": "PDF", "url": "https://arxiv.org/pdf/2405.17704"},
        {"label": "Code", "url": "https://github.com/AmirMaEl/SemiSupMDE"},
    ],
}

ROW_PATTERN = re.compile(r'<tr class="gsc_a_tr">(.*?)</tr>', re.S)
TITLE_PATTERN = re.compile(r'class="gsc_a_at"[^>]*>(.*?)</a>', re.S)
LINK_PATTERN = re.compile(r'class="gsc_a_at"[^>]*href="([^"]+)"')
GRAY_PATTERN = re.compile(r'<div class="gs_gray">(.*?)</div>', re.S)
YEAR_PATTERN = re.compile(r'<span class="gsc_a_h gsc_a_hc gs_ibl">(\d{4})</span>')


@dataclass
class Publication:
    title: str
    authors: str
    venue: str
    year: int | None
    link: str
    resources: List[dict[str, str]] = field(default_factory=list)

    def to_dict(self) -> dict:
        payload = {
            "title": self.title,
            "authors": self.authors,
            "venue": self.venue,
            "year": self.year,
            "link": self.link,
        }
        if self.resources:
            payload["resources"] = self.resources
        return payload


def _clean(fragment: str) -> str:
    """Remove HTML tags and decode HTML entities."""
    text = re.sub(r"<[^>]+>", "", fragment)
    return html.unescape(text).strip()


def parse_publications(html_text: str) -> List[Publication]:
    publications: List[Publication] = []
    for row in ROW_PATTERN.findall(html_text):
        title_match = TITLE_PATTERN.search(row)
        if not title_match:
            continue
        title = _clean(title_match.group(1))
        if not title:
            continue
        if title.lower().startswith("the students will learn"):
            continue

        link_match = LINK_PATTERN.search(row)
        relative_link = link_match.group(1) if link_match else ""
        link = urljoin(BASE_URL, relative_link) if relative_link else BASE_URL

        detail_matches = [
            _clean(fragment) for fragment in GRAY_PATTERN.findall(row)
        ]
        authors = detail_matches[0] if detail_matches else ""
        venue = detail_matches[1] if len(detail_matches) > 1 else ""

        year_match = YEAR_PATTERN.search(row)
        year = int(year_match.group(1)) if year_match else None

        publications.append(Publication(title, authors, venue, year, link))

    return publications


def fetch_all_publications(user_id: str) -> List[Publication]:
    accumulated: List[Publication] = []
    seen = set()
    for page_index in range(MAX_PAGES):
        start = page_index * 100
        url = PAGE_TEMPLATE.format(user=user_id, start=start)
        try:
            request = Request(url, headers=HEADERS)
            with urlopen(request, timeout=30) as response:
                page_html = response.read().decode("utf-8", errors="ignore")
        except (HTTPError, URLError) as err:
            raise RuntimeError(f"Failed to download Scholar page: {err}") from err

        page_publications = parse_publications(page_html)
        if not page_publications:
            break

        unique_items = [
            pub for pub in page_publications
            if (pub.title, pub.year) not in seen
        ]
        for item in unique_items:
            seen.add((item.title, item.year))
        accumulated.extend(unique_items)

        if len(page_publications) < 100:
            break

    accumulated.sort(
        key=lambda pub: ((pub.year or 0), pub.title.lower()),
        reverse=True,
    )
    apply_resource_overrides(accumulated)
    return accumulated


def apply_resource_overrides(publications: List[Publication]) -> None:
    for pub in publications:
        overrides = RESOURCE_OVERRIDES.get(pub.title)
        if overrides:
            pub.resources = overrides


def write_payload(publications: Iterable[Publication], destination: Path) -> None:
    publication_list = [pub.to_dict() for pub in publications]
    payload = {
        "source": PAGE_TEMPLATE.format(user=SCHOLAR_USER_ID, start=0),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "count": len(publication_list),
        "publications": publication_list,
    }

    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2, ensure_ascii=False))


def main() -> None:
    project_root = Path(__file__).resolve().parents[1]
    data_path = project_root / "data" / "publications.json"

    publications = fetch_all_publications(SCHOLAR_USER_ID)
    if not publications:
        raise RuntimeError("No publications parsed. Google Scholar layout may have changed.")

    write_payload(publications, data_path)
    print(f"Wrote {len(publications)} publications to {data_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
