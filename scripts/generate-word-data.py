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
    "as": "〜として、〜のように",
    "at": "〜で、〜に",
    "if": "もし〜ならば、〜かどうか",
    "in": "〜の中に、〜で",
    "of": "〜の、〜について",
    "am": "〜です、〜である",
    "pm": "午後",
    "cd": "CD、コンパクトディスク",
    "ok": "大丈夫な、よろしい",
    "left": "左の、左側の",
    "broken": "壊れた、故障した",
    "storey": "階、階層",
    "cheque": "小切手",
    "tour": "観光旅行、見学旅行",
    "best": "最もよい、最良の",
    "bird": "鳥",
    "cat": "猫",
    "ring": "指輪、輪",
    "coke": "コーラ",
    "math": "数学",
    "saturday": "土曜日",
    "budget": "予算",
    "wax": "ろう",
    "salt": "塩、食塩",
    "call": "呼び声、電話",
    "copy": "写し、複製",
    "group": "集団、グループ",
    "move": "動き、移動",
    "start": "開始、出発",
    "tooth": "歯",
    "tower": "塔、タワー",
    "august": "8月",
    "apron": "エプロン",
    "gas": "気体、ガス",
    "brake": "ブレーキ",
    "center": "中心、中央",
    "centre": "中心、中央",
    "control": "管理、制御",
    "knock": "ノック、たたく音",
    "support": "支え、支援",
    "tie": "ネクタイ、結びつき",
    "anxiety": "不安、心配",
    "command": "命令、指揮",
    "profession": "職業、専門職",
    "rubber": "ゴム",
    "slight": "軽視、侮辱",
}


def clean_gloss(text: str) -> str:
    text = re.sub(r"《[^》]*》", "", text)
    text = re.sub(r"〈[^〉]*〉", "", text)
    text = re.sub(r"\[[^]]*\]", "", text)
    text = re.sub(r"^\([^)]*\)\s*", "", text)
    text = re.sub(r"\([^)]*\)", "", text)
    text = text.replace("(", "").replace(")", "")
    text = re.sub(r"^\d+[.)]?\s*", "", text)
    text = text.replace("…", "").replace("～", "〜")
    text = re.split(r"\s*/\s*|;|；|・", text, maxsplit=1)[0]
    text = text.replace("『", "").replace("』", "").replace(",", "、")
    text = re.sub(r"^[・,，、\s]+|[・,，、\s]+$", "", text)
    text = re.sub(r"\s+", " ", text)
    return text[:60].strip()


def select_gloss(text: str, pos: str) -> str:
    text = re.sub(r"《[^》]*》|〈[^〉]*〉|\[[^]]*\]", "", text)
    chunks = [chunk for chunk in re.split(r"\s*/\s*|;|；|・", text) if chunk.strip()]
    options = [(chunk, clean_gloss(chunk)) for chunk in chunks]
    options = [(raw, clean) for raw, clean in options if clean and re.search(r"[ぁ-んァ-ヶ一-龠]", clean)]
    if not options:
        return clean_gloss(text)

    def score(option: tuple[str, str]) -> int:
        raw, clean = option
        value = 0
        verbish = bool(re.match(r"^(を|に|が)", clean) or re.search(r"(する|させる|られる|れる|める|える|せる|てる|れる|[くぐすつぬぶむるう])$", clean))
        noun_tag = bool(re.search(r"〈[UC]〉|〈C〉|〈U〉", raw))
        if pos == "noun":
            value += 10 if noun_tag else 0
            value -= 8 if verbish else 0
            value += 3 if re.search(r"(こと|もの|人|者|物|品|性|さ|力|所|場所|状態|行動|活動|旅行|声|音)$", clean) else 0
        elif pos == "verb":
            value += 7 if verbish else 0
            value -= 4 if noun_tag else 0
        elif pos == "adjective":
            value += 6 if re.search(r"(い|な|の|した|的な|できる)$", clean) else 0
            value -= 7 if re.match(r"^(を|に)", clean) else 0
            value -= 4 if noun_tag else 0
        return value

    return max(options, key=score)[1]


def load_dictionary(src_dir: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    priority: dict[str, int] = {}
    for filename in glob.glob(str(src_dir / "*.txt")):
        for line in Path(filename).read_text(encoding="utf-8").splitlines():
            if "\t" not in line:
                continue
            keys, gloss = line.split("\t", 1)
            if not clean_gloss(gloss) or not re.search(r"[ぁ-んァ-ヶ一-龠]", gloss):
                continue
            for key in keys.split(","):
                raw_key = key.strip()
                normalized = raw_key.lower()
                if WORD_RE.fullmatch(normalized):
                    score = 2 if raw_key == normalized else 1
                    if score > priority.get(normalized, 0):
                        result[normalized] = gloss
                        priority[normalized] = score
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
        raw_meaning = dictionary.get(key)
        meaning = OVERRIDES.get(key, select_gloss(raw_meaning, item["pos"]) if raw_meaning else None)
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
