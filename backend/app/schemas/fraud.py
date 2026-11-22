from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class IndicatorItem(BaseModel):
    code: str
    title: str
    severity: str  # HIGH, MEDIUM, LOW
    description: str

class CollectRequestInput(BaseModel):
    sender_name: str = Field(..., description="Name of sender")
    sender_vpa: str = Field(..., description="Sender UPI ID / VPA")
    requested_amount: float = Field(..., description="Requested amount")
    request_description: Optional[str] = Field(None, description="Description or reason")
    expected_request: bool = Field(False, description="Whether user expected this request")
    sender_known: bool = Field(False, description="Whether user knows sender personally")
    associated_message: Optional[str] = Field(None, description="Accompanying instructions")

class PhishingMessageInput(BaseModel):
    message_text: str = Field(..., min_length=3, description="Message text to analyze")

class SingleTransactionInput(BaseModel):
    transaction_id: str
    timestamp: str
    amount: float
    transaction_type: str = "DEBIT"
    recipient_vpa: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "SUCCESS"

class TransactionBatchInput(BaseModel):
    transactions: List[SingleTransactionInput]

class FraudAnalysisResponse(BaseModel):
    id: str
    category: str
    input_summary: str
    risk_score: int
    risk_category: str
    detected_indicators: List[IndicatorItem]
    ml_confidence: Optional[float] = None
    explanation: str
    safety_recommendations: List[str]
    highlighted_spans: Optional[List[str]] = None
    created_at: str

class TransactionAnalysisResult(BaseModel):
    transaction_id: str
    timestamp: str
    amount: float
    transaction_type: str
    recipient_vpa: Optional[str] = None
    description: Optional[str] = None
    risk_score: int
    risk_category: str
    anomaly_flags: List[str]
    is_anomaly: bool
    explanation: str

class TransactionBatchResponse(BaseModel):
    summary: Dict[str, Any]
    results: List[TransactionAnalysisResult]
    privacy_notice: Optional[str] = None
    data_retained_by_application: Optional[bool] = None
