import json
from typing import List, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.models.analysis import FraudAnalysis
from backend.app.models.notification import FraudAlert
from backend.app.schemas.fraud import (
    CollectRequestInput, PhishingMessageInput, TransactionBatchInput,
    FraudAnalysisResponse, TransactionBatchResponse
)
from backend.app.auth import get_current_user
from backend.app.fraud_detection.collect_detector import CollectRequestDetector
from backend.app.fraud_detection.phishing_detector import PhishingDetector
from backend.app.fraud_detection.transaction_detector import TransactionDetector
from backend.app.fraud_detection.explanation_engine import ExplanationEngine

router = APIRouter(prefix="/fraud", tags=["Fraud Detection Modules"])

@router.post("/analyze-collect-request", response_model=FraudAnalysisResponse)
async def analyze_collect_request(
    payload: CollectRequestInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis_res = CollectRequestDetector.analyze(payload)
    
    # Generate human / AI explanation
    explanation = await ExplanationEngine.get_explanation(
        category="UPI Collect Request",
        input_text=analysis_res["input_summary"],
        risk_category=analysis_res["risk_category"],
        risk_score=analysis_res["risk_score"],
        indicators=analysis_res["detected_indicators"]
    )
    analysis_res["explanation"] = explanation

    # Save to database
    db_analysis = FraudAnalysis(
        user_id=current_user.id,
        category="COLLECT_REQUEST",
        input_summary=analysis_res["input_summary"],
        input_details=json.dumps(analysis_res["input_details"]),
        risk_score=analysis_res["risk_score"],
        risk_category=analysis_res["risk_category"],
        detected_indicators=json.dumps(analysis_res["detected_indicators"]),
        ml_confidence=None,
        explanation=explanation,
        safety_recommendations=json.dumps(analysis_res["recommendations"]),
        is_demo=current_user.is_demo
    )
    db.add(db_analysis)
    
    # If High or Medium risk, create FraudAlert
    if analysis_res["risk_category"] in ["HIGH", "MEDIUM"]:
        alert = FraudAlert(
            user_id=current_user.id,
            title=f"Suspicious Collect Request: {payload.sender_vpa}",
            description=f"Identified {analysis_res['risk_category']} risk request for Rs {payload.requested_amount:,.2f}.",
            risk_category=analysis_res["risk_category"],
            analysis_id=db_analysis.id
        )
        db.add(alert)

    db.commit()
    db.refresh(db_analysis)

    return {
        "id": db_analysis.id,
        "category": db_analysis.category,
        "input_summary": db_analysis.input_summary,
        "risk_score": db_analysis.risk_score,
        "risk_category": db_analysis.risk_category,
        "detected_indicators": analysis_res["detected_indicators"],
        "ml_confidence": None,
        "explanation": db_analysis.explanation,
        "safety_recommendations": analysis_res["recommendations"],
        "highlighted_spans": None,
        "created_at": db_analysis.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

@router.post("/analyze-message", response_model=FraudAnalysisResponse)
async def analyze_message(
    payload: PhishingMessageInput,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis_res = PhishingDetector.analyze(payload.message_text)

    # Generate explanation
    explanation = await ExplanationEngine.get_explanation(
        category="Financial Message",
        input_text=analysis_res["input_summary"],
        risk_category=analysis_res["risk_category"],
        risk_score=analysis_res["risk_score"],
        indicators=analysis_res["detected_indicators"]
    )
    analysis_res["explanation"] = explanation

    # Save to database
    db_analysis = FraudAnalysis(
        user_id=current_user.id,
        category="PHISHING_MESSAGE",
        input_summary=analysis_res["input_summary"],
        input_details=json.dumps(analysis_res["input_details"]),
        risk_score=analysis_res["risk_score"],
        risk_category=analysis_res["risk_category"],
        detected_indicators=json.dumps(analysis_res["detected_indicators"]),
        ml_confidence=analysis_res["ml_confidence"],
        explanation=explanation,
        safety_recommendations=json.dumps(analysis_res["recommendations"]),
        is_demo=current_user.is_demo
    )
    db.add(db_analysis)

    # Alert generation
    if analysis_res["risk_category"] in ["HIGH", "MEDIUM"]:
        alert = FraudAlert(
            user_id=current_user.id,
            title=f"Phishing Message Flagged: {analysis_res['risk_category']} Risk",
            description=analysis_res["input_summary"],
            risk_category=analysis_res["risk_category"],
            analysis_id=db_analysis.id
        )
        db.add(alert)

    db.commit()
    db.refresh(db_analysis)

    return {
        "id": db_analysis.id,
        "category": db_analysis.category,
        "input_summary": db_analysis.input_summary,
        "risk_score": db_analysis.risk_score,
        "risk_category": db_analysis.risk_category,
        "detected_indicators": analysis_res["detected_indicators"],
        "ml_confidence": analysis_res["ml_confidence"],
        "explanation": db_analysis.explanation,
        "safety_recommendations": analysis_res["recommendations"],
        "highlighted_spans": analysis_res.get("highlighted_spans", []),
        "created_at": db_analysis.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

@router.post("/analyze-transactions", response_model=TransactionBatchResponse)
async def analyze_transactions(
    payload: TransactionBatchInput,
    current_user: User = Depends(get_current_user)
):
    """Analyse supplied transactions without storing transaction-level data."""
    if not payload.transactions:
        raise HTTPException(status_code=400, detail="No transactions provided for analysis.")

    records = [t.model_dump() for t in payload.transactions]
    df = pd.DataFrame(records)
    batch_res = TransactionDetector.analyze_batch(df)
    batch_res["privacy_notice"] = (
        "Transaction data is processed for this analysis and is not saved to FinSentinel's database. "
        "Results are returned to your browser for display during this session."
    )
    batch_res["data_retained_by_application"] = False
    return batch_res

@router.get("/history")
def get_history(
    category: Optional[str] = None,
    risk: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FraudAnalysis).filter(FraudAnalysis.user_id == current_user.id)
    
    if category and category != "ALL":
        query = query.filter(FraudAnalysis.category == category)
    if risk and risk != "ALL":
        query = query.filter(FraudAnalysis.risk_category == risk)
    if search:
        query = query.filter(FraudAnalysis.input_summary.ilike(f"%{search}%"))

    analyses = query.order_by(FraudAnalysis.created_at.desc()).limit(limit).all()

    results = []
    for a in analyses:
        results.append({
            "id": a.id,
            "category": a.category,
            "input_summary": a.input_summary,
            "risk_score": a.risk_score,
            "risk_category": a.risk_category,
            "detected_indicators": json.loads(a.detected_indicators) if a.detected_indicators else [],
            "ml_confidence": a.ml_confidence,
            "explanation": a.explanation,
            "safety_recommendations": json.loads(a.safety_recommendations) if a.safety_recommendations else [],
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M:%S")
        })
    return results

@router.get("/{analysis_id}", response_model=FraudAnalysisResponse)
def get_analysis_detail(
    analysis_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    analysis = db.query(FraudAnalysis).filter(
        FraudAnalysis.id == analysis_id,
        FraudAnalysis.user_id == current_user.id
    ).first()

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis record not found")

    return {
        "id": analysis.id,
        "category": analysis.category,
        "input_summary": analysis.input_summary,
        "risk_score": analysis.risk_score,
        "risk_category": analysis.risk_category,
        "detected_indicators": json.loads(analysis.detected_indicators) if analysis.detected_indicators else [],
        "ml_confidence": analysis.ml_confidence,
        "explanation": analysis.explanation,
        "safety_recommendations": json.loads(analysis.safety_recommendations) if analysis.safety_recommendations else [],
        "created_at": analysis.created_at.strftime("%Y-%m-%d %H:%M:%S")
    }

@router.delete("/history")
def clear_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    db.query(FraudAnalysis).filter(FraudAnalysis.user_id == current_user.id).delete()
    db.query(FraudAlert).filter(FraudAlert.user_id == current_user.id).delete()
    db.query(TransactionRecord).filter(TransactionRecord.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Analysis history cleared successfully"}
