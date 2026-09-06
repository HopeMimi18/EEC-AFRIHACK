# Adviser Navigation Fix

This patch fixes the non-responsive adviser sidebar items:

- FNA Records is renamed to **FNA Analysis** and scrolls to the FNA Financial Position section.
- Compliance Readiness scrolls to the Compliance Readiness panel.

Apply from the project root:

```powershell
python .\scripts\APPLY_ADVISER_NAV_FIX.py
```

Then:

```powershell
cd .\frontend
npm run build
npm run dev
```
