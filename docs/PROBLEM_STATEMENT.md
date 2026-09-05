# Problem Statement

## Business Context

Royal Square Financial is an authorised financial services provider. Its client onboarding and financial-planning process relies on several formal documents and client data sources.

The available Royal Square documentation shows that:

- clients may grant consent for Royal Square to obtain financial information from banks, insurers, investment managers and related institutions for financial-planning purposes;
- a client may appoint Royal Square Financial and its adviser to obtain information needed to provide advice;
- the FSP is required to maintain appropriate systems, obtain relevant client information, keep proper records and comply with applicable regulatory obligations;
- clients remain responsible for the accuracy and completeness of the information they provide.

These requirements create a workflow where information quality, traceability and adviser review matter.

## Current Operational Problem

The onboarding and FNA process can involve repeated manual handling of data found across multiple documents, including:

- identity details;
- employment information;
- tax information;
- salary information;
- assets;
- liabilities;
- household expenditure;
- financial institution information;
- consent and appointment records.

When advisers need to retype or reconcile this information manually, the process can become:

- slow;
- repetitive;
- vulnerable to transcription errors;
- difficult to track across multiple documents;
- harder to audit;
- inconvenient for clients who must repeatedly provide the same information.

## Core Problem Statement

> How might Royal Square reduce repetitive manual client-data capture while preserving adviser verification, data accuracy and the integrity of the Financial Needs Analysis process?

## Proposed MVP Solution

Royal Square Portal will allow a client or adviser to upload supported financial documents.

The platform will:

1. extract factual information from those documents;
2. convert the extracted data into a strict FNA data structure;
3. validate key fields;
4. present the data to an adviser for human review;
5. populate the existing Royal Square FNA workbook;
6. show compliance-readiness warnings for missing or incomplete information.

## Target Users

### Primary User
Royal Square financial advisers who currently need to capture and review client information.

### Secondary User
Royal Square clients who need to submit documents and complete onboarding information.

## Success Criteria

The MVP is successful if it can demonstrate that:

- a real document can be uploaded;
- useful client data can be extracted;
- the extracted data is validated;
- the adviser can review/edit the extracted data;
- the existing FNA workbook can be populated;
- the processed FNA can be downloaded;
- missing items are surfaced clearly.

## Non-Goal

The MVP is not intended to replace the adviser, automate regulated financial advice, recommend products automatically, or make final compliance determinations.
