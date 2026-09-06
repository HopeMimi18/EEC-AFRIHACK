# Royal Square Portal

## Financial Onboarding & FNA Automation

Royal Square Portal is an **AfriHack 2026 prototype** that streamlines financial onboarding and Financial Needs Analysis (FNA) administration while keeping the financial adviser in control of verification and finalisation.

The platform provides separate client and adviser experiences for document submission, case review, compliance-readiness checks, case communication, financial-position summaries, and Royal Square FNA workbook generation.

> **Important:** The current prototype runs in a clearly labelled **Demo Mode** using synthetic client data. Demo Mode does not extract real values from uploaded documents. It exists so the complete workflow can be demonstrated safely without live client information or external AI/API credits.

---

## Problem

Financial advisers often receive client information across several documents, including:

- South African ID documents
- Payslips
- Bank statements
- IRP5 documents
- Proof of address

Manually transferring this information into an FNA workbook is repetitive, time-consuming, and prone to data-entry errors. Clients can also struggle to understand what has been submitted, what is still required, and what happens next.

Royal Square Portal reduces this administrative burden while preserving adviser verification and human judgement.

---

## Solution

The platform separates the workflow into two role-based experiences:

```text
CLIENT
  |
  |-- Sign in
  |-- Record consent
  |-- Upload financial documents
  |-- View case status
  |-- View financial position
  |-- Track financial goals
  |-- Message adviser
  |
  v
STRUCTURED FNA DATA
  |
  |-- Validation
  |-- Financial calculations
  |-- Compliance-readiness checks
  |
  v
ADVISER
  |
  |-- Review client cases
  |-- Edit / verify information
  |-- View audit trail
  |-- Message client
  |-- Finalise case
  |
  v
ROYAL SQUARE FNA WORKBOOK
```

The core design principle is:

> **Extractor/model prepares data -> application validates -> adviser verifies -> final FNA is generated**

The system does **not** provide automated financial advice and does **not** claim automatic FAIS or FICA compliance.

---

## Key Features

### Client Portal

- Role-based client sign-in
- Consent acknowledgement before document processing
- Multi-document upload
- Client-owned case access
- Financial-position dashboard
- Total assets, liabilities, net worth, household expenses, and disposable income
- Goal tracking
- Documents page
- Reminder/message panel
- Client-to-adviser case chat
- Sign-out navigation

### Adviser Portal

- Role-based adviser sign-in
- Adviser case queue
- Access to submitted client cases
- Editable adviser review
- Compliance Readiness panel
- Case-scoped client communication
- Audit trail
- Adviser-only finalisation
- Adviser-only final FNA download
- Revalidation before final workbook generation

### FNA Automation

- Structured Pydantic FNA schema
- South African ID validation
- Luhn checksum validation
- Asset and liability capture
- Household expense capture
- Deterministic financial calculations
- Royal Square Excel workbook population
- Timestamped `.xlsx` generation
- Protected processed-workbook download

### Security and Access Control

- Authenticated demo accounts
- Signed bearer tokens
- Role-Based Access Control (RBAC)
- Client case ownership enforcement
- Adviser-only privileged actions
- Consent requirement
- Audit trail for key case actions
- Protected download route
- Session stored in browser `sessionStorage`
- No raw client data committed to Git

### Client-Adviser Case Chat

Each onboarding case has a simple communication channel between the client and adviser.

Features include:

- Case-scoped messages
- Client can only access their own cases
- Adviser can access authorised client cases
- Sender name and role
- Message timestamps
- Automatic message refresh
- Audit event when a message is sent

The chat is intentionally lightweight and is **not** a WhatsApp clone.

> Prototype limitation: cases and messages are currently stored in backend memory and reset when the backend process restarts.

---

## Bonus Feature: Emergency Access

Royal Square includes a public **Emergency Access** feature that does **not require sign-in**.

It is available from the login/landing experience so anyone with access to the application can reach emergency information without entering the financial portal.

Configured emergency contacts include:

| Service | Number |
| --- | --- |
| General Emergency | `112` |
| Police Emergency | `10111` |
| Ambulance | `10177` |
| Roadside Assistance / Towing | `0861 000 234` |

The roadside-assistance entry is presented as a service contact rather than a universal public emergency number. Membership, eligibility, towing benefits, or service charges may apply.

### Offline Emergency Access

The emergency page uses a service worker so the emergency information can remain available after it has been cached on the device.

It also supports a locally saved **ICE (In Case of Emergency)** contact.

- No login required
- No bearer token required
- No backend request required for the emergency page
- ICE contact stored locally on the user's device
- Emergency page cached for offline access
- Main financial portal remains protected behind authentication

> Offline access to the emergency information does not guarantee that a phone call can be placed. Calling still depends on the device and available telephone/mobile service.

---

## Compliance Readiness

