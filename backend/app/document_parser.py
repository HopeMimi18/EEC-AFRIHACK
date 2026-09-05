import base64
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

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


# ---------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(
    dotenv_path=ENV_PATH,
    override=True,
)

DEMO_MODE = (
    os.getenv("DEMO_MODE", "true")
    .strip()
    .lower()
    == "true"
)

MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-4o-2024-08-06",
)


# ---------------------------------------------------------
# Optional OpenAI client
# ---------------------------------------------------------

def get_openai_client():
    """
    Create the OpenAI client only when live extraction
    is explicitly being used.

    Demo Mode does not require an API key.
    """

    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for live extraction. "
            "Set DEMO_MODE=true to use the mock extraction workflow."
        )

    return OpenAI(
        api_key=api_key
    )


# ---------------------------------------------------------
# Extraction instructions
# ---------------------------------------------------------

SYSTEM_PROMPT = """
You are a financial document extraction system.

Extract factual information from South African financial documents
for use in a Financial Needs Analysis.

Supported documents may include:
- South African ID documents
- Payslips
- Bank statements
- IRP5 tax certificates
- Proof of address

Rules:

1. Extract only information explicitly visible in the document.
2. Do not invent missing information.
3. If a scalar value is unavailable, return null.
4. If no list items are found, return an empty list.
5. Currency values must be numeric without the R symbol.
6. Do not provide financial advice.
7. Do not calculate net worth or disposable income.
8. Do not assume information that is not visible.
9. Transcribe South African ID numbers exactly as shown.
10. Return data strictly matching FNADataPayload.
"""


# ---------------------------------------------------------
# Live image extraction
# ---------------------------------------------------------

def parse_image_document(
    filename: str,
    content_type: str,
    file_bytes: bytes,
) -> FNADataPayload:

    # The OpenAI client is created ONLY here.
    # Demo Mode never reaches this function.
    client = get_openai_client()

    encoded_image = base64.b64encode(
        file_bytes
    ).decode("utf-8")

    if content_type == "image/jpg":
        content_type = "image/jpeg"

    image_url = (
        f"data:{content_type};base64,{encoded_image}"
    )

    response = client.responses.parse(
        model=MODEL,
        instructions=SYSTEM_PROMPT,
        input=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Extract financial information "
                            f"from {filename}."
                        ),
                    },
                    {
                        "type": "input_image",
                        "image_url": image_url,
                        "detail": "high",
                    },
                ],
            }
        ],
        text_format=FNADataPayload,
    )

    if response.output_parsed is None:
        raise ValueError(
            "OpenAI did not return structured FNA data."
        )

    return response.output_parsed


# ---------------------------------------------------------
# Live PDF extraction
# ---------------------------------------------------------

def parse_pdf_document(
    filename: str,
    file_bytes: bytes,
) -> FNADataPayload:

    # The OpenAI client is created ONLY here.
    # Demo Mode never reaches this function.
    client = get_openai_client()

    uploaded_file_id = None

    try:
        uploaded_file = client.files.create(
            file=(
                filename,
                file_bytes,
                "application/pdf",
            ),
            purpose="user_data",
        )

        uploaded_file_id = uploaded_file.id

        response = client.responses.parse(
            model=MODEL,
            instructions=SYSTEM_PROMPT,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": (
                                "Extract financial information "
                                "from this uploaded document."
                            ),
                        },
                        {
                            "type": "input_file",
                            "file_id": uploaded_file.id,
                        },
                    ],
                }
            ],
            text_format=FNADataPayload,
        )

        if response.output_parsed is None:
            raise ValueError(
                "OpenAI did not return structured FNA data."
            )

        return response.output_parsed

    finally:
        if uploaded_file_id:
            try:
                client.files.delete(
                    uploaded_file_id
                )
            except Exception:
                pass


# ---------------------------------------------------------
# Hackathon Demo / Mock extraction
# ---------------------------------------------------------

def build_demo_fna_payload() -> FNADataPayload:
    """
    Return synthetic financial information for
    hackathon demonstrations.

    IMPORTANT:
    This data is NOT extracted from the uploaded document.
    """

    return FNADataPayload(
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


# ---------------------------------------------------------
# Main document parser
# ---------------------------------------------------------

def parse_financial_document(
    filename: str,
    content_type: str,
    file_bytes: bytes,
) -> FNADataPayload:
    """
    Parse a financial document.

    Demo Mode:
        Returns synthetic FNA data and does NOT
        connect to OpenAI.

    Live Mode:
        Uses the configured OpenAI API.
    """

    # IMPORTANT:
    # Always check Demo Mode before doing anything
    # involving the external API.
    if DEMO_MODE:
        return build_demo_fna_payload()

    if content_type == "application/pdf":
        return parse_pdf_document(
            filename=filename,
            file_bytes=file_bytes,
        )

    if content_type in {
        "image/png",
        "image/jpeg",
        "image/jpg",
    }:
        return parse_image_document(
            filename=filename,
            content_type=content_type,
            file_bytes=file_bytes,
        )

    raise ValueError(
        f"Unsupported content type: {content_type}"
    )