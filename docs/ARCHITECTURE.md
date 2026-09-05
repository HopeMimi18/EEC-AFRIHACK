# Architecture

## High-Level Architecture

```text
                 ┌──────────────────────────────┐
                 │      Client / Adviser        │
                 └──────────────┬───────────────┘
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │ React + Tailwind + Shadcn    │
                 │        Lovable UI            │
                 └──────────────┬───────────────┘
                                │
                        multipart/form-data
                                │
                                ▼
                 ┌──────────────────────────────┐
                 │          FastAPI             │
                 │ /api/v1/process-document     │
                 └──────────────┬───────────────┘
                                │
                  ┌─────────────┼─────────────┐
                  │             │             │
                  ▼             ▼             ▼
          File Validation   AI Extraction   Validation
                            Structured      Pydantic
                            Output
                  │             │             │
                  └─────────────┼─────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │       FNADataPayload         │
                 └──────────────┬───────────────┘
                                │
                ┌───────────────┼────────────────┐
                │                                │
                ▼                                ▼
     Compliance Readiness              Adviser Verification
                │                                │
                └───────────────┬────────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │ pandas + openpyxl            │
                 │ FNA workbook population      │
                 └──────────────┬───────────────┘
                                ▼
                 ┌──────────────────────────────┐
                 │ Client_FNA_Processed.xlsx    │
                 └──────────────────────────────┘
```

## Frontend Responsibilities

The frontend should handle:

- document selection and drag-and-drop;
- upload progress;
- processing-state feedback;
- document preview;
- extracted field display;
- adviser field editing;
- readiness-warning display;
- processed workbook download.

The frontend must not contain API secrets.

## Backend Responsibilities

The FastAPI backend should handle:

- file-type validation;
- file-size validation;
- calls to the AI extraction service;
- Pydantic validation;
- South African ID validation;
- multi-document data merging;
- readiness checks;
- Excel population;
- processed workbook download.

## AI Extraction Boundary

The AI layer should:

- extract facts from documents;
- return structured data;
- return `null` when a value cannot be supported.

The AI layer should not:

- provide financial advice;
- invent missing values;
- determine client suitability;
- determine final compliance status;
- approve transactions.

## Data Flow

```text
Uploaded File
   ↓
File Validation
   ↓
AI Structured Extraction
   ↓
Pydantic Validation
   ↓
Merged FNA Payload
   ↓
Adviser Review
   ↓
Workbook Population
   ↓
Processed FNA
```

## Workbook Constraint

The supplied Royal Square FNA workbook is a legacy `.xls` file.

Because `openpyxl` works with `.xlsx`, the template must first be converted in Microsoft Excel:

```text
2025-01 02 FNA INFO COLLECT TEMPLATE.xls
        ↓ Save As
2025-01 02 FNA INFO COLLECT TEMPLATE.xlsx
```

The sheet name `Info Collect` must remain unchanged.

## Recommended Deployment Shape

For the hackathon:

```text
Frontend
Lovable / React

Backend
FastAPI

Local storage
Processed .xlsx files

Development database
Optional SQLite if persistence is needed
```

Production architecture can be designed later.
