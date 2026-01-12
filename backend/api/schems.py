from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

class SettlementType(str, Enum):
    TWITTER = "TWITTER"
    KRAFT_HEINZ = "KRAFT_HEINZ"

class TransactionType(str, Enum):
    PURCHASE = "PURCHASE"
    SALE = "SALE"
    BEGINNING_HOLDINGS = "BEGINNING_HOLDINGS"

class InflationPeriod(BaseModel):
    start: str = Field(..., description="Start date in ISO format")
    end: str = Field(..., description="End date in ISO format")
    inflation: float = Field(..., description="Inflation amount per share")

class TimeGroup(BaseModel):
    name: str = Field(..., description="Group name")
    start: str = Field(..., description="Start date")
    end: str = Field(..., description="End date")

class SettlementConfig(BaseModel):
    settlement_type: SettlementType
    class_start: str = Field(..., description="Class period start")
    class_end: str = Field(..., description="Class period end")
    lookback_start: Optional[str] = Field(None, description="Lookback period start")
    lookback_end: Optional[str] = Field(None, description="Lookback period end")
    average_price: Optional[float] = Field(None, description="Average price for lookback")
    inflation_periods: List[InflationPeriod] = Field(default_factory=list)
    decline_matrix: Optional[Dict[str, float]] = Field(None, description="Decline matrix for Twitter")
    time_groups: Optional[List[TimeGroup]] = Field(None, description="Time groups for Twitter")

    @validator('class_start', 'class_end')
    def validate_date_format(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError(f"Invalid date format: {v}. Use ISO format.")
        return v

class Transaction(BaseModel):
    id: Optional[str] = Field(None, description="Transaction ID")
    date: str = Field(..., description="Transaction date")
    quantity: float = Field(..., gt=0, description="Number of shares")
    price: float = Field(..., gt=0, description="Price per share")
    type: TransactionType = Field(..., description="Transaction type")
    entity: str = Field(..., description="Client/entity name")
    fund_name: str = Field(..., description="Fund name")
    security_id: Optional[str] = Field(None, description="Security identifier")
    comment: Optional[str] = Field(None, description="Comments")

    @validator('date')
    def validate_date(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError(f"Invalid date format: {v}")
        return v

class CalculationRequest(BaseModel):
    config: SettlementConfig
    transactions: List[Transaction]
    use_fifo: bool = Field(True, description="Use FIFO matching")
    request_id: Optional[str] = Field(None, description="Client request ID")

class CalculationResponse(BaseModel):
    request_id: str
    calculation_id: str
    timestamp: str
    total_recognized_loss: float
    settlement_type: str
    processing_time_ms: float
    matches_count: int
    summary: Dict[str, Any]
    matches: List[Dict[str, Any]]

class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str
    uptime_seconds: float
    memory_usage_mb: float

class ErrorResponse(BaseModel):
    error: bool
    code: int
    message: str
    timestamp: str
    details: Optional[Dict[str, Any]] = None