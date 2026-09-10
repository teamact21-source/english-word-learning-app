#!/usr/bin/env python3
"""Build the app word list from CEFR-J 1.6 and the CC0 EJDict dictionary."""

import argparse
import glob
import json
import re
from pathlib import Path

import openpyxl

WORD_RE = re.compile(r"^[A-Za-z]+(?:[-'][A-Za-z]+)?$")
OVERRIDES = {
    "a": "一つの、ある",
    "i": "私",
    "be": "〜である、いる",
    "do": "する",
    "have": "持っている",
    "can": "〜できる",
    "will": "〜するつもり、〜だろう",
    "may": "〜してもよい、〜かもしれない",
    "must": "〜しなければならない",
    "about": "〜について、およそ",
}


def clean_gloss(text: str) -> str:
    text = re.sub(r"《[^》]*》", "", text)
    text = re.sub(r"〈[^〉]*〉", "", text)
    text = re.sub(r"\[[^]]*\]", "", text)
    text = re.sub(r"^\([^)]*\)\s*", "", text)
    text = re.sub(r"\([^)]*[A-Za-z][^)]*\)", "", text)
    text = re.sub(r"^\d+[.)]?\s*", "", text)
    text = text.replace("…", "").replace("～", "〜")
    text = re.split(r"\s*/\s*|;|；", text, maxsplit=1)[0]
    text = text.replace("『", "").replace("』", "").replace(",", "、")
    text = re.sub(r"^[・,，、\s]+|[・,，、\s]+$", "", text)
    text = re.sub(r"\s+", " ", text)
    return text[:60].strip()


def load_dictionary(src_dir: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for filename in glob.glob(str(src_dir / "*.txt")):
        for line in Path(filename).read_text(encoding="utf-8").splitlines():
            if "\t" not in line:
                continue
            keys, gloss = line.split("\t", 1)
            cleaned = clean_gloss(gloss)
            if not cleaned or not re.search(r"[ぁ-んァ-ヶ一-龠]", cleaned):
                continue
            for key in keys.split(","):
                normalized = key.strip().lower()
                if WORD_RE.fullmatch(normalized):
                    result.setdefault(normalized, cleaned)
    return result


def load_cefr(path: Path) -> list[dict[str, str]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    entries: dict[str, dict[str, str]] = {}
    for level in ("A1", "A2", "B1"):
        for row in list(workbook[f"{level}_sep"].values)[1:]:
            headword, pos = str(row[0] or "").strip(), str(row[1] or "").strip()
            normalized = headword.lower()
            if not WORD_RE.fullmatch(headword) or (len(normalized) == 1 and normalized not in {"a", "i"}):
                continue
            entries.setdefault(normalized, {"english": headword, "level": level, "pos": pos})
    return list(entries.values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cefr", required=True, type=Path)
    parser.add_argument("--ejdict-src", required=True, type=Path)
    parser.add_argument("--frequency", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    dictionary = load_dictionary(args.ejdict_src)
    frequency = {
        word.strip().lower(): rank
        for rank, word in enumerate(args.frequency.read_text(encoding="utf-8").splitlines())
        if WORD_RE.fullmatch(word.strip())
    }
    candidates = []
    for item in load_cefr(args.cefr):
        key = item["english"].lower()
        meaning = OVERRIDES.get(key, dictionary.get(key))
        if meaning:
            candidates.append({**item, "japanese": meaning, "rank": frequency.get(key, 100_000)})

    level_rank = {"A1": 0, "A2": 1, "B1": 2}
    candidates.sort(key=lambda item: (level_rank[item["level"]], item["rank"], item["english"].lower()))
    review = candidates[:1800]
    review_words = {item["english"].lower() for item in review}
    exam_pool = [item for item in candidates if item["english"].lower() not in review_words]
    exam_pool.sort(key=lambda item: (item["rank"], level_rank[item["level"]], item["english"].lower()))
    exam = exam_pool[:500]

    output = []
    for course, items in (("review", review), ("exam", exam)):
        for item in items:
            output.append({
                "english": item["english"],
                "japanese": item["japanese"],
                "course": course,
                "level": item["level"],
                "pos": item["pos"],
            })
    if len(output) != 2300:
        raise RuntimeError(f"Expected 2300 words, generated {len(output)}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"total": len(output), "review": len(review), "exam": len(exam)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
