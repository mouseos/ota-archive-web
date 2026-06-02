# -*- coding: utf-8 -*-
"""Generate Hugo content (one static page per firmware, per language) from the
ota-archive data. Run before `hugo`. Reads catalog.json + per-model index.json.

Usage: python scripts/gen_content.py [OTA_ROOT]
       OTA_ROOT defaults to $OTA_ROOT or ../ota-archive/OTA/Google
"""
import datetime
import json
import os
import re
import shutil
import sys

OTA_ROOT = (len(sys.argv) > 1 and sys.argv[1]) or os.environ.get("OTA_ROOT") \
    or "../ota-archive/OTA/Google"
OUT = "content"
LANGS = ["en", "ja", "zh", "zh-Hant"]

SEC_TITLE = {
    "devices": {"en": "All devices", "ja": "すべての機種", "zh": "所有设备", "zh-Hant": "所有裝置"},
    "search": {"en": "Search", "ja": "検索", "zh": "搜索", "zh-Hant": "搜尋"},
    "home": {"en": "Android OTA Archive", "ja": "Android OTA アーカイブ",
             "zh": "Android OTA 存档", "zh-Hant": "Android OTA 封存庫"},
}


def toml_str(s):
    s = "" if s is None else str(s)
    s = (s.replace("\\", "\\\\").replace('"', '\\"')
         .replace("\r", "").replace("\n", "\\n").replace("\t", "\\t"))
    return '"' + s + '"'


def toml_arr(xs):
    return "[" + ", ".join(toml_str(x) for x in (xs or [])) + "]"


def slug(s):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", (s or "").lower())).strip("-")


def build_id(fp):
    parts = (fp or "").split("/")
    return parts[3] if len(parts) >= 5 else (fp or "")


def rfc3339(ts):
    try:
        return datetime.datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception:
        return "2020-01-01T00:00:00Z"


def ym(ts):
    try:
        return datetime.datetime.utcfromtimestamp(int(ts)).strftime("%Y-%m")
    except Exception:
        return ""


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)


def section_index(lang, rel, title, weight=0, extra_params=None, layout=None):
    fm = ["+++", f"title = {toml_str(title)}"]
    if weight:
        fm.append(f"weight = {weight}")
    if layout:
        fm.append(f"layout = {toml_str(layout)}")
    fm.append("[params]")
    for k, v in (extra_params or {}).items():
        if isinstance(v, bool):
            fm.append(f"{k} = {'true' if v else 'false'}")
        elif isinstance(v, list):
            fm.append(f"{k} = {toml_arr(v)}")
        elif isinstance(v, (int, float)):
            fm.append(f"{k} = {v}")
        else:
            fm.append(f"{k} = {toml_str(v)}")
    fm.append("+++\n")
    write(os.path.join(OUT, lang, rel, "_index.md"), "\n".join(fm))


def load(path):
    try:
        return json.load(open(path, encoding="utf-8"))
    except Exception:
        return None


def main():
    catalog = load(os.path.join(OTA_ROOT, "catalog.json")) or {"groups": []}
    # reset generated content
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)

    fw_pages = 0
    for lang in LANGS:
        section_index(lang, ".", SEC_TITLE["home"][lang])
        section_index(lang, "search", SEC_TITLE["search"][lang], weight=90, layout="search")
        section_index(lang, "devices", SEC_TITLE["devices"][lang], weight=10)

        for g in catalog.get("groups", []):
            group = g.get("group", "")
            models = g.get("models", [])
            if not group or not models:
                continue
            section_index(lang, f"devices/{group}", group, extra_params={"group": group})

            for m in models:
                model = m.get("model", "")
                # prefer the official Google Play marketing name for display
                display = m.get("marketingName") or m.get("displayModel") or model
                retail = m.get("retailBranding", "") or m.get("manufacturer", "")
                section_index(
                    lang, f"devices/{group}/{model}", display,
                    extra_params={
                        "group": group, "model": model, "displayModel": display,
                        "rawModel": m.get("displayModel", model),
                        "manufacturer": m.get("manufacturer", ""),
                        "retailBranding": retail,
                        "brand": m.get("brand", ""),
                        "device": m.get("device", "") or "",
                        "productName": m.get("productName", "") or "",
                        "androidVersions": m.get("androidVersions", []) or [],
                        "sdks": m.get("sdks", []) or [],
                        "firstDate": ym(m.get("firstTimestamp")),
                        "latestDate": ym(m.get("latestTimestamp")),
                        "latestBuildId": m.get("latestBuildId", "") or "",
                        "firmwareCount": int(m.get("firmwareCount", 0) or 0),
                        "latestSecurityPatch": m.get("latestSecurityPatch", "") or "",
                        "otaTypes": m.get("otaTypes", []) or [],
                        "isModel": True,
                    },
                )

                index = load(os.path.join(OTA_ROOT, group, model, "index.json")) or {}
                used = {}
                for fw in index.get("firmware", []):
                    post = fw.get("postBuild", "")
                    bid = build_id(post)
                    base = slug(bid) or "fw"
                    used[base] = used.get(base, 0) + 1
                    name = base if used[base] == 1 else f"{base}-{used[base]}"
                    fm = [
                        "+++",
                        f"title = {toml_str(display + ' ' + bid)}",
                        f"date = {toml_str(rfc3339(fw.get('postTimestamp')))}",
                        "[params]",
                        f"group = {toml_str(group)}",
                        f"model = {toml_str(model)}",
                        f"displayModel = {toml_str(display)}",
                        f"rawModel = {toml_str(m.get('displayModel', model))}",
                        f"manufacturer = {toml_str(m.get('manufacturer',''))}",
                        f"retailBranding = {toml_str(retail)}",
                        f"buildId = {toml_str(bid)}",
                        f"preBuild = {toml_str(fw.get('preBuild',''))}",
                        f"postBuild = {toml_str(post)}",
                        f"securityPatch = {toml_str(fw.get('securityPatch',''))}",
                        f"sdk = {toml_str(fw.get('sdk',''))}",
                        f"sizeBytes = {int(fw.get('sizeBytes') or 0)}",
                        f"otaType = {toml_str(fw.get('otaType',''))}",
                        f"abType = {toml_str(fw.get('abType',''))}",
                        f"requiredCacheBytes = {int(fw.get('requiredCacheBytes') or 0)}",
                        f"partitions = {toml_arr(fw.get('partitions'))}",
                        f"hasFirmware = {'true' if fw.get('hasFirmware') else 'false'}",
                        f"hasApex = {'true' if fw.get('hasApex') else 'false'}",
                        f"otaUrl = {toml_str(fw.get('otaUrl',''))}",
                        f"archiveUrls = {toml_arr(fw.get('archiveUrls'))}",
                        f"source = {toml_str(fw.get('source',''))}",
                        f"description = {toml_str(fw.get('description',''))}",
                        "+++\n",
                    ]
                    write(os.path.join(OUT, lang, "devices", group, model, name + ".md"),
                          "\n".join(fm))
                    fw_pages += 1

    print(f"generated content for {len(LANGS)} languages, {fw_pages} firmware pages")


if __name__ == "__main__":
    main()
