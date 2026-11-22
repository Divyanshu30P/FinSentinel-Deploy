import io
import pandas as pd
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends

from backend.app.config import settings
from backend.app.models.user import User
from backend.app.auth import get_current_user
from backend.app.services.ocr_service import OCRService
from backend.app.fraud_detection.transaction_detector import TransactionDetector

router = APIRouter(prefix="/upload", tags=["Uploads & Ingestion"])

@router.post("/screenshot")
async def upload_screenshot(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if file.content_type not in settings.ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{file.content_type}'. Allowed formats: JPG, PNG, WEBP."
        )

    content = await file.read()
    if len(content) > settings.MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Image size exceeds the maximum limit of {settings.MAX_IMAGE_SIZE_MB}MB."
        )

    result = OCRService.extract_text_from_bytes(content, filename=file.filename or "")
    if not result.get("success", False):
        raise HTTPException(status_code=422, detail=result.get("error", "Failed to extract text from image."))

    return {
        "filename": file.filename,
        "extracted_text": result["extracted_text"],
        "is_tesseract_installed": result.get("is_tesseract_installed", False),
        "notice": result.get("notice", "")
    }

@router.post("/transactions")
async def upload_transactions_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Analyse a CSV in memory and do not persist its contents or results."""
    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        await file.close()
        raise HTTPException(status_code=400, detail="Only CSV files (.csv) are supported for transaction statements.")

    content = b""
    df = None
    try:
        max_bytes = settings.MAX_TRANSACTION_CSV_SIZE_MB * 1024 * 1024
        content = await file.read(max_bytes + 1)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"CSV file exceeds the maximum size of {settings.MAX_TRANSACTION_CSV_SIZE_MB}MB."
            )

        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception:
            raise HTTPException(status_code=400, detail="Could not read this CSV. Check that it is a valid, properly formatted CSV file.")

        if df.empty:
            raise HTTPException(status_code=400, detail="Uploaded CSV file contains no transaction records.")
        if len(df) > settings.MAX_TRANSACTION_CSV_ROWS:
            raise HTTPException(
                status_code=413,
                detail=f"CSV contains too many rows. The maximum is {settings.MAX_TRANSACTION_CSV_ROWS} transactions."
            )

        batch_res = TransactionDetector.analyze_batch(df)
        batch_res["privacy_notice"] = (
            "Transaction data is processed in memory for this analysis. "
            "FinSentinel does not save the uploaded CSV or transaction-level results to its database. "
            "The results are returned to your browser for display during this session."
        )
        batch_res["data_retained_by_application"] = False
        return batch_res
    finally:
        # Release request data promptly; no upload file is written to disk.
        if df is not None:
            del df
        content = b""
        await file.close()
