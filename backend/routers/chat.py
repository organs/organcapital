import os
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
import anthropic

from database import get_db
from models import FctCurrentCash, DimCustodian, FctNeeds
from schemas import ChatRequest, ChatResponse

router = APIRouter(prefix="/chat", tags=["chat"])

_client = None


def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY", "")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def _build_context(db: Session) -> str:
    latest = db.query(func.max(FctCurrentCash.date_id)).scalar() or date.today()

    positions = (
        db.query(FctCurrentCash, DimCustodian)
        .join(DimCustodian, FctCurrentCash.custodian_id == DimCustodian.custodian_id)
        .filter(FctCurrentCash.date_id == latest)
        .all()
    )

    cash_lines = "\n".join(
        f"  - {cust.name} ({cust.type}): ${cash.closing_balance:,.0f} USD"
        for cash, cust in positions
    )
    total_cash = sum(c.closing_balance for c, _ in positions)

    upcoming = (
        db.query(FctNeeds, DimCustodian)
        .outerjoin(DimCustodian, FctNeeds.custodian_id == DimCustodian.custodian_id)
        .filter(
            FctNeeds.date_id >= latest,
            FctNeeds.date_id <= latest + timedelta(days=7),
            FctNeeds.status == "pending",
        )
        .order_by(FctNeeds.date_id)
        .limit(20)
        .all()
    )

    needs_lines = "\n".join(
        f"  - {need.date_id} | {need.need_type} | ${need.amount:,.0f} | {need.priority} priority"
        + (f" @ {cust.name}" if cust else "")
        for need, cust in upcoming
    )

    return f"""You are the AI treasury assistant for Organ Capital, a systematic credit hedge fund.
Today's date: {latest}
Firm AUM: ~$500,000,000 USD

CURRENT CASH POSITIONS (EOD {latest}):
{cash_lines}
Total Firm Cash: ${total_cash:,.0f} USD

UPCOMING CASH NEEDS (next 7 days, pending only):
{needs_lines if needs_lines else "No pending needs in the next 7 days."}

Answer treasury and cash management questions concisely and accurately using the data above.
When amounts are unclear, use the numbers provided. Be direct and professional."""


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    client = get_client()
    context = _build_context(db)

    messages = [{"role": m.role, "content": m.content} for m in request.messages[-10:]]

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        system=[
            {
                "type": "text",
                "text": context,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=messages,
    )

    return ChatResponse(reply=response.content[0].text)
