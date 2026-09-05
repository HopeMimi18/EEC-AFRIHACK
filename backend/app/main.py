from fastapi import FastAPI
from fastapi import FastAPI, File, HTTPException, UploadFile
from app.document_parser import parse_financial_document
from app.schemas import FNADataPayload


app = FastAPI(
    title="Royal Square Portal API",
    description="Financial Onboarding & FNA Automation",
    version="0.1.0",
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "message": "Royal Square Portal backend is running"
    }

ALLOWED_FILE_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
}

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@app.post("/api/v1/upload")
async def upload_document(file: UploadFile = File(...)):
    content_type = file.content_type or ""

    if content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Use PDF, PNG, JPG or JPEG.",
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
            detail="File exceeds the upload limit.",
        )

    try:
        extracted_data = parse_financial_document(
            filename=file.filename or "document",
            content_type=content_type,
            file_bytes=file_data,
        )

        return {
            "status": "success",
            "extracted_data": extracted_data.model_dump(
                mode="json"
            ),
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Document extraction failed: {error}",
        )
