from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)
from fastapi.middleware.cors import (
    CORSMiddleware,
)
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from app.auth import (
    AuthUser,
    authenticate,
    create_access_token,
    demo_accounts,
    get_current_user,
    require_adviser,
)
from app.compliance import (
    evaluate_compliance_readiness,
)
from app.document_parser import (
    DEMO_MODE,
    parse_financial_document,
)
from app.excel_populator import (
    populate_fna_workbook,
)
from app.schemas import FNADataPayload


app = FastAPI(
    title="Royal Square Portal API",
    description=(
        "Financial Onboarding & FNA "
        "Automation"
    ),
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}
MAX_FILE_SIZE = 10 * 1024 * 1024
MAX_DOCUMENTS = 5

# Prototype-only case store.
# It survives client/adviser role changes while
# the backend process is running, but resets
# when the server restarts.
CASES: dict[str, dict[str, Any]] = {}


class LoginRequest(BaseModel):
    email: str
    password: str


class CaseMessageCreate(BaseModel):
    body: str = Field(
        min_length=1,
        max_length=2000,
    )


def utc_now() -> str:
    return datetime.now(
        timezone.utc
    ).isoformat()


def add_audit_event(
    case: dict[str, Any],
    *,
    actor: AuthUser,
    action: str,
    description: str,
) -> None:
    case.setdefault(
        "audit_trail",
        [],
    ).append(
        {
            "timestamp": utc_now(),
            "actor_email": actor.email,
            "actor_role": actor.role,
            "action": action,
            "description": description,
        }
    )


def calculate_summary(
    payload: FNADataPayload,
) -> dict[str, float]:
    data = payload.model_dump(
        mode="json"
    )

    total_assets = 0.0
    for items in data.get(
        "assets",
        {},
    ).values():
        if not isinstance(items, list):
            continue

        for item in items:
            total_assets += float(
                item.get(
                    "current_value",
                    0,
                )
                or 0
            )

    total_liabilities = 0.0
    for items in data.get(
        "liabilities",
        {},
    ).values():
        if not isinstance(items, list):
            continue

        for item in items:
            total_liabilities += float(
                item.get(
                    "outstanding_balance",
                    0,
                )
                or 0
            )

    total_expenses = 0.0
    for items in data.get(
        "household_expenses",
        {},
    ).values():
        if not isinstance(items, list):
            continue

        for item in items:
            total_expenses += float(
                item.get(
                    "monthly_amount",
                    0,
                )
                or 0
            )

    client = data.get(
        "client_demographics",
        {},
    )
    net_income = float(
        client.get(
            "net_monthly_income",
            0,
        )
        or 0
    )

    return {
        "total_assets": total_assets,
        "total_liabilities": (
            total_liabilities
        ),
        "net_worth": (
            total_assets
            - total_liabilities
        ),
        "total_household_expenses": (
            total_expenses
        ),
        "monthly_disposable_income": (
            net_income
            - total_expenses
        ),
    }


def validate_uploaded_files(
    files: list[UploadFile],
) -> None:
    if not files:
        raise HTTPException(
            status_code=400,
            detail=(
                "At least one document "
                "is required."
            ),
        )

    if len(files) > MAX_DOCUMENTS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"A maximum of "
                f"{MAX_DOCUMENTS} documents "
                "may be uploaded."
            ),
        )


async def read_and_validate_files(
    files: list[UploadFile],
) -> list[dict[str, Any]]:
    validate_uploaded_files(files)

    validated: list[
        dict[str, Any]
    ] = []

    seen_names: set[str] = set()

    for file in files:
        filename = (
            file.filename
            or "document"
        )
        content_type = (
            file.content_type
            or ""
        )

        if (
            content_type
            not in ALLOWED_FILE_TYPES
        ):
            raise HTTPException(
                status_code=415,
                detail=(
                    f"Unsupported file type "
                    f"for {filename}. "
                    "Use PDF, PNG, JPG "
                    "or JPEG."
                ),
            )

        normalized_name = (
            filename.strip().lower()
        )

        if normalized_name in seen_names:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Duplicate document "
                    f"filename: {filename}."
                ),
            )

        seen_names.add(
            normalized_name
        )

        file_data = await file.read()

        if not file_data:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{filename} is empty."
                ),
            )

        if (
            len(file_data)
            > MAX_FILE_SIZE
        ):
            raise HTTPException(
                status_code=413,
                detail=(
                    f"{filename} exceeds "
                    "the 10 MB upload "
                    "limit."
                ),
            )

        validated.append(
            {
                "filename": filename,
                "content_type": (
                    content_type
                ),
                "file_bytes": file_data,
                "size_bytes": (
                    len(file_data)
                ),
            }
        )

    return validated


