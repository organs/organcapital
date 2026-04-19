from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, timedelta
from typing import List, Optional

from database import get_db
from models import FctNeeds, DimCustodian, FctCurrentCash
from schemas import NeedSchema, NeedsForecastDay

router = APIRouter(prefix="/needs", tags=["needs"])


def _latest_date(db: Session) -> date:
    result = db.query(func.max(FctCurrentCash.date_id)).scalar()
    return result or date.today()


@router.get("", response_model=List[NeedSchema])
def get_needs(
    from_date: Optional[date] = Query(None),
    to_date: Optional[date] = Query(None),
    status: Optional[str] = Query(None),
    need_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    latest = _latest_date(db)
    start = from_date or latest
    end = to_date or (latest + timedelta(days=14))

    query = (
        db.query(FctNeeds, DimCustodian)
        .outerjoin(DimCustodian, FctNeeds.custodian_id == DimCustodian.custodian_id)
        .filter(FctNeeds.date_id >= start, FctNeeds.date_id <= end)
    )
    if status:
        query = query.filter(FctNeeds.status == status)
    if need_type:
        query = query.filter(FctNeeds.need_type == need_type)

    rows = query.order_by(FctNeeds.date_id, FctNeeds.priority).all()
    return [
        NeedSchema(
            need_id=need.need_id,
            date_id=need.date_id,
            need_type=need.need_type,
            amount=need.amount,
            description=need.description,
            status=need.status,
            priority=need.priority,
            custodian_id=need.custodian_id,
            custodian_name=cust.name if cust else None,
            linked_asset_id=need.linked_asset_id,
        )
        for need, cust in rows
    ]


@router.get("/forecast", response_model=List[NeedsForecastDay])
def get_forecast(days: int = Query(7), db: Session = Depends(get_db)):
    latest = _latest_date(db)
    result = []
    for i in range(days):
        d = latest + timedelta(days=i)
        rows = db.query(FctNeeds).filter(FctNeeds.date_id == d, FctNeeds.status == "pending").all()
        inflows = sum(r.amount for r in rows if r.amount > 0)
        outflows = sum(r.amount for r in rows if r.amount < 0)
        breakdown: dict = {}
        for r in rows:
            breakdown[r.need_type] = breakdown.get(r.need_type, 0) + r.amount
        result.append(
            NeedsForecastDay(
                date=d,
                net_amount=round(inflows + outflows, 2),
                inflows=round(inflows, 2),
                outflows=round(outflows, 2),
                breakdown={k: round(v, 2) for k, v in breakdown.items()},
            )
        )
    return result
