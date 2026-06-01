# ota-archive-web

Static, multilingual (en / ja / zh) read-only site for the Android OTA archive,
built with **Hugo** + **beercss** and deployed to **GitHub Pages**.

Each firmware gets its own statically rendered page (so `sitemap.xml` and crawlers
pick them up). Browse by manufacturer → model, search client-side, view release
notes (sanitized HTML), and download from Google or the archive.org mirror.

## Data source
Read-only data is pulled at build time from the
[mouseos/ota-archive](https://github.com/mouseos/ota-archive) repo
(`OTA/Google/**`) and also read live (search) via cdn.jsdelivr.net. No backend.

## Build locally
```bash
git clone --depth 1 https://github.com/mouseos/ota-archive ../ota-archive
python scripts/gen_content.py ../ota-archive/OTA/Google   # generates content/{en,ja,zh}
hugo --minify --gc                                        # outputs to public/
```

## Structure
- `scripts/gen_content.py` — turns archive JSON into Hugo content (group/model
  sections + one page per firmware, per language).
- `layouts/` — beercss templates (list, firmware single, home, search).
- `i18n/` — UI strings (en/ja/zh). Firmware data and release notes are shown as-is.
- `.github/workflows/deploy.yml` — fetch data → generate → `hugo` → deploy Pages
  (on push, every 12h, and manual).
