# Contributing to Royal Square Portal

## Development Model

We use:

```text
feature branch
      ↓
pull request
      ↓
develop
      ↓
main
```

## Rules

1. Do not commit directly to `main`.
2. Pull the latest `develop` before starting work.
3. Create one feature branch per task.
4. Keep commits small and descriptive.
5. Open pull requests into `develop`.
6. Review another teammate's pull request where practical.
7. Do not commit `.env`, API keys, passwords or real client data.
8. Run the relevant tests before merging.
9. Do not introduce new features after feature freeze without team agreement.
10. Keep the hackathon MVP focused on FNA automation and compliance readiness.

## Branch Naming

Use:

```text
feature/<feature-name>
fix/<bug-name>
docs/<document-name>
test/<test-name>
```

Examples:

```text
feature/document-parser
feature/fna-excel
feature/adviser-verification
fix/id-validation
docs/architecture
```

## Commit Messages

Recommended prefixes:

```text
feat:
fix:
docs:
test:
refactor:
chore:
```

Examples:

```text
feat: add FNADataPayload schema
fix: reject invalid SA ID checksum
docs: add architecture diagram
test: cover empty document upload
```

## Pull Request Checklist

Before requesting a merge:

- [ ] Feature has a clear purpose.
- [ ] Code runs locally.
- [ ] No secrets are committed.
- [ ] No real client data is included.
- [ ] API/backend changes are documented if needed.
- [ ] Relevant tests pass.
- [ ] UI changes work on mobile and desktop where applicable.
- [ ] The feature does not silently bypass adviser verification.

## Sensitive Data

Use synthetic demo data only unless Royal Square has explicitly approved another process and appropriate safeguards are in place.

Do not commit:

- ID documents;
- real bank statements;
- real payslips;
- tax certificates;
- client names linked to sensitive financial information;
- API keys;
- credentials.

## Definition of Done

A feature is complete when:

- it works;
- it is committed;
- it has been pushed;
- another teammate can pull and run it;
- it does not break the end-to-end demo.
