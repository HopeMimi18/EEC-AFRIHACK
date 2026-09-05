import pytest
from pydantic import ValidationError

from app.schemas import (
    Assets,
    ClientDemographics,
    FNADataPayload,
    HouseholdExpenses,
    Liabilities,
)


def test_valid_fna_payload():
    payload = FNADataPayload(
        client_demographics=ClientDemographics(
            full_name="Demo Client",
            id_number="8001015009087",
            employer="Example Company",
            gross_monthly_income=42000,
            net_monthly_income=32000,
        ),
        assets=Assets(),
        liabilities=Liabilities(),
        household_expenses=HouseholdExpenses(),
    )

    assert payload.client_demographics.full_name == "Demo Client"
    assert payload.client_demographics.net_monthly_income == 32000


def test_invalid_sa_id_length():
    with pytest.raises(ValidationError):
        ClientDemographics(
            full_name="Demo Client",
            id_number="12345",
        )


def test_invalid_sa_id_checksum():
    with pytest.raises(ValidationError):
        ClientDemographics(
            full_name="Demo Client",
            id_number="8001015009088",
        )


def test_negative_income_is_rejected():
    with pytest.raises(ValidationError):
        ClientDemographics(
            full_name="Demo Client",
            gross_monthly_income=-5000,
        )


def test_unknown_fields_are_rejected():
    with pytest.raises(ValidationError):
        ClientDemographics(
            full_name="Demo Client",
            favourite_colour="green",
        )