def get_case_or_404(
    case_id: str,
) -> dict[str, Any]:
    case = CASES.get(case_id)

    if not case:
        raise HTTPException(
            status_code=404,
            detail="Case not found.",
        )

    return case


def authorize_case_access(
    case: dict[str, Any],
    user: AuthUser,
) -> None:
    if user.role == "adviser":
        return

    if (
        case["owner_email"]
        != user.email
    ):
        raise HTTPException(
            status_code=403,
            detail=(
                "You do not have access "
                "to this case."
            ),
        )


def serialize_case(
    case: dict[str, Any],
) -> dict[str, Any]:
    return {
        "status": "success",
        "case_id": case["case_id"],
        "case_status": (
            case["case_status"]
        ),
        "owner_email": (
            case["owner_email"]
        ),
        "created_at": (
            case["created_at"]
        ),
        "updated_at": (
            case["updated_at"]
        ),
        "consent_recorded": (
            case["consent_recorded"]
        ),
        "extraction_mode": (
            case["extraction_mode"]
        ),
        "demo_warning": (
            case["demo_warning"]
        ),
        "document_count": (
            case["document_count"]
        ),
        "uploaded_documents": (
            case["uploaded_documents"]
        ),
        "extracted_data": (
            case["extracted_data"]
        ),
        "summary": case["summary"],
        "compliance_readiness": (
            case["compliance_readiness"]
        ),
        "processed_filename": (
            case["processed_filename"]
        ),
        "download_url": (
            case["download_url"]
        ),
        "verified_by": (
            case.get("verified_by")
        ),
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": (
            "Royal Square Portal "
            "backend is running"
        ),
        "demo_mode": DEMO_MODE,
        "auth_mode": "demo-rbac",
    }


@app.get("/api/v1/auth/demo-accounts")
def get_demo_accounts():
    return {
        "accounts": demo_accounts(),
        "note": (
            "Hackathon demo accounts only."
        ),
    }


@app.post("/api/v1/auth/login")
def login(
    request: LoginRequest,
):
    user = authenticate(
        request.email,
        request.password,
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=(
                "Invalid email or password."
            ),
        )

    return {
        "access_token": (
            create_access_token(user)
        ),
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role,
        },
    }


@app.get("/api/v1/auth/me")
def auth_me(
    user: AuthUser = Depends(
        get_current_user
    ),
):
    return {
        "email": user.email,
        "name": user.name,
        "role": user.role,
    }


@app.post("/api/v1/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: AuthUser = Depends(
        get_current_user
    ),
):
    validated = (
        await read_and_validate_files(
            [file]
        )
    )[0]

    return {
        "status": "success",
        "filename": (
            validated["filename"]
        ),
        "content_type": (
            validated["content_type"]
        ),
        "size_bytes": (
            validated["size_bytes"]
        ),
        "uploaded_by": user.email,
    }


@app.post(
    "/api/v1/extract-document"
)
async def extract_document(
    file: UploadFile = File(...),
    user: AuthUser = Depends(
        get_current_user
    ),
):
    validated = (
        await read_and_validate_files(
            [file]
        )
    )[0]

    try:
        extracted_data = (
            parse_financial_document(
                filename=validated[
                    "filename"
                ],
                content_type=validated[
                    "content_type"
                ],
                file_bytes=validated[
                    "file_bytes"
                ],
            )
        )

        return {
            "status": "success",
            "extraction_mode": (
                "demo"
                if DEMO_MODE
                else "live"
            ),
            "demo_warning": (
                "Synthetic demonstration "
                "data was used. Values were "
                "not extracted from the "
                "uploaded document."
                if DEMO_MODE
                else None
            ),
            "extracted_data": (
                extracted_data.model_dump(
                    mode="json"
                )
            ),
            "requested_by": user.email,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Document extraction "
                f"failed: {error}"
            ),
        ) from error


@app.post(
    "/api/v1/process-document"
)
async def process_document(
    file: UploadFile = File(...),
    consent: bool = Form(...),
    user: AuthUser = Depends(
        get_current_user
    ),
):
    # Single-document compatibility
    # endpoint. It uses the same secured
    # case pipeline as multi-document
    # processing.
    return await process_documents(
        files=[file],
        consent=consent,
        user=user,
    )


