# Team Workflow

## GitHub as Source of Truth

GitHub is the official shared codebase.

Rule:

> If it is not in GitHub, it does not exist.

Lovable may generate or modify frontend code, but meaningful changes must be committed to the shared repository.

## Branch Strategy

```text
main
└── develop
    ├── feature/frontend-shell
    ├── feature/document-upload
    ├── feature/fna-parser
    ├── feature/excel-populator
    ├── feature/compliance-readiness
    └── feature/integration
```

## Branch Rules

### `main`
- stable demo-ready code only;
- no direct feature development;
- merge from `develop`.

### `develop`
- integration branch;
- feature pull requests merge here first;
- must remain reasonably stable.

### `feature/*`
- one focused task per branch;
- created from the latest `develop`.

## Starting Work

```bash
git switch develop
git pull origin develop
git switch -c feature/<task-name>
```

Example:

```bash
git switch -c feature/fna-parser
```

## Saving Work

```bash
git status
git add .
git commit -m "feat: add structured FNA extraction"
git push -u origin feature/fna-parser
```

## Pull Requests

Open:

```text
feature/<task>
      ↓
   develop
```

A teammate should review the pull request before merge where time allows.

When the integrated build is stable:

```text
develop
   ↓
 main
```

## Recommended Team Ownership

### Member 1 — Frontend / Lovable
Primary ownership:
- frontend;
- responsive layout;
- document upload UI;
- adviser verification view.

### Member 2 — AI / Backend
Primary ownership:
- FastAPI;
- OpenAI integration;
- structured extraction;
- Pydantic validation.

### Member 3 — FNA / Excel
Primary ownership:
- workbook inspection;
- cell mapping;
- calculations;
- openpyxl/pandas population.

### Member 4 — Integration / QA / Product
Primary ownership:
- end-to-end testing;
- compliance-readiness logic;
- API/frontend integration;
- documentation;
- demo flow;
- pitch coordination.

## Commit Message Style

Use short, descriptive commits.

Good:

```text
docs: define MVP scope
feat: add SA ID Luhn validation
feat: add FNA extraction schema
feat: connect upload form to FastAPI
feat: map income fields to FNA workbook
fix: prevent duplicate liability entries
test: add ID validation tests
```

Avoid:

```text
update
stuff
fixed things
final
final final
```

## Merge-Conflict Prevention

Before starting work:

```bash
git switch develop
git pull origin develop
```

Before opening a pull request:

```bash
git switch feature/<task>
git merge develop
```

Resolve conflicts locally, test, then push again.

## Lovable Workflow

Recommended rule:

- Lovable primarily edits the frontend.
- Python/backend work is done locally.
- Frontend changes generated through Lovable must be synced to GitHub.
- Avoid having Lovable and a developer manually edit the same component at the same time.

## Daily Checkpoint

At least twice during the hackathon:

1. merge completed feature work into `develop`;
2. run the full application;
3. confirm the demo workflow still works;
4. tag or note a known-good commit.

## Feature Freeze

Before the final pitch:

- stop adding new features;
- fix only demo-blocking bugs;
- merge stable code to `main`;
- verify the complete demo from a fresh start.
