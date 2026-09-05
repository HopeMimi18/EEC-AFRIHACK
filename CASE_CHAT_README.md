# Royal Square — Client ↔ Adviser Case Chat

This feature adds a deliberately small case communication channel. It is not a WhatsApp clone.

## What is included

Backend:
- `GET /api/v1/cases/{case_id}/messages`
- `POST /api/v1/cases/{case_id}/messages`
- client ownership enforcement
- adviser access through existing RBAC
- 2,000 character message limit
- message timestamps and sender role/name
- audit event when a message is sent
- in-memory prototype storage
- four chat tests

Frontend:
- reusable `CaseChat` component
- client message/reminder drawer now contains the live case chat
- adviser gets a `Case Conversation` panel when a case is open
- automatic refresh every 3 seconds
- message bubbles and timestamps
- existing goals/reminders remain intact

## Important prototype limitation

Messages use the existing in-memory case store. Restarting the FastAPI backend clears both cases and messages.

## Install

Copy/extract this feature pack over the project root:

`C:\Users\hopel\Music\EEC-AFRIHACK`

The paths inside this pack already match the repository layout.

## Test backend

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\backend
.\.venv\Scripts\Activate.ps1
python -m pytest -v
```

## Test frontend

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\frontend
npm run build
```

## Run

Backend:

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --reload-dir app
```

Frontend:

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\frontend
npm run dev
```

## Demo flow

1. Client signs in and submits documents.
2. Adviser signs in and opens the case.
3. Adviser sends a message from `Case Conversation`.
4. Sign out and sign in as the client.
5. Open the message icon.
6. The client sees the adviser message and replies.
7. Sign back in as adviser; the reply appears automatically.

Use the existing demo accounts:

Client: `client@demo.co.za` / `Client123!`

Adviser: `adviser@demo.co.za` / `Adviser123!`
