from pathlib import Path

BASE_DIR = Path('docs/terms')
LANGUAGE_MAP = {
    'en': 'en',
    'fr': 'fr',
    'es': 'es',
    'it': 'it',
    'de': 'de',
}

for locale, lang_code in LANGUAGE_MAP.items():
    path = BASE_DIR / f'terms-{locale}.html'
    if not path.exists():
        continue
    content = path.read_text(encoding='utf-8')
    updated = content.replace('lang="ro"', f'lang="{lang_code}"')
    path.write_text(updated, encoding='utf-8')
