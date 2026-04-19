from pydantic import BaseModel
from datetime import date
from typing import Optional, List


class CustodianSchema(BaseModel):
    custodian_id: int
    name: str
    type: str
    account_number: Optional[str]
    currency: str
    contact_email: Optional[str]
    city: Optional[str]

    class Config:
        from_attributes = True


class CashPositionSchema(BaseModel):
    settlement_id: int
    date_id: date
    custodian_id: int
    custodian_name: str
    custodian_type: str
    opening_balance: float
    closing_balance: float
    inflows: float
    outflows: float
    currency: str

    class Config:
        from_attributes = True


class CashSummarySchema(BaseModel):
    as_of_date: date
    total_cash: float
    total_inflows: float
    total_outflows: float
    t1_net_need: float
    t2_net_need: float
    cash_coverage_ratio: float
    positions: List[CashPositionSchema]


class CashHistoryPoint(BaseModel):
    date: date
    custodian_id: int
    custodian_name: str
    closing_balance: float


class AssetSchema(BaseModel):
    asset_id: int
    date_id: date
    asset_type: str
    ticker: Optional[str]
    cusip: Optional[str]
    issuer: Optional[str]
    face_value: float
    market_value: float
    accrued_interest: float
    settlement_date: Optional[date]
    counterparty: Optional[str]
    currency: str
    sector: Optional[str]
    rating: Optional[str]

    class Config:
        from_attributes = True


class NeedSchema(BaseModel):
    need_id: int
    date_id: date
    need_type: str
    amount: float
    description: Optional[str]
    status: str
    priority: str
    custodian_id: Optional[int]
    custodian_name: Optional[str]
    linked_asset_id: Optional[int]

    class Config:
        from_attributes = True


class NeedsForecastDay(BaseModel):
    date: date
    net_amount: float
    inflows: float
    outflows: float
    breakdown: dict


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class ChatResponse(BaseModel):
    reply: str
