# Client Dashboard Integration

Add these two files to your project:

- `frontend/src/components/ClientExperience.tsx`
- `frontend/src/components/ClientExperience.css`

Then edit `frontend/src/App.tsx`.

## 1. Add the import

Near the other imports:

```tsx
import ClientExperience from "./components/ClientExperience";
```

## 2. Replace the existing client-role return

Find the block that starts like this:

```tsx
if (session.user.role === "client") {
```

Replace that entire `if` block with:

```tsx
if (session.user.role === "client") {
  return (
    <ClientExperience
      session={session}
      files={files}
      result={result}
      loading={loading}
      error={error}
      stage={stage}
      dragActive={dragActive}
      checklist={checklist}
      consent={consent}
      fileInputRef={fileInputRef}
      onAddFiles={addFiles}
      onRemoveFile={removeFile}
      onClearFiles={clearFiles}
      onProcess={handleProcess}
      onDragActive={setDragActive}
      onConsentChange={setConsent}
      onLogout={handleLogout}
    />
  );
}
```

## 3. Remove the old `ClientPortal` function

Your existing `ClientPortal(...)` component in `App.tsx` is no longer needed.

Delete the old function beginning with:

```tsx
function ClientPortal({
```

and ending just before the next component/function.

This prevents a TypeScript `noUnusedLocals` warning/error.

## 4. Build

From:

```powershell
C:\Users\hopel\Music\EEC-AFRIHACK\frontend
```

run:

```powershell
npm run build
```

Then:

```powershell
npm run dev
```

## Features added

Client navigation:
- Dashboard
- Financial Position
- Goals
- Documents

Dashboard:
- Net worth
- Income
- Expenses
- Disposable income
- Goal preview
- Upcoming reminder

Financial Position:
- Assets
- Liabilities
- Net worth
- Asset/liability visual
- Detailed financial breakdown

Goals:
- Progress percentage
- Target amount
- Amount saved
- Remaining amount
- Target date
- Editable saved amount
- Progress persists in browser localStorage for the signed-in demo client

Messages:
- Message icon with unread count
- Adviser update
- Financial review reminder
- Goal update
- Mark all as read

Documents:
- Existing upload workflow preserved
- Consent checkbox
- Document checklist
- Case status

The goal/message data is prototype demo data. Financial position uses the current FNA case when available and falls back to the existing synthetic demo values otherwise.
