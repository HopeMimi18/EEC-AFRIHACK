from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.document_parser import DEMO_MODE, parse_financial_document
from app.excel_populator import populate_fna_workbook
from app.schemas import FNADataPayload
from fastapi.middleware.cors import CORSMiddleware


# ---------------------------------------------------------
# FastAPI application
# ---------------------------------------------------------

app = FastAPI(
    title="Royal Square Portal API",
    description="Financial Onboarding & FNA Automation",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
MAX_DOCUMENTS = 5


# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Royal Square Portal backend is running",
        "demo_mode": DEMO_MODE,
    }


# ---------------------------------------------------------
# Basic upload test
# ---------------------------------------------------------

@app.post("/api/v1/upload")
async def upload_document(
    file: UploadFile = File(...)
):
    content_type = file.content_type or ""

    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported file type. "
                "Use PDF, PNG, JPG or JPEG."
            ),
        )

    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 10 MB upload limit.",
        )

    return {
        "status": "success",
        "filename": file.filename,
        "content_type": content_type,
        "size_bytes": len(file_data),
    }


# ---------------------------------------------------------
# Document extraction only
# ---------------------------------------------------------

@app.post("/api/v1/extract-document")
async def extract_document(
    file: UploadFile = File(...)
):
    content_type = file.content_type or ""

    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported file type. "
                "Use PDF, PNG, JPG or JPEG."
            ),
        )

    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 10 MB upload limit.",
        )

    try:
        extracted_data = parse_financial_document(
            filename=file.filename or "document",
            content_type=content_type,
            file_bytes=file_data,
        )

        return {
            "status": "success",
            "extraction_mode": (
                "demo"
                if DEMO_MODE
                else "live"
            ),
            "demo_warning": (
                "Synthetic demonstration data was used. "
                "Values were not extracted from the uploaded document."
                if DEMO_MODE
                else None
            ),
            "extracted_data": extracted_data.model_dump(
                mode="json"
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Document extraction failed: {error}"
            ),
        )


# ---------------------------------------------------------
# Complete FNA processing pipeline
# ---------------------------------------------------------

@app.post("/api/v1/process-document")
async def process_document(
    file: UploadFile = File(...)
):
    """
    Complete Royal Square FNA processing pipeline.

    1. Validate uploaded document
    2. Extract structured FNA information
    3. Validate using the FNA schema
    4. Populate the Royal Square Excel workbook
    5. Calculate the FNA summary
    6. Return a download URL
    """

    content_type = file.content_type or ""

    # -----------------------------------------------------
    # Validate file type
    # -----------------------------------------------------

    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                "Unsupported file type. "
                "Upload PDF, PNG, JPG or JPEG."
            ),
        )

    # -----------------------------------------------------
    # Read uploaded file
    # -----------------------------------------------------

    file_data = await file.read()

    if not file_data:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty.",
        )

    if len(file_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds the 10 MB upload limit.",
        )

    try:
        # -------------------------------------------------
        # Step 1:
        # Extract + validate financial information
        # -------------------------------------------------

        extracted_data = parse_financial_document(
            filename=file.filename or "document",
            content_type=content_type,
            file_bytes=file_data,
        )

        # -------------------------------------------------
        # Step 2:
        # Populate Royal Square FNA workbook
        # -------------------------------------------------

        output_path, summary = populate_fna_workbook(
            extracted_data
        )

        # -------------------------------------------------
        # Step 3:
        # Return API result
        # -------------------------------------------------

        return {
            "status": "success",

            "extraction_mode": (
                "demo"
                if DEMO_MODE
                else "live"
            ),

            "demo_warning": (
                "Synthetic demonstration data was used. "
                "Values were not extracted from the uploaded document."
                if DEMO_MODE
                else None
            ),

            "original_filename": file.filename,

            "extracted_data": extracted_data.model_dump(
                mode="json"
            ),

            "summary": summary,

            "processed_filename": output_path.name,

            "download_url": (
                f"/api/v1/download/"
                f"{output_path.name}"
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Document processing failed: {error}"
            ),
        )


