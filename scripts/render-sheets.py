#!/usr/bin/env python3
"""Render the printable sheets to PDF for checking, without a browser.
Run scripts/ssr-check first so /tmp/ssr/*.html exists."""
import base64, pathlib, subprocess, sys
root = pathlib.Path(__file__).resolve().parent.parent
css = (root / 'src/styles.css').read_text()
font = base64.b64encode((root / 'src/assets/NotoSansRunic.woff2').read_bytes()).decode()
css = css.replace("url('./assets/NotoSansRunic.woff2')", f"url(data:font/woff2;base64,{font})")
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp')
for name in ['StrokeSheet', 'ChartSheet', 'Flashcards', 'Worksheets']:
    body = pathlib.Path(f'/tmp/ssr/{name}.html').read_text()
    html = (f"<!doctype html><html><head><meta charset='utf-8'><style>{css}\n"
            ".sheet{box-shadow:none;border:0;margin:0;width:auto;min-height:0;padding:10mm;page-break-after:always}"
            "@page{size:A4;margin:8mm}</style></head><body>" + body + "</body></html>")
    p = out / f'{name}.html'
    p.write_text(html)
    subprocess.run(['python3', '-m', 'weasyprint', str(p), str(out / f'{name}.pdf')], check=False, capture_output=True)
    print('rendered', name)
