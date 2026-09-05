# Royal Square Portal — Hackathon Security Notes

This prototype now includes the minimum controls needed to demonstrate a credible client/adviser workflow:

- authenticated demo accounts
- signed bearer access tokens
- backend role-based access control
- client ownership checks on cases
- adviser-only FNA finalisation
- adviser-only workbook downloads
- explicit consent confirmation
- file type, file size, duplicate filename and document-count validation
- strict Pydantic validation of the FNA payload
- Compliance Readiness checks
- an adviser-visible audit trail that records actions rather than document contents

## Demo accounts

Client:
- `client@demo.co.za`
- `Client123!`

Adviser:
- `adviser@demo.co.za`
- `Adviser123!`

These credentials are intentionally public demo credentials and must not be used in production.

## Important prototype limitation

Cases are stored in memory. They remain available while the FastAPI process is running, which is enough for the hackathon client-to-adviser demonstration. Restarting the backend clears the case queue.

For production, replace the in-memory store with an encrypted database and use a managed identity provider or a mature authentication library.

## Compliance positioning

The application reports **Compliance Readiness**, not automatic FAIS/FICA compliance.

A human adviser remains responsible for checking source documents, resolving warnings and confirming that the case is suitable to finalise.

## Data handling

Use synthetic/test documents for the hackathon. Do not upload real client identity or financial documents to this prototype without an approved security, privacy and data-retention design.
