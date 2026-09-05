from __future__ import annotations

from typing import Any


DOCUMENT_RULES = {
    "id_document": {
        "label": "ID document",
        "hints": ("id", "identity"),
        "required": True,
    },
    "payslip": {
        "label": "Payslip",
        "hints": ("payslip", "salary"),
        "required": True,
    },
    "bank_statement": {
        "label": "Bank statement",
        "hints": ("bank", "statement"),
        "required": True,
    },
    "irp5": {
        "label": "IRP5 / tax certificate",
        "hints": ("irp5", "tax certificate"),
        "required": False,
    },
    "proof_of_address": {
        "label": "Proof of address",
        "hints": ("address", "proof"),
        "required": False,
    },
}


def infer_document_types(
    filenames: list[str],
) -> dict[str, bool]:
    normalized = [
        name.lower()
        for name in filenames
    ]

    return {
        code: any(
            any(
                hint in filename
                for hint in rule["hints"]
            )
            for filename in normalized
        )
        for code, rule
        in DOCUMENT_RULES.items()
    }


def _check(
    *,
    code: str,
    label: str,
    passed: bool,
    blocking: bool,
    pass_message: str,
    fail_message: str,
) -> dict[str, Any]:
    if passed:
        return {
            "code": code,
            "label": label,
            "status": "pass",
            "severity": "ok",
            "message": pass_message,
        }

    return {
        "code": code,
        "label": label,
        "status": "action",
        "severity": (
            "blocking"
            if blocking
            else "warning"
        ),
        "message": fail_message,
    }


def evaluate_compliance_readiness(
    *,
    payload: dict[str, Any],
    summary: dict[str, Any],
    filenames: list[str],
    consent_recorded: bool,
) -> dict[str, Any]:
    """
    Readiness checks only.

    This function does NOT decide legal FAIS/FICA
    compliance. It identifies missing data,
    inconsistent values and review items.
    """

    client = payload.get(
        "client_demographics",
        {},
    )

    full_name = client.get("full_name")
    id_number = client.get("id_number")
    tax_number = client.get("tax_number")
    employer = client.get("employer")

    gross = client.get(
        "gross_monthly_income"
    )
    net = client.get(
        "net_monthly_income"
    )

    checks: list[dict[str, Any]] = []

    checks.append(
        _check(
            code="consent_recorded",
            label="Client consent",
            passed=bool(
                consent_recorded
            ),
            blocking=True,
            pass_message=(
                "Client consent has been "
                "recorded for this case."
            ),
            fail_message=(
                "Record client consent before "
                "finalising the case."
            ),
        )
    )

    checks.append(
        _check(
            code="client_name",
            label="Client name",
            passed=bool(
                str(
                    full_name or ""
                ).strip()
            ),
            blocking=True,
            pass_message=(
                "Client name is present."
            ),
            fail_message=(
                "Client name is missing."
            ),
        )
    )

    checks.append(
        _check(
            code="sa_id",
            label="South African ID",
            passed=bool(id_number),
            blocking=True,
            pass_message=(
                "A validated SA ID number is "
                "present."
            ),
            fail_message=(
                "A validated SA ID number is "
                "required before finalisation."
            ),
        )
    )

    checks.append(
        _check(
            code="tax_number",
            label="Tax number",
            passed=bool(tax_number),
            blocking=False,
            pass_message=(
                "Tax number is present."
            ),
            fail_message=(
                "Tax number is missing and "
                "should be confirmed if "
                "applicable."
            ),
        )
    )

    checks.append(
        _check(
            code="employer",
            label="Employer",
            passed=bool(
                str(
                    employer or ""
                ).strip()
            ),
            blocking=False,
            pass_message=(
                "Employer information is "
                "present."
            ),
            fail_message=(
                "Employer information has not "
                "been captured."
            ),
        )
    )

    income_present = (
        gross is not None
        and net is not None
    )

    checks.append(
        _check(
            code="income_present",
            label="Income information",
            passed=income_present,
            blocking=True,
            pass_message=(
                "Gross and net monthly income "
                "are present."
            ),
            fail_message=(
                "Gross and net monthly income "
                "must both be captured."
            ),
        )
    )

    income_consistent = (
        income_present
        and float(gross) >= float(net)
    )

    checks.append(
        _check(
            code="income_consistency",
            label="Income consistency",
            passed=income_consistent,
            blocking=True,
            pass_message=(
                "Gross income is not lower "
                "than net income."
            ),
            fail_message=(
                "Gross monthly income cannot "
                "be lower than net monthly "
                "income."
            ),
        )
    )

    document_types = infer_document_types(
        filenames
    )

    for code, rule in (
        DOCUMENT_RULES.items()
    ):
        found = document_types[code]
        checks.append(
            _check(
                code=f"document_{code}",
                label=rule["label"],
                passed=found,
                blocking=False,
                pass_message=(
                    f"{rule['label']} appears "
                    "in the uploaded document "
                    "pack."
                ),
                fail_message=(
                    f"{rule['label']} was not "
                    "recognised from the "
                    "uploaded filenames."
                ),
            )
        )

    disposable_income = summary.get(
        "monthly_disposable_income"
    )

    if (
        disposable_income is not None
        and float(disposable_income) < 0
    ):
        checks.append(
            {
                "code": (
                    "negative_disposable_income"
                ),
                "label": (
                    "Disposable income"
                ),
                "status": "action",
                "severity": "warning",
                "message": (
                    "Monthly disposable income "
                    "is negative and requires "
                    "adviser review."
                ),
            }
        )
    else:
        checks.append(
            {
                "code": (
                    "negative_disposable_income"
                ),
                "label": (
                    "Disposable income"
                ),
                "status": "pass",
                "severity": "ok",
                "message": (
                    "Disposable income does not "
                    "indicate a negative monthly "
                    "position."
                ),
            }
        )

    blocking_count = sum(
        1
        for item in checks
        if item["severity"] == "blocking"
        and item["status"] != "pass"
    )

    warning_count = sum(
        1
        for item in checks
        if item["severity"] == "warning"
        and item["status"] != "pass"
    )

    if blocking_count:
        overall_status = "blocked"
    elif warning_count:
        overall_status = "review"
    else:
        overall_status = "ready"

    return {
        "label": "Compliance Readiness",
        "overall_status": overall_status,
        "blocking_count": blocking_count,
        "warning_count": warning_count,
        "checks": checks,
        "disclaimer": (
            "Readiness checks support adviser "
            "review and do not constitute an "
            "automatic FAIS/FICA compliance "
            "determination."
        ),
    }
