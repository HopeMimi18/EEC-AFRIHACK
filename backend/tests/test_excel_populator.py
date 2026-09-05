from pathlib import Path

from app.excel_populator import populate_fna_workbook
from app.schemas import (
    AssetItem,
    Assets,
    ClientDemographics,
    ExpenseItem,
    FNADataPayload,
    HouseholdExpenses,
    LiabilityItem,
    Liabilities,
)


def test_generate_fna_workbook():
    payload = FNADataPayload(
        client_demographics=ClientDemographics(
            full_name="Thando Mokoena",
            id_number=None,
            tax_number="9876543210",
            marital_status="Single",
            employer="Ubuntu Digital Services",
            gross_monthly_income=42000,
            net_monthly_income=31500,
        ),

        assets=Assets(
            properties=[
                AssetItem(
                    description="Primary Residence",
                    current_value=1500000,
                    institution=None,
                )
            ],

            vehicles=[
                AssetItem(
                    description="2022 Demo Vehicle",
                    current_value=280000,
                    institution=None,
                )
            ],

            savings=[
                AssetItem(
                    description="Savings Account",
                    current_value=120000,
                    institution="Demo Bank",
                )
            ],

            unit_trusts=[
                AssetItem(
                    description="Investment Portfolio",
                    current_value=250000,
                    institution="Demo Investment",
                )
            ],
        ),

        liabilities=Liabilities(
            mortgages=[
                LiabilityItem(
                    description="Home Loan",
                    outstanding_balance=950000,
                    monthly_instalment=10500,
                    institution="Demo Bank",
                )
            ],

            vehicle_finance=[
                LiabilityItem(
                    description="Vehicle Finance",
                    outstanding_balance=180000,
                    monthly_instalment=6500,
                    institution="Demo Bank",
                )
            ],

            personal_loans=[],

            credit_cards=[
                LiabilityItem(
                    description="Credit Card",
                    outstanding_balance=15000,
                    monthly_instalment=1000,
                    institution="Demo Bank",
                )
            ],
        ),

        household_expenses=HouseholdExpenses(
            fixed_expenses=[
                ExpenseItem(
                    description="Rental Payment",
                    monthly_amount=5000,
                ),
                ExpenseItem(
                    description="Car Insurance",
                    monthly_amount=1500,
                ),
            ],

            variable_expenses=[
                ExpenseItem(
                    description="Groceries",
                    monthly_amount=4500,
                ),
                ExpenseItem(
                    description="Petrol",
                    monthly_amount=2500,
                ),
            ],
        ),
    )

    output_path, summary = populate_fna_workbook(payload)

    assert Path(output_path).exists()

    assert summary["total_assets"] == 2150000
    assert summary["total_liabilities"] == 1145000
    assert summary["net_worth"] == 1005000
    assert summary["total_household_expenses"] == 13500
    assert summary["monthly_disposable_income"] == 18000