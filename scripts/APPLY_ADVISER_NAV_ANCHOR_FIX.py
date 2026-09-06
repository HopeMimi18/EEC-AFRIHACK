
from pathlib import Path
import re

app_path = Path("frontend/src/App.tsx")
css_path = Path("frontend/src/App.css")

if not app_path.exists():
    raise SystemExit(
        "frontend/src/App.tsx not found. Run this script from "
        "C:\\Users\\hopel\\Music\\EEC-AFRIHACK"
    )

app = app_path.read_text(encoding="utf-8")

fna_pattern = re.compile(
    r'<button\s+className="nav-item"[^>]*>\s*'
    r'<WalletCards\b[^>]*?(?:/>|>\s*</WalletCards>)\s*'
    r'(?:FNA\s+Records|FNA\s+Analysis)\s*'
    r'</button>',
    re.IGNORECASE | re.DOTALL,
)

fna_replacement = '''<a
              className="nav-item"
              href="#fna-analysis"
            >
              <WalletCards size={19} />
              FNA Analysis
            </a>'''

app, fna_count = fna_pattern.subn(fna_replacement, app, count=1)

compliance_pattern = re.compile(
    r'<button\s+className="nav-item"[^>]*>\s*'
    r'<ShieldCheck\b[^>]*?(?:/>|>\s*</ShieldCheck>)\s*'
    r'Compliance(?:\s+Readiness)?\s*'
    r'</button>',
    re.IGNORECASE | re.DOTALL,
)

compliance_replacement = '''<a
              className="nav-item"
              href="#compliance-readiness"
            >
              <ShieldCheck size={19} />
              Compliance Readiness
            </a>'''

app, compliance_count = compliance_pattern.subn(
    compliance_replacement,
    app,
    count=1,
)

if 'id="compliance-readiness"' not in app:
    adviser_compliance = re.compile(
        r'(?P<indent>[ \t]*)'
        r'<CompliancePanel\s*'
        r'readiness=\{\s*result\.compliance_readiness\s*\}\s*'
        r'/>',
        re.DOTALL,
    )

    match = adviser_compliance.search(app)
    if match:
        indent = match.group("indent")
        original = match.group(0).lstrip()
        wrapped = (
            f'{indent}<div\n'
            f'{indent}  id="compliance-readiness"\n'
            f'{indent}  className="nav-scroll-target"\n'
            f'{indent}>\n'
            f'{indent}  {original}\n'
            f'{indent}</div>'
        )
        app = app[:match.start()] + wrapped + app[match.end():]

if 'id="fna-analysis"' not in app:
    app = app.replace(
        '<section className="summary-section">',
        '<section id="fna-analysis" '
        'className="summary-section nav-scroll-target">',
        1,
    )

app_path.write_text(app, encoding="utf-8")

if css_path.exists():
    css = css_path.read_text(encoding="utf-8")
    css_patch = '''
/* Native adviser sidebar navigation */
html {
  scroll-behavior: smooth;
}

.nav a.nav-item,
a.nav-item {
  text-decoration: none;
  font: inherit;
}

.nav-scroll-target {
  scroll-margin-top: 24px;
}
'''
    if "/* Native adviser sidebar navigation */" not in css:
        css_path.write_text(
            css.rstrip() + "\n\n" + css_patch.lstrip(),
            encoding="utf-8",
        )

checks = {
    "FNA navigation": 'href="#fna-analysis"' in app,
    "Compliance navigation": 'href="#compliance-readiness"' in app,
    "FNA target": 'id="fna-analysis"' in app,
    "Compliance target": 'id="compliance-readiness"' in app,
}

print("Adviser navigation anchor fix complete.")
for name, ok in checks.items():
    print(f"{name}: {ok}")

if not all(checks.values()):
    raise SystemExit(
        "\nThe expected navigation markers were not all found. "
        "Do not continue to Git yet."
    )
