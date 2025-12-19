#!/usr/bin/env python3
import argparse
import re
from collections import defaultdict

CATEGORY_RE = re.compile(r"^##\s+(.+?)(?:\s+\((\d+)\))?\s*$")
TAG_RE = re.compile(r"^-\s+`([^`]+)`\s+—\s+(\d+)\s*$")

GENERAL_CATEGORIES = {"other", "name_title_misc"}

NSFW_EXPLICIT_TOKENS = {
    "sex",
    "intercourse",
    "penetration",
    "penetrated",
    "penetrating",
    "masturbation",
    "orgasm",
    "ejaculation",
    "cum",
    "fellatio",
    "blowjob",
    "handjob",
    "anal",
    "vaginal",
    "oral",
    "futanari",
    "futa",
    "rape",
    "molestation",
    "incest",
    "bestiality",
}

NSFW_NUDITY_TOKENS = {
    "nude",
    "naked",
    "topless",
    "bottomless",
    "nudity",
}

VIOLENCE_TOKENS = {
    "blood",
    "gore",
    "decapitation",
    "severed",
    "dismembered",
    "corpse",
    "wound",
    "injury",
    "guts",
    "torture",
    "murder",
}

CAMERA_EXACT = {
    "full_body",
    "upper_body",
    "lower_body",
    "cowboy_shot",
    "close_up",
    "close-up",
    "wide_shot",
    "extreme_close_up",
    "profile",
    "front_view",
    "back_view",
    "side_view",
    "from_above",
    "from_below",
    "from_behind",
    "from_side",
    "from_front",
    "from_back",
    "bird's_eye_view",
    "overhead",
    "panorama",
    "wide_angle",
    "dutch_angle",
}

POSE_TOKENS = {
    "sitting",
    "standing",
    "lying",
    "kneeling",
    "running",
    "walking",
    "jumping",
    "floating",
    "dancing",
    "pointing",
    "looking",
    "leaning",
    "stretching",
    "waving",
    "salute",
    "hugging",
    "head",
    "tilt",
    "on",
}

POSE_EXACT = {
    "head_tilt",
    "looking_at_viewer",
    "looking_at_another",
    "looking_to_the_side",
    "looking_up",
    "looking_down",
    "pointing_at_viewer",
    "on_bed",
    "on_side",
    "on_back",
    "on_stomach",
    "on_floor",
    "sitting_on_lap",
}

EXPRESSION_TOKENS = {
    "smile",
    "smiling",
    "grin",
    "frown",
    "blush",
    "crying",
    "tears",
    "teary",
    "angry",
    "sad",
    "happy",
    "surprised",
    "scared",
    "embarrassed",
    "laughing",
    "laugh",
    "wink",
    "winking",
}

CLOTHING_TOKENS = {
    "clothes",
    "clothing",
    "dress",
    "skirt",
    "shirt",
    "blouse",
    "sleeve",
    "sleeves",
    "sleeveless",
    "jacket",
    "coat",
    "hood",
    "hoodie",
    "cape",
    "cloak",
    "poncho",
    "vest",
    "sweater",
    "cardigan",
    "apron",
    "robe",
    "kimono",
    "yukata",
    "hakama",
    "uniform",
    "pants",
    "shorts",
    "jeans",
    "trousers",
    "leggings",
    "tights",
    "pantyhose",
    "stockings",
    "thighhighs",
    "socks",
    "shoes",
    "boots",
    "sneakers",
    "heels",
    "sandals",
    "slippers",
    "gloves",
    "mittens",
    "gauntlets",
    "bra",
    "panties",
    "underwear",
    "bikini",
    "swimsuit",
    "swimwear",
    "leotard",
    "bodysuit",
    "tie",
    "necktie",
    "bowtie",
    "ribbon",
    "bow",
    "belt",
    "suspenders",
    "scarf",
    "collar",
    "choker",
    "necklace",
    "earring",
    "earrings",
    "bracelet",
    "ring",
    "jewelry",
    "hairband",
    "headband",
    "hairclip",
    "hairpin",
    "headdress",
    "mask",
    "hat",
    "cap",
    "helmet",
    "crown",
    "tiara",
    "veil",
    "sash",
    "garter",
    "frill",
    "frills",
    "ruffle",
    "ruffles",
    "lace",
    "serafuku",
    "tank",
    "crop",
    "hooded",
    "glasses",
    "goggles",
    "nail",
    "polish",
}

