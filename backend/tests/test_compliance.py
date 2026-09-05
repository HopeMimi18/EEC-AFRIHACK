from app.compliance import (
    evaluate_compliance_readiness,
    infer_document_types,
)


def complete_payload():
    return {
        "client_demographics": {
            "full_name": "Thando Mokoena",
            "id_number": "8001015009087",
            "tax_number": "9876543210",
            "marital_status": "Single",
            "employer": "Demo Employer",
            "gross_monthly_income": 42000,
            "net_monthly_income": 31500,
        },
        "assets": {},
        "liabilities": {},
        "household_expenses": {},
    }


def test_document_type_inference():
    result = infer_document_types(
        [
            "demo_id.jpg",
            "demo_payslip.jpg",
            "demo_bank_statement.jpg",
        ]
    )

    assert result["id_document"]
    assert result["payslip"]
    assert result["bank_statement"]
    assert not result["irp5"]


def test_missing_id_blocks_finalisation():
    payload = complete_payload()
    payload[
        "client_demographics"
    ]["id_number"] = None

    readiness = (
        evaluate_compliance_readiness(
            payload=payload,
            summary={
                "monthly_disposable_income": 1000
            },
            filenames=[
                "demo_id.jpg",
                "demo_payslip.jpg",
                "demo_bank_statement.jpg",
            ],
            consent_recorded=True,
        )
    )

    assert (
        readiness["overall_status"]
        == "blocked"
    )
    assert (
        readiness["blocking_count"]
        >= 1
    )


def test_gross_income_below_net_blocks():
    payload = complete_payload()
    payload[
        "client_demographics"
    ]["gross_monthly_income"] = 20000

    readiness = (
        evaluate_compliance_readiness(
            payload=payload,
            summary={
                "monthly_disposable_income": 1000
            },
            filenames=[
                "demo_id.jpg",
                "demo_payslip.jpg",
                "demo_bank_statement.jpg",
            ],
            consent_recorded=True,
        )
    )

    failing = [
        check
        for check
        in readiness["checks"]
        if check["code"]
        == "income_consistency"
    ][0]

    assert (
        failing["severity"]
        == "blocking"
    )


def test_negative_disposable_income_warns():
    readiness = (
        evaluate_compliance_readiness(
            payload=complete_payload(),
            summary={
                "monthly_disposable_income": -500
            },
            filenames=[
                "demo_id.jpg",
                "demo_payslip.jpg",
                "demo_bank_statement.jpg",
            ],
            consent_recorded=True,
        )
    )

    warning = [
        check
        for check
        in readiness["checks"]
        if check["code"]
        == "negative_disposable_income"
    ][0]

    assert (
        warning["severity"]
        == "warning"
    )
