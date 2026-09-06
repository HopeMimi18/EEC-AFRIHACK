from pathlib import Path

app_path = Path("frontend/src/App.tsx")
css_path = Path("frontend/src/App.css")

if not app_path.exists():
    raise SystemExit("Could not find frontend/src/App.tsx. Run this script from the project root.")

app = app_path.read_text(encoding="utf-8")

old_fna = '''            <button className="nav-item">
              <WalletCards
                size={19}
              />
              FNA Records
            </button>'''

new_fna = '''            <button
              className="nav-item"
              type="button"
              onClick={() =>
                document
                  .getElementById("fna-analysis")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <WalletCards
                size={19}
              />
              FNA Analysis
            </button>'''

old_compliance = '''            <button className="nav-item">
              <ShieldCheck
                size={19}
              />
              Compliance Readiness
            </button>'''

new_compliance = '''            <button
              className="nav-item"
              type="button"
              onClick={() =>
                document
                  .getElementById("compliance-readiness")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <ShieldCheck
                size={19}
              />
              Compliance Readiness
            </button>'''

old_fna_compact = '''            <button className="nav-item">
              <WalletCards size={19} />
              FNA Records
            </button>'''

new_fna_compact = '''            <button
              className="nav-item"
              type="button"
              onClick={() =>
                document
                  .getElementById("fna-analysis")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <WalletCards size={19} />
              FNA Analysis
            </button>'''

old_compliance_compact = '''            <button className="nav-item">
              <ShieldCheck size={19} />
              Compliance Readiness
            </button>'''

new_compliance_compact = '''            <button
              className="nav-item"
              type="button"
              onClick={() =>
                document
                  .getElementById("compliance-readiness")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
            >
              <ShieldCheck size={19} />
              Compliance Readiness
            </button>'''

changed = False

if old_fna in app:
    app = app.replace(old_fna, new_fna, 1)
    changed = True
elif old_fna_compact in app:
    app = app.replace(old_fna_compact, new_fna_compact, 1)
    changed = True
elif 'FNA Analysis' not in app:
    print("WARNING: Could not automatically locate the FNA Records navigation button.")

if old_compliance in app:
    app = app.replace(old_compliance, new_compliance, 1)
    changed = True
elif old_compliance_compact in app:
    app = app.replace(old_compliance_compact, new_compliance_compact, 1)
    changed = True
elif 'id="compliance-readiness"' not in app:
    print("WARNING: Could not automatically locate the Compliance Readiness navigation button.")

compliance_call = '''              <CompliancePanel
                readiness={
                  result.compliance_readiness
                }
              />'''

compliance_wrapped = '''              <div
                id="compliance-readiness"
                className="nav-scroll-target"
              >
                <CompliancePanel
                  readiness={
                    result.compliance_readiness
                  }
                />
              </div>'''

if 'id="compliance-readiness"' not in app:
    if compliance_call in app:
        app = app.replace(compliance_call, compliance_wrapped, 1)
        changed = True
    else:
        print("WARNING: Could not automatically locate the adviser CompliancePanel.")

summary_old = '''              <section className="summary-section">'''
summary_new = '''              <section
                id="fna-analysis"
                className="summary-section nav-scroll-target"
              >'''

if 'id="fna-analysis"' not in app:
    pos = app.find("FNA SUMMARY")
    if pos != -1:
        before = app.rfind(summary_old, 0, pos)
        if before != -1:
            app = app[:before] + app[before:].replace(summary_old, summary_new, 1)
            changed = True
        else:
            print("WARNING: Found FNA SUMMARY but not its summary-section.")
    else:
        print("WARNING: Could not locate FNA SUMMARY.")

if changed:
    app_path.write_text(app, encoding="utf-8")
    print("Updated frontend/src/App.tsx")
else:
    print("No App.tsx changes were required, or the expected code was not found.")

if css_path.exists():
    css = css_path.read_text(encoding="utf-8")
    css_patch = '''
/* Adviser sidebar navigation targets */
.nav-scroll-target {
  scroll-margin-top: 24px;
}

.nav-item {
  cursor: pointer;
}

@media (max-width: 780px) {
  .nav-scroll-target {
    scroll-margin-top: 16px;
  }
}
'''
    if "/* Adviser sidebar navigation targets */" not in css:
        css_path.write_text(css.rstrip() + "\n\n" + css_patch.lstrip(), encoding="utf-8")
        print("Updated frontend/src/App.css")

print()
print("Navigation fix applied.")
print("FNA Analysis now scrolls to Financial Position.")
print("Compliance Readiness now scrolls to the compliance panel.")