ANATOMY_TOKENS = {
    "hair",
    "ponytail",
    "twintails",
    "braid",
    "braids",
    "bangs",
    "sidelocks",
    "ahoge",
    "bun",
    "buns",
    "pigtails",
    "bob",
    "curl",
    "curls",
    "eye",
    "eyes",
    "mouth",
    "lips",
    "tongue",
    "teeth",
    "fang",
    "ear",
    "ears",
    "horn",
    "horns",
    "tail",
    "wing",
    "wings",
    "collarbone",
    "midriff",
    "navel",
    "skin",
    "face",
    "nose",
    "cheek",
    "chin",
    "eyebrow",
    "eyebrows",
    "freckle",
    "freckles",
    "scar",
    "tattoo",
    "muscle",
    "abs",
    "hips",
    "thigh",
    "thighs",
    "leg",
    "legs",
    "arm",
    "arms",
    "hand",
    "hands",
    "foot",
    "feet",
    "toe",
    "toes",
    "finger",
    "fingers",
    "collarbone",
    "barefoot",
    "sweat",
    "fangs",
}

STYLE_TOKENS = {
    "sketch",
    "lineart",
    "watercolor",
    "painting",
    "oil",
    "pixel",
    "pixelart",
    "pixel_art",
    "3d",
    "cgi",
    "comic",
    "manga",
    "anime",
    "illustration",
    "game",
    "cg",
    "traditional",
    "photoshop",
    "screenshot",
}

COLOR_TOKENS = {
    "red",
    "blue",
    "green",
    "yellow",
    "orange",
    "purple",
    "pink",
    "white",
    "black",
    "grey",
    "gray",
    "brown",
    "blonde",
    "blond",
    "silver",
    "gold",
    "aqua",
    "teal",
    "cyan",
    "magenta",
    "violet",
    "indigo",
    "turquoise",
    "monochrome",
    "greyscale",
    "grayscale",
    "sepia",
    "pastel",
    "neon",
    "rainbow",
    "colorful",
}

LIGHTING_TOKENS = {
    "sunlight",
    "moonlight",
    "backlight",
    "rimlight",
    "spotlight",
    "glow",
    "shadow",
    "shadows",
    "bright",
    "dark",
    "silhouette",
    "lens",
    "flare",
}

LOCATION_TOKENS = {
    "beach",
    "forest",
    "mountain",
    "sky",
    "cloud",
    "outdoors",
    "indoors",
    "room",
    "bedroom",
    "bathroom",
    "kitchen",
    "classroom",
    "street",
    "city",
    "park",
    "garden",
    "desert",
    "ocean",
    "lake",
    "river",
    "sea",
    "snow",
    "rain",
    "day",
    "night",
    "sunset",
    "sunrise",
    "field",
    "house",
    "home",
    "building",
    "church",
    "space",
    "bed",
}

TEXT_TOKENS = {
    "text",
    "caption",
    "subtitle",
    "speech",
    "bubble",
    "logo",
    "watermark",
    "signature",
    "english",
    "japanese",
    "kanji",
    "hiragana",
    "katakana",
    "letter",
    "letters",
    "number",
    "numbers",
    "symbol",
    "symbols",
    "emoji",
    "emoticon",
    "sound",
    "effect",
    "commentary",
    "heart",
}

META_TOKENS = {
    "bad",
    "lowres",
    "highres",
    "absurdres",
    "censored",
    "mosaic",
    "username",
    "id",
    "name",
    "request",
}

SUBJECT_COUNT_EXACT = {
    "solo",
    "duo",
    "trio",
    "group",
    "couple",
    "crowd",
    "multiple",
    "no_humans",
    "solo_focus",
    "male_focus",
    "female_focus",
}

WEAPON_TOKENS = {
    "weapon",
    "gun",
    "rifle",
    "pistol",
    "sword",
    "katana",
    "knife",
    "dagger",
    "axe",
    "bow",
    "arrow",
    "spear",
    "lance",
    "staff",
    "wand",
    "hammer",
    "mace",
    "whip",
    "scythe",
    "blade",
    "shield",
}


def _tokenize(tag: str):
    tag = tag.lower().strip()
    paren_parts = re.findall(r"\(([^)]+)\)", tag)
    paren_tokens = []
    for part in paren_parts:
        paren_tokens.extend([t for t in re.split(r"[_\-\s]+", part) if t])
    tag_no_paren = re.sub(r"\([^)]*\)", "", tag)
    tokens = [t for t in re.split(r"[_\-]+", tag_no_paren) if t]
    return tag, tokens, paren_tokens


def _has_any(tokens, wanted):
    return any(token in wanted for token in tokens)


def _matches_prefix(tag, prefix):
    return tag.startswith(prefix)


def _matches_suffix(tag, suffix):
    return tag.endswith(suffix)