@app.post(
    "/api/v1/process-documents"
)
async def process_documents(
    files: list[UploadFile] = File(...),
    consent: bool = Form(...),
    user: AuthUser = Depends(
        get_current_user
    ),
):
    """
    Create one authenticated onboarding case.

    Client and adviser uploads both require a
    consent confirmation. Demo Mode uses
    synthetic FNA data while preserving the
    real upload, validation, case, RBAC and
    adviser-review workflow.
    """

    if not consent:
        raise HTTPException(
            status_code=400,
            detail=(
                "Client consent must be "
                "confirmed before document "
                "processing."
            ),
        )

    validated_documents = (
        await read_and_validate_files(
            files
        )
    )

    try:
        if not DEMO_MODE:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Live multi-document "
                    "extraction is not enabled "
                    "in this prototype. Use "
                    "DEMO_MODE=true."
                ),
            )

        first_document = (
            validated_documents[0]
        )

        extracted_data = (
            parse_financial_document(
                filename=first_document[
                    "filename"
                ],
                content_type=first_document[
                    "content_type"
                ],
                file_bytes=first_document[
                    "file_bytes"
                ],
            )
        )

        output_path, summary = (
            populate_fna_workbook(
                extracted_data
            )
        )

        uploaded_documents = [
            {
                "filename": document[
                    "filename"
                ],
                "content_type": document[
                    "content_type"
                ],
                "size_bytes": document[
                    "size_bytes"
                ],
            }
            for document
            in validated_documents
        ]

        extracted_payload = (
            extracted_data.model_dump(
                mode="json"
            )
        )

        filenames = [
            item["filename"]
            for item
            in uploaded_documents
        ]

        compliance = (
            evaluate_compliance_readiness(
                payload=extracted_payload,
                summary=summary,
                filenames=filenames,
                consent_recorded=True,
            )
        )

        case_id = (
            f"RS-{uuid4().hex[:10]}"
            .upper()
        )

        case_status = (
            "submitted"
            if user.role == "client"
            else "under_review"
        )

        now = utc_now()

        case = {
            "case_id": case_id,
            "case_status": case_status,
            "owner_email": user.email,
            "created_by": user.email,
            "created_at": now,
            "updated_at": now,
            "consent_recorded": True,
            "extraction_mode": "demo",
            "demo_warning": (
                "Synthetic demonstration "
                "data was used. Values were "
                "not extracted from the "
                "uploaded documents."
            ),
            "document_count": len(
                uploaded_documents
            ),
            "uploaded_documents": (
                uploaded_documents
            ),
            "extracted_data": (
                extracted_payload
            ),
            "summary": summary,
            "compliance_readiness": (
                compliance
            ),
            "processed_filename": (
                output_path.name
            ),
            "download_url": (
                f"/api/v1/download/"
                f"{output_path.name}"
            ),
            "verified_by": None,
            "messages": [],
            "audit_trail": [],
        }

        add_audit_event(
            case,
            actor=user,
            action="case_created",
            description=(
                "Authenticated onboarding "
                "case created."
            ),
        )

        add_audit_event(
            case,
            actor=user,
            action="consent_recorded",
            description=(
                "Client consent confirmation "
                "recorded."
            ),
        )

        add_audit_event(
            case,
            actor=user,
            action="documents_validated",
            description=(
                f"{len(uploaded_documents)} "
                "document(s) validated."
            ),
        )

        CASES[case_id] = case

        return serialize_case(case)

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Multi-document processing "
                f"failed: {error}"
            ),
        ) from error


@app.get("/api/v1/cases")
def list_cases(
    user: AuthUser = Depends(
        get_current_user
    ),
):
    visible = []

    for case in CASES.values():
        if (
            user.role == "client"
            and case["owner_email"]
            != user.email
        ):
            continue

        visible.append(
            {
                "case_id": (
                    case["case_id"]
                ),
                "case_status": (
                    case["case_status"]
                ),
                "owner_email": (
                    case["owner_email"]
                ),
                "created_at": (
                    case["created_at"]
                ),
                "updated_at": (
                    case["updated_at"]
                ),
                "document_count": (
                    case[
                        "document_count"
                    ]
                ),
                "readiness_status": (
                    case[
                        "compliance_readiness"
                    ]["overall_status"]
                ),
            }
        )

    visible.sort(
        key=lambda item: item[
            "updated_at"
        ],
        reverse=True,
    )

    return {
        "cases": visible,
    }


@app.get(
    "/api/v1/cases/{case_id}"
)
def get_case(
    case_id: str,
    user: AuthUser = Depends(
        get_current_user
    ),
):
    case = get_case_or_404(case_id)
    authorize_case_access(
        case,
        user,
    )

    return serialize_case(case)



@app.get(
    "/api/v1/cases/{case_id}/messages"
)
def get_case_messages(
    case_id: str,
    user: AuthUser = Depends(
        get_current_user
    ),
):
    case = get_case_or_404(case_id)
    authorize_case_access(
        case,
        user,
    )

    return {
        "case_id": case_id,
        "messages": case.get(
            "messages",
            [],
        ),
    }