# ---------------------------------------------------------
# Processed FNA download
# ---------------------------------------------------------

@app.get("/api/v1/download/{filename}")
async def download_processed_fna(
    filename: str
):
    output_directory = (
        Path(__file__).resolve().parents[1]
        / "data"
        / "processed"
    )

    # Prevent directory traversal attacks.
    safe_name = Path(filename).name

    file_path = (
        output_directory
        / safe_name
    )

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Processed FNA file not found.",
        )

    return FileResponse(
        path=file_path,
        filename=safe_name,
        media_type=(
            "application/"
            "vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
    )

@app.post("/api/v1/process-documents")
async def process_documents(
    files: list[UploadFile],
):
    """
    Process multiple client documents as one onboarding case.

    Demo Mode uses synthetic FNA data while preserving
    the real multi-document upload workflow.
    """

    if not files:
        raise HTTPException(
            status_code=400,
            detail="At least one document is required.",
        )

    if len(files) > MAX_DOCUMENTS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"A maximum of {MAX_DOCUMENTS} "
                "documents may be uploaded."
            ),
        )

    validated_documents = []

    for file in files:
        content_type = file.content_type or ""

        if content_type not in ALLOWED_FILE_TYPES:
            raise HTTPException(
                status_code=415,
                detail=(
                    f"Unsupported file type for "
                    f"{file.filename}. "
                    "Use PDF, PNG, JPG or JPEG."
                ),
            )

        file_data = await file.read()

        if not file_data:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"{file.filename} is empty."
                ),
            )

        if len(file_data) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=(
                    f"{file.filename} exceeds "
                    "the 10 MB upload limit."
                ),
            )

        validated_documents.append(
            {
                "filename": (
                    file.filename or "document"
                ),
                "content_type": content_type,
                "file_bytes": file_data,
                "size_bytes": len(file_data),
            }
        )

    try:
        # -------------------------------------------------
        # Demo Mode
        # -------------------------------------------------

        if DEMO_MODE:
            first_document = validated_documents[0]

            extracted_data = parse_financial_document(
                filename=first_document["filename"],
                content_type=first_document[
                    "content_type"
                ],
                file_bytes=first_document[
                    "file_bytes"
                ],
            )

        else:
            raise HTTPException(
                status_code=501,
                detail=(
                    "Live multi-document extraction "
                    "is not enabled in this prototype. "
                    "Use DEMO_MODE=true."
                ),
            )

        # -------------------------------------------------
        # Generate FNA
        # -------------------------------------------------

        output_path, summary = (
            populate_fna_workbook(
                extracted_data
            )
        )

        return {
            "status": "success",
            "extraction_mode": "demo",

            "demo_warning": (
                "Synthetic demonstration data was used. "
                "Values were not extracted from the "
                "uploaded documents."
            ),

            "document_count": len(
                validated_documents
            ),

            "uploaded_documents": [
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
            ],

            "extracted_data": (
                extracted_data.model_dump(
                    mode="json"
                )
            ),

            "summary": summary,

            "processed_filename": (
                output_path.name
            ),

            "download_url": (
                f"/api/v1/download/"
                f"{output_path.name}"
            ),
        }

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Multi-document processing "
                f"failed: {error}"
            ),
        )

# ---------------------------------------------------------
# Adviser verification + final FNA generation
# ---------------------------------------------------------

@app.post("/api/v1/finalise-fna")
async def finalise_fna(
    payload: FNADataPayload,
):
    """
    Validate adviser-reviewed FNA data and generate a final workbook.

    The browser sends the complete structured FNA payload after the
    adviser has reviewed/corrected the extracted values. Pydantic
    validates the payload before the workbook is generated.
    """

    try:
        output_path, summary = populate_fna_workbook(
            payload
        )

        return {
            "status": "success",
            "verification_status": "adviser_verified",
            "extracted_data": payload.model_dump(
                mode="json"
            ),
            "summary": summary,
            "processed_filename": output_path.name,
            "download_url": (
                f"/api/v1/download/"
                f"{output_path.name}"
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=(
                "Final FNA generation failed: "
                f"{error}"
            ),
        )