Royal Square uses the term **Compliance Readiness** rather than claiming automatic compliance.

The current checks can flag issues such as:

- Missing client consent
- Missing client name
- Missing or invalid South African ID
- Missing tax information
- Missing employer information
- Missing gross or net income
- Gross income lower than net income
- Missing expected document types
- Negative disposable income

Blocking issues can prevent adviser finalisation until the case has been corrected.

Royal Square Portal does **not**:

- provide automated financial advice
- guarantee FAIS compliance
- guarantee FICA compliance
- replace adviser judgement
- treat synthetic/demo information as verified client information

Human adviser verification remains part of the workflow.

---

## Financial Calculations

The application calculates:

```text
Total Assets
= Sum of all asset values

Total Liabilities
= Sum of all outstanding liability balances

Net Worth
= Total Assets - Total Liabilities

Total Household Expenses
= Sum of recorded monthly household expenses

Monthly Disposable Income
= Net Monthly Income - Total Household Expenses
```

These calculations are performed by the application rather than delegated to the extraction layer.

---

## Demo Mode

Demo Mode allows the end-to-end workflow to run without live client data or external AI credits.

Create:

```text
backend/.env
```

Example:

```env
DEMO_MODE=true
OPENAI_API_KEY=
APP_SECRET=replace-with-a-random-local-secret
```

The current prototype does **not rely on the OpenAI API** for the hackathon workflow.

When Demo Mode is enabled:

```text
Uploaded Documents
        |
        v
Synthetic Demo FNA Payload
        |
        v
Schema Validation
        |
        v
Financial Calculations
        |
        v
Compliance Readiness
        |
        v
Client / Adviser Case
        |
        v
Adviser Verification
        |
        v
Final Excel Workbook
```

The UI/API explicitly identifies Demo Mode and warns that the values were not extracted from the uploaded documents.

### Demo Client

```text
Client: Thando Mokoena
Employer: Ubuntu Digital Services

Gross Monthly Income: R42,000
Net Monthly Income: R31,500

Total Assets: R2,150,000
Total Liabilities: R1,145,000
Net Worth: R1,005,000
Household Expenses: R13,500
Monthly Disposable Income: R18,000
```

---

## Demo Accounts

### Client

```text
Email: client@demo.co.za
Password: Client123!
```

### Adviser

```text
Email: adviser@demo.co.za
Password: Adviser123!
```

These credentials are for the hackathon prototype only.

---

## Tech Stack

### Backend

- Python
- FastAPI
- Pydantic
- Uvicorn
- `openpyxl`
- `python-dotenv`
- `python-multipart`
- pytest
- HTTPX / FastAPI TestClient

### Frontend

- React
- TypeScript
- Vite
- Lucide React
- CSS
- Service Worker for offline emergency access

### Data / Documents

- Royal Square FNA Excel workbook template
- In-memory prototype case store
- Browser local storage for ICE contact and prototype goal progress
- Browser session storage for authenticated frontend session

---

## Project Structure

```text
EEC-AFRIHACK/
|
|-- backend/
|   |
|   |-- app/
|   |   |-- __init__.py
|   |   |-- main.py
|   |   |-- auth.py
|   |   |-- compliance.py
|   |   |-- schemas.py
|   |   |-- document_parser.py
|   |   `-- excel_populator.py
|   |
|   |-- data/
|   |   `-- processed/
|   |
|   |-- templates/
|   |   `-- 2025-01 02 FNA INFO COLLECT TEMPLATE.xlsx
|   |
|   |-- tests/
|   |   |-- test_auth.py
|   |   |-- test_chat.py
|   |   |-- test_compliance.py
|   |   |-- test_schemas.py
|   |   `-- test_excel_populator.py
|   |
|   |-- .env
|   |-- .env.example
|   `-- requirements.txt
|
|-- frontend/
|   |
|   |-- public/
|   |   |-- emergency.html
|   |   |-- emergency-sw.js
|   |   `-- emergency.webmanifest
|   |
|   `-- src/
|       |-- components/
|       |   |-- CaseChat.tsx
|       |   `-- ClientExperience.tsx
|       |
|       |-- lib/
|       |   `-- api.ts
|       |
|       |-- App.tsx
|       `-- App.css
|
|-- scripts/
|
|-- SECURITY_NOTES.md
|-- .gitignore
`-- README.md
```

---

## Backend Setup

### 1. Clone the repository

```bash
git clone https://github.com/HopeMimi18/EEC-AFRIHACK.git
cd EEC-AFRIHACK
```

### 2. Create and activate the virtual environment

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
pip install -r requirements.txt
```

### 4. Configure environment variables

Create:

```text
backend/.env
```

Example:

```env
DEMO_MODE=true
OPENAI_API_KEY=
APP_SECRET=replace-with-a-random-local-secret
```

Generate a local application secret with:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Never commit the real `.env` file.

---

