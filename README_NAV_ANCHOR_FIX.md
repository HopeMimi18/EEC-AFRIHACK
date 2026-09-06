# Royal Square Adviser Navigation Anchor Fix

This replaces the adviser sidebar's inactive buttons with native page anchors.

- FNA Analysis -> `#fna-analysis`
- Compliance Readiness -> `#compliance-readiness`

Apply from the repository root:

```powershell
python .\scripts\APPLY_ADVISER_NAV_ANCHOR_FIX.py
```

Verify:

```powershell
Select-String -Path .\frontend\src\App.tsx -Pattern 'href="#fna-analysis"','href="#compliance-readiness"','id="fna-analysis"','id="compliance-readiness"'
```

Then:

```powershell
cd .\frontend
npm run build
npm run dev
```
