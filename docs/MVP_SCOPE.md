# MVP Scope

## Objective

Deliver one working end-to-end flow that proves Royal Square can reduce repetitive FNA data entry using document extraction, structured validation and adviser verification.

## In Scope

### 1. Document Upload
Supported MVP files:

- PDF
- PNG
- JPEG

Target document types:

- South African ID document
- salary payslip
- bank statement
- IRP5 tax certificate
- proof of address, where available

### 2. Structured Data Extraction

Extract only information that is explicitly visible or reasonably supported by the uploaded document.

Target data categories:

- client demographics;
- employment information;
- income;
- assets;
- liabilities;
- household expenses.

### 3. Data Validation

The backend must:

- validate the payload using Pydantic;
- reject unexpected fields;
- require South African ID numbers to be 13 digits when present;
- run a Luhn checksum on the ID number;
- preserve missing values as `null` or empty lists instead of inventing data.

### 4. Human Verification

The adviser must be able to:

- compare the uploaded document with extracted data;
- edit incorrect values;
- review assets and liabilities;
- confirm the extracted information before final FNA generation.

### 5. FNA Population

The backend must populate the existing Royal Square FNA workbook after the legacy `.xls` file has been converted to `.xlsx`.

Required derived values:

- Total Assets
- Total Liabilities
- Net Worth
- Total Household Expenses
- Monthly Disposable Income

### 6. Compliance Readiness

The platform may display warnings such as:

- ID number missing or invalid;
- tax number missing;
- proof of address missing;
- proof of address appears older than the configured freshness threshold;
- net income missing;
- no liabilities extracted — adviser confirmation required.

These are **readiness warnings**, not legal conclusions.

### 7. Processed Workbook Download

The system should save a processed file using this naming format:

```text
[Client_Name]_FNA_Processed.xlsx
```

## Out of Scope for MVP

The following should not be built during the hackathon MVP:

- motor insurance claim tracking;
- direct insurer API submission;
- insurer authorisation;
- automated financial advice;
- automated product recommendations;
- automated suitability assessments;
- automatic compliance approval;
- production-grade authentication;
- production e-signature;
- real-time integration with banks or insurers;
- long-term document storage;
- use of real client data without appropriate approval and safeguards.

## Definition of Done

The MVP is done when this complete journey works:

```text
Upload document(s)
→ extract structured data
→ validate data
→ adviser reviews data
→ populate FNA workbook
→ download processed workbook
```

Anything outside that journey is secondary.