## Frontend Setup

From the project root:

```powershell
cd frontend
npm install
```

The frontend expects the backend at:

```text
http://127.0.0.1:8000
```

For local development, the FastAPI CORS configuration allows localhost / `127.0.0.1` frontend origins.

---

## Running the Project

Run the backend and frontend in **two separate terminals**.

### Terminal 1 - Backend

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --reload-dir app
```

Backend:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

### Terminal 2 - Frontend

```powershell
cd C:\Users\hopel\Music\EEC-AFRIHACK\frontend
npm run dev
```

Open the exact URL printed by Vite, typically:

```text
http://localhost:5173
```

---

## Main API Endpoints

### Health / Authentication

```http
GET  /health
GET  /api/v1/auth/demo-accounts
POST /api/v1/auth/login
GET  /api/v1/auth/me
```

### Document Processing

```http
POST /api/v1/upload
POST /api/v1/extract-document
POST /api/v1/process-document
POST /api/v1/process-documents
```

### Cases

```http
GET /api/v1/cases
GET /api/v1/cases/{case_id}
```

### Case Communication

```http
GET  /api/v1/cases/{case_id}/messages
POST /api/v1/cases/{case_id}/messages
```

### Adviser Actions

```http
GET  /api/v1/cases/{case_id}/audit
POST /api/v1/cases/{case_id}/finalise
GET  /api/v1/download/{filename}
```

Adviser-only routes are protected by backend role checks.

---

## Testing

### Backend Tests

From:

```text
EEC-AFRIHACK/backend
```

run:

```powershell
python -m pytest -v
```

Current verified result:

```text
18 passed
```

Test coverage currently includes:

- demo authentication
- invalid password rejection
- signed-token validation
- tampered-token rejection
- document-type inference
- compliance-readiness blocking/warnings
- client/adviser case-chat access
- cross-client case access prevention
- empty-message rejection
- valid FNA payloads
- invalid SA ID length
- invalid SA ID checksum
- negative-income rejection
- unknown-field rejection
- Royal Square Excel workbook generation

### Frontend Build

From:

```text
EEC-AFRIHACK/frontend
```

run:

```powershell
npm run build
```

The production build should complete successfully before merging feature work into `main`.

---

## Security and Privacy

For the hackathon prototype:

- Use synthetic client information for demonstrations.
- Do not upload real client financial records for the demo.
- Do not commit `.env`.
- Do not commit credentials or secrets.
- Do not commit generated processed client workbooks.
- Keep adviser verification in the workflow.
- Keep finalisation and final workbook download adviser-only.

Recommended `.gitignore` entries:

```gitignore
.env
.venv/
backend/.venv/
backend/data/processed/
__pycache__/
.pytest_cache/
```

The current authentication, in-memory storage, and local browser storage are suitable for a prototype and should not be described as production-grade security or persistence.

---

## Current Prototype Limitations

- Demo Mode uses deterministic synthetic financial information.
- Uploaded files are validated but Demo Mode does not extract their real financial values.
- Cases, audit events, and chat messages are stored in memory and reset when the backend restarts.
- Goal tracking is prototype browser-local data.
- The ICE contact is stored locally in the browser/device.
- The emergency page must be loaded/cached before it can be used offline.
- Production identity management, encrypted persistent databases, cloud storage, monitoring, and deployment hardening are not yet implemented.

These limitations are intentionally visible rather than hidden from users or judges.

---

## Roadmap

### Completed Prototype

- Client and adviser role separation
- Multi-document onboarding
- Consent workflow
- Structured FNA schema
- Validation and financial calculations
- Compliance Readiness checks
- Royal Square Excel workbook population
- Adviser-editable verification
- Adviser-controlled finalisation
- Protected final FNA download
- Client financial-position dashboard
- Client goal tracking
- Client reminders
- Client-adviser case chat
- RBAC and case ownership
- Audit trail
- Offline Emergency Access
- ICE contact
- Roadside assistance / towing contact
- Automated backend tests
- Production frontend build

### Future Improvements

- Real local document extraction without external AI dependency
- Persistent database storage
- Persistent chat history
- Secure cloud deployment
- Production authentication / identity management
- Encrypted document storage
- Adviser/client notifications
- Improved document classification
- Production-grade observability and audit retention

---

## Hackathon Positioning

Royal Square Portal is not intended to replace financial advisers.

The project demonstrates how financial onboarding administration can be structured and automated while keeping human verification at the centre of the process.

The prototype focuses on:

1. **Reducing repetitive administration**
2. **Improving client visibility**
3. **Giving advisers structured review tools**
4. **Keeping privileged actions role-protected**
5. **Supporting communication through the client case**
6. **Providing useful emergency access without requiring authentication**

---

## Team

Built for **AfriHack 2026**.

Project:

**Royal Square Portal - Financial Onboarding & FNA Automation**