@app.post(
    "/api/v1/cases/{case_id}/messages"
)
def send_case_message(
    case_id: str,
    request: CaseMessageCreate,
    user: AuthUser = Depends(
        get_current_user
    ),
):
    case = get_case_or_404(case_id)
    authorize_case_access(
        case,
        user,
    )

    body = request.body.strip()

    if not body:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    message = {
        "message_id": (
            f"MSG-{uuid4().hex[:10]}"
            .upper()
        ),
        "case_id": case_id,
        "sender_email": user.email,
        "sender_name": user.name,
        "sender_role": user.role,
        "body": body,
        "created_at": utc_now(),
    }

    case.setdefault(
        "messages",
        [],
    ).append(message)

    case["updated_at"] = (
        message["created_at"]
    )

    add_audit_event(
        case,
        actor=user,
        action="case_message_sent",
        description=(
            f"{user.role.title()} sent "
            "a case message."
        ),
    )

    return message


@app.get(
    "/api/v1/cases/{case_id}/audit"
)
def get_case_audit(
    case_id: str,
    user: AuthUser = Depends(
        require_adviser
    ),
):
    case = get_case_or_404(case_id)

    return {
        "case_id": case_id,
        "audit_trail": case.get(
            "audit_trail",
            [],
        ),
        "requested_by": user.email,
    }


@app.post(
    "/api/v1/cases/{case_id}/finalise"
)
def finalise_case(
    case_id: str,
    payload: FNADataPayload,
    adviser: AuthUser = Depends(
        require_adviser
    ),
):
    case = get_case_or_404(case_id)

    payload_dict = payload.model_dump(
        mode="json"
    )

    preview_summary = (
        calculate_summary(payload)
    )

    filenames = [
        document["filename"]
        for document
        in case["uploaded_documents"]
    ]

    compliance = (
        evaluate_compliance_readiness(
            payload=payload_dict,
            summary=preview_summary,
            filenames=filenames,
            consent_recorded=case[
                "consent_recorded"
            ],
        )
    )

    if (
        compliance["overall_status"]
        == "blocked"
    ):
        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "The case has blocking "
                    "readiness issues. Resolve "
                    "them before finalising "
                    "the FNA."
                ),
                "compliance_readiness": (
                    compliance
                ),
            },
        )

    previous_client = (
        case["extracted_data"].get(
            "client_demographics",
            {},
        )
    )
    new_client = payload_dict.get(
        "client_demographics",
        {},
    )

    changed_fields = [
        field
        for field
        in new_client
        if new_client.get(field)
        != previous_client.get(field)
    ]

    try:
        output_path, summary = (
            populate_fna_workbook(
                payload
            )
        )

        compliance = (
            evaluate_compliance_readiness(
                payload=payload_dict,
                summary=summary,
                filenames=filenames,
                consent_recorded=True,
            )
        )

        case.update(
            {
                "case_status": (
                    "finalised"
                ),
                "updated_at": utc_now(),
                "extracted_data": (
                    payload_dict
                ),
                "summary": summary,
                "compliance_readiness": (
                    compliance
                ),
                "processed_filename": (
                    output_path.name
                ),
                "download_url": (
                    f"/api/v1/download/"
                    f"{output_path.name}"
                ),
                "verified_by": (
                    adviser.email
                ),
            }
        )

        add_audit_event(
            case,
            actor=adviser,
            action=(
                "adviser_verification"
            ),
            description=(
                "Adviser reviewed the case. "
                "Changed field names: "
                + (
                    ", ".join(
                        changed_fields
                    )
                    if changed_fields
                    else "none"
                )
                + "."
            ),
        )

        add_audit_event(
            case,
            actor=adviser,
            action="fna_finalised",
            description=(
                "Final FNA workbook "
                "generated after adviser "
                "verification."
            ),
        )

        return serialize_case(case)

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Final FNA generation "
                f"failed: {error}"
            ),
        ) from error


@app.get(
    "/api/v1/download/{filename}"
)
async def download_processed_fna(
    filename: str,
    adviser: AuthUser = Depends(
        require_adviser
    ),
):
    output_directory = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "processed"
    )

    safe_name = Path(filename).name

    # Only generated files associated with a
    # known case can be downloaded.
    matching_case = next(
        (
            case
            for case in CASES.values()
            if case[
                "processed_filename"
            ]
            == safe_name
        ),
        None,
    )

    if not matching_case:
        raise HTTPException(
            status_code=404,
            detail=(
                "Processed FNA file is not "
                "associated with an active "
                "case."
            ),
        )

    file_path = (
        output_directory
        / safe_name
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail=(
                "Processed FNA file "
                "not found."
            ),
        )

    add_audit_event(
        matching_case,
        actor=adviser,
        action="fna_downloaded",
        description=(
            "Generated FNA workbook "
            "downloaded by an adviser."
        ),
    )

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type=(
            "application/"
            "vnd.openxmlformats-"
            "officedocument."
            "spreadsheetml.sheet"
        ),
    )
