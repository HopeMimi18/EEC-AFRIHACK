from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
FRONTEND = PROJECT / "frontend"

EXTENSIONS = {".tsx", ".ts", ".jsx", ".js", ".html", ".css", ".json", ".webmanifest"}

# Exact mojibake produced when UTF-8 text was read as Windows-1252.
REPLACEMENTS = {
    "â€”": "-",
    "â€“": "-",
    "â†’": "",
    "â†”": "/",
    "Â·": "|",
    "â€™": "'",
    "â€œ": '"',
    "â€\x9d": '"',
    "Â": "",
}

changed = []
remaining = []

for path in FRONTEND.rglob("*"):
    if (
        not path.is_file()
        or path.suffix.lower() not in EXTENSIONS
        or "node_modules" in path.parts
        or "dist" in path.parts
    ):
        continue

    try:
        text = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        continue

    original = text
    for bad, good in REPLACEMENTS.items():
        text = text.replace(bad, good)

    # Keep the visible sign-in labels deliberately plain.
    text = text.replace("Client Sign In →", "Client Sign In")
    text = text.replace("Adviser Sign In →", "Adviser Sign In")
    text = text.replace("Client Sign In  ", "Client Sign In ")
    text = text.replace("Adviser Sign In  ", "Adviser Sign In ")

    if text != original:
        path.write_text(text, encoding="utf-8", newline="\n")
        changed.append(path.relative_to(PROJECT))

    if any(marker in text for marker in ("â", "Â", "Ã", "ðŸ", "�")):
        remaining.append(path.relative_to(PROJECT))

print("Frontend encoding cleanup complete.")
if changed:
    print("Updated files:")
    for path in changed:
        print(f"  - {path}")
else:
    print("No source-file replacements were needed.")

if remaining:
    print("WARNING: suspicious characters remain in:")
    for path in remaining:
        print(f"  - {path}")
else:
    print("No common mojibake markers remain in frontend source files.")
