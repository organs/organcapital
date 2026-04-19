from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import List, Optional

from database import get_db
from models import FctCurrentCash, DimCustodian, FctNeeds
from schemas import CashPositionSchema, CashSummarySchema, CashHistoryPoint

router = APIRouter(prefix="/cash", tags=["cash"])


def _latest_business_date(db: Session) -> date:
    result = db.query(func.max(FctCurrentCash.date_id)).scalar()
    return result or date.today()


@router.get("/positions", response_model=List[CashPositionSchema])
def get_positions(
    as_of_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    target = as_of_date or _latest_business_date(db)
    rows = (
        db.query(FctCurrentCash, DimCustodian)
        .join(DimCustodian, FctCurrentCash.custodian_id == DimCustodian.custodian_id)
        .filter(FctCurrentCash.date_id == target)
        .all()
    )
    return [
        CashPositionSchema(
            settlement_id=cash.settlement_id,
            date_id=cash.date_id,
            custodian_id=cash.custodian_id,
            custodian_name=cust.name,
            custodian_type=cust.type,
            opening_balance=cash.opening_balance,
            closing_balance=cash.closing_balance,
            inflows=cash.inflows,
            outflows=cash.outflows,
            currency=cash.currency,
        )
        for cash, cust in rows
    ]


@router.get("/summary", response_model=CashSummarySchema)
def get_summary(db: Session = Depends(get_db)):
    latest = _latest_business_date(db)
    positions = get_positions(as_of_date=latest, db=db)

    total_cash = sum(p.closing_balance for p in positions)
    total_inflows = sum(p.inflows for p in positions)
    total_outflows = sum(p.outflows for p in positions)

    # T+1 and T+2 net needs
    def net_needs_for_date(d: date) -> float:
        result = (
            db.query(func.sum(FctNeeds.amount))
            .filter(FctNeeds.date_id == d, FctNeeds.status == "pending")
            .scalar()
        )
        return float(result or 0)

    t1 = net_needs_for_date(latest + timedelta(days=1))
    t2 = net_needs_for_date(latest + timedelta(days=2))

    total_needs_7d = abs(
        db.query(func.sum(FctNeeds.amount))
        .filter(
            FctNeeds.date_id >= latest,
            FctNeeds.date_id <= latest + timedelta(days=7),
            FctNeeds.amount < 0,
            FctNeeds.status == "pending",
        )
        .scalar()
        or 0
    )
    coverage = (total_cash / total_needs_7d) if total_needs_7d > 0 else 999.0

    return CashSummarySchema(
        as_of_date=latest,
        total_cash=total_cash,
        total_inflows=total_inflows,
        total_outflows=total_outflows,
        t1_net_need=t1,
        t2_net_need=t2,
        cash_coverage_ratio=round(coverage, 2),
        positions=positions,
    )


@router.get("/history", response_model=List[CashHistoryPoint])
def get_history(
    custodian_id: Optional[int] = Query(None),
    days: int = Query(30),
    db: Session = Depends(get_db),
):
    latest = _latest_business_date(db)
    start = latest - timedelta(days=days)

    query = (
        db.query(FctCurrentCash, DimCustodian)
        .join(DimCustodian, FctCurrentCash.custodian_id == DimCustodian.custodian_id)
        .filter(FctCurrentCash.date_id >= start, FctCurrentCash.date_id <= latest)
    )
    if custodian_id:
        query = query.filter(FctCurrentCash.custodian_id == custodian_id)

    rows = query.order_by(FctCurrentCash.date_id).all()
    return [
        CashHistoryPoint(
            date=cash.date_id,
            custodian_id=cash.custodian_id,
            custodian_name=cust.name,
            closing_balance=cash.closing_balance,
        )
        for cash, cust in rows
    ]