def classify_tag(tag: str, raw_category: str) -> str:
    if raw_category not in GENERAL_CATEGORIES:
        return raw_category

    tag_l, tokens, paren_tokens = _tokenize(tag)
    all_tokens = tokens + paren_tokens

    if _has_any(all_tokens, NSFW_EXPLICIT_TOKENS):
        return "nsfw_explicit"
    if _has_any(all_tokens, NSFW_NUDITY_TOKENS):
        return "nsfw_nudity"

    if _has_any(all_tokens, VIOLENCE_TOKENS):
        return "violence_gore"

    if tag_l in CAMERA_EXACT:
        return "camera_composition"
    if _matches_prefix(tag_l, "from_"):
        return "camera_composition"
    if _matches_suffix(tag_l, "_view") or "view" in all_tokens:
        if "review" not in tag_l:
            return "camera_composition"

    if tag_l in POSE_EXACT:
        return "pose_action"
    if _matches_prefix(tag_l, "looking_"):
        return "pose_action"
    if _has_any(all_tokens, POSE_TOKENS) and any(tok in {"sitting", "standing", "lying", "kneeling", "running", "walking", "jumping", "leaning"} for tok in all_tokens):
        return "pose_action"

    if _has_any(all_tokens, EXPRESSION_TOKENS):
        return "expression_emotion"

    if _has_any(all_tokens, SUBJECT_COUNT_EXACT):
        return "subject_count"
    if re.match(r"^\d+(girl|girls|boy|boys|person|people|man|men|woman|women|child|children|animal|animals|object|objects)$", tag_l):
        return "subject_count"

    if _has_any(all_tokens, CLOTHING_TOKENS):
        return "clothing_accessories"
    if _matches_suffix(tag_l, "_sleeves") or _matches_suffix(tag_l, "_thighhighs"):
        return "clothing_accessories"

    if _has_any(all_tokens, ANATOMY_TOKENS):
        return "anatomy_body"

    if _has_any(all_tokens, STYLE_TOKENS) or "medium" in paren_tokens:
        return "style_medium"

    if _has_any(all_tokens, LIGHTING_TOKENS):
        return "lighting"

    if _has_any(all_tokens, LOCATION_TOKENS):
        return "location_scene"

    if _has_any(all_tokens, TEXT_TOKENS):
        return "text_symbols"

    if tag_l.startswith("bad_"):
        return "meta_quality"
    if _matches_suffix(tag_l, "_id") or _matches_suffix(tag_l, "_name"):
        return "meta_quality"
    if _has_any(all_tokens, META_TOKENS) and any(tok in {"censored", "mosaic", "request"} for tok in all_tokens):
        return "meta_quality"

    if _has_any(all_tokens, WEAPON_TOKENS):
        if "weapon" in all_tokens or "weapon" in paren_tokens:
            return "weapons_tools"

    return raw_category


def parse_tags(path):
    entries = []
    categories_in_order = []
    current_category = None
    with open(path, "r", encoding="utf-8") as handle:
        for line in handle:
            line = line.rstrip("\n")
            m_cat = CATEGORY_RE.match(line.strip())
            if m_cat:
                current_category = (m_cat.group(1) or "").strip()
                if current_category not in categories_in_order:
                    categories_in_order.append(current_category)
                continue
            m_tag = TAG_RE.match(line.strip())
            if m_tag:
                tag = (m_tag.group(1) or "").strip()
                if not tag:
                    continue
                try:
                    count = int(m_tag.group(2) or "0")
                except Exception:
                    count = 0
                entries.append({"tag": tag, "count": count, "category": current_category or ""})
    return entries, categories_in_order


def write_tags(path, groups, ordered_categories):
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("# Danbooru Tag Reference (by category)\n\n")
        for category in ordered_categories:
            items = groups.get(category)
            if not items:
                continue
            handle.write(f"## {category} ({len(items)})\n\n")
            for entry in items:
                handle.write(f"- `{entry['tag']}` — {entry['count']}\n")
            handle.write("\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/danbooru_tags.md")
    parser.add_argument("--output", default="data/danbooru_tags.md")
    args = parser.parse_args()

    entries, categories_in_order = parse_tags(args.input)

    groups = defaultdict(list)
    for entry in entries:
        new_category = classify_tag(entry["tag"], entry["category"])
        entry = {**entry, "category": new_category}
        groups[new_category].append(entry)

    for category, items in groups.items():
        items.sort(key=lambda e: (-int(e.get("count") or 0), e.get("tag", "").lower()))

    ordered_categories = [c for c in categories_in_order if c in groups]
    extras = sorted([c for c in groups.keys() if c not in ordered_categories])
    ordered_categories.extend(extras)

    write_tags(args.output, groups, ordered_categories)


if __name__ == "__main__":
    main()
