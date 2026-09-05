# Royal Square Portal

Royal Square Portal is a digital financial-planning and compliance-readiness platform for Royal Square Financial.

The hackathon MVP focuses on reducing repetitive manual onboarding and Financial Needs Analysis (FNA) data capture by turning client financial documents into structured, adviser-verifiable data that can populate Royal Square's existing FNA workbook.

## Problem

Royal Square's current financial-planning process depends on client documents and written records such as:

- Client Consent to Obtain Information
- Notice of Appointment as a Financial Advisor
- FAIS Disclosure Record
- Service Level Agreement
- Financial Needs Analysis information collection workbook

The current workflow can require repeated manual data capture across multiple documents and systems. The MVP aims to reduce this duplication while preserving human adviser review.

## MVP

The MVP will:

- accept client financial documents such as South African ID documents, payslips, bank statements and IRP5 certificates;
- extract structured client and financial data;
- validate extracted fields using a strict Pydantic schema;
- validate South African 13-digit ID numbers using a Luhn checksum;
- allow an adviser to review and correct extracted data;
- populate the existing Royal Square FNA workbook;
- calculate Total Assets, Total Liabilities, Net Worth and Monthly Disposable Income;
- display compliance-readiness warnings where information or documents are missing.

## Core Workflow

```text
Upload Documents
      ↓
Structured AI Extraction
      ↓
Pydantic Validation
      ↓
Adviser Verification
      ↓
FNA Workbook Population
      ↓
Compliance Readiness
      ↓
Processed FNA
```

## Roles

### Client
- Upload onboarding and financial documents.
- Review personal information where appropriate.
- Provide outstanding documents.
- View onboarding progress.

### Adviser
- Review extracted FNA data.
- Correct or approve extracted values.
- Monitor compliance-readiness items.
- Generate/download the populated FNA workbook.

## Tech Stack

### Frontend
- React
- Tailwind CSS
- Shadcn UI
- Lucide Icons
- Lovable

### Backend
- Python
- FastAPI
- Pydantic
- OpenAI API
- pandas
- openpyxl

### Version Control
- Git
- GitHub
- Feature branches
- Pull requests into `develop`
- Stable releases merged into `main`

## Repository Structure

```text
royal-square-portal/
├── frontend/
├── backend/
├── docs/
│   ├── PROBLEM_STATEMENT.md
│   ├── MVP_SCOPE.md
│   ├── ARCHITECTURE.md
│   ├── FNA_DATA_MODEL.md
│   ├── FUTURE_ROADMAP.md
│   └── TEAM_WORKFLOW.md
├── CONTRIBUTING.md
├── .gitignore
├── .env.example
└── README.md
```

## Important Product Principle

The system does **not** automatically provide financial advice or declare a client compliant.

AI output is treated as a draft. A human adviser must verify extracted information before it becomes part of the final FNA workflow.

## Future Phase

A smart short-term motor claims workflow may be developed later as Phase 2. It is intentionally outside the hackathon MVP.

See `docs/FUTURE_ROADMAP.md`.
