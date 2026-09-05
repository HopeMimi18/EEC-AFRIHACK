from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------
# Base model
# ---------------------------------------------------------

class StrictModel(BaseModel):
    """
    All models inherit from this class.

    extra="forbid" means Pydantic will reject unexpected fields.
    This is important because AI-generated data must follow
    our exact FNA structure.
    """

    model_config = ConfigDict(extra="forbid")


# ---------------------------------------------------------
# South African ID validation
# ---------------------------------------------------------

def is_valid_luhn(number: str) -> bool:
    """
    Validate a number using the Luhn checksum algorithm.

    South African ID numbers contain 13 digits and the final
    digit acts as a checksum.
    """

    if not number.isdigit():
        return False

    total = 0
    parity = len(number) % 2

    for index, character in enumerate(number):
        digit = int(character)

        if index % 2 == parity:
            digit *= 2

            if digit > 9:
                digit -= 9

        total += digit

    return total % 10 == 0


# ---------------------------------------------------------
# Client demographics
# ---------------------------------------------------------

class ClientDemographics(StrictModel):
    full_name: Optional[str] = None
    id_number: Optional[str] = None
    tax_number: Optional[str] = None
    marital_status: Optional[str] = None
    employer: Optional[str] = None

    gross_monthly_income: Optional[float] = Field(
        default=None,
        ge=0
    )

    net_monthly_income: Optional[float] = Field(
        default=None,
        ge=0
    )

    @field_validator("id_number")
    @classmethod
    def validate_sa_id_number(
        cls,
        value: Optional[str]
    ) -> Optional[str]:

        # AI may legitimately not find an ID number.
        if value is None or value == "":
            return None

        # Remove spaces or separators.
        cleaned = "".join(
            character
            for character in value
            if character.isdigit()
        )

        if len(cleaned) != 13:
            raise ValueError(
                "South African ID number must contain exactly 13 digits"
            )

        if not is_valid_luhn(cleaned):
            raise ValueError(
                "South African ID number failed Luhn validation"
            )

        return cleaned


# ---------------------------------------------------------
# Assets
# ---------------------------------------------------------

class AssetItem(StrictModel):
    description: str

    current_value: float = Field(
        ge=0
    )

    institution: Optional[str] = None


class Assets(StrictModel):
    properties: list[AssetItem] = Field(
        default_factory=list
    )

    vehicles: list[AssetItem] = Field(
        default_factory=list
    )

    savings: list[AssetItem] = Field(
        default_factory=list
    )

    unit_trusts: list[AssetItem] = Field(
        default_factory=list
    )


# ---------------------------------------------------------
# Liabilities
# ---------------------------------------------------------

class LiabilityItem(StrictModel):
    description: str

    outstanding_balance: float = Field(
        ge=0
    )

    monthly_instalment: Optional[float] = Field(
        default=None,
        ge=0
    )

    institution: Optional[str] = None


class Liabilities(StrictModel):
    mortgages: list[LiabilityItem] = Field(
        default_factory=list
    )

    vehicle_finance: list[LiabilityItem] = Field(
        default_factory=list
    )

    personal_loans: list[LiabilityItem] = Field(
        default_factory=list
    )

    credit_cards: list[LiabilityItem] = Field(
        default_factory=list
    )


# ---------------------------------------------------------
# Household expenses
# ---------------------------------------------------------

class ExpenseItem(StrictModel):
    description: str

    monthly_amount: float = Field(
        ge=0
    )


class HouseholdExpenses(StrictModel):
    fixed_expenses: list[ExpenseItem] = Field(
        default_factory=list
    )

    variable_expenses: list[ExpenseItem] = Field(
        default_factory=list
    )


# ---------------------------------------------------------
# Complete FNA payload
# ---------------------------------------------------------

class FNADataPayload(StrictModel):
    client_demographics: ClientDemographics
    assets: Assets
    liabilities: Liabilities
    household_expenses: HouseholdExpenses