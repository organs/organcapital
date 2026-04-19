from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date
from typing import List, Optional

from database import get_db
from models import FctAssets, FctCurrentCash
from schemas import AssetSchema

router = APIRouter(prefix="/assets", tags=["assets"])


def _latest_asset_date(db: Session) -> date:
    result = db.query(func.max(FctAssets.date_id)).scalar()
    return result or date.today()


@router.get("", response_model=List[AssetSchema])
def get_assets(
    as_of_date: Optional[date] = Query(None),
    asset_type: Optional[str] = Query(None),
    counterparty: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    target = as_of_date or _latest_asset_date(db)
    query = db.query(FctAssets).filter(FctAssets.date_id == target)
    if asset_type:
        query = query.filter(FctAssets.asset_type == asset_type)
    if counterparty:
        query = query.filter(FctAssets.counterparty == counterparty)
    return query.all()


@router.get("/summary")
def get_asset_summary(db: Session = Depends(get_db)):
    target = _latest_asset_date(db)
    rows = db.query(FctAssets).filter(FctAssets.date_id == target).all()

    by_type: dict = {}
    total_mv = 0.0
    for r in rows:
        by_type[r.asset_type] = by_type.get(r.asset_type, 0) + r.market_value
        total_mv += r.market_value

    return {
        "as_of_date": target,
        "total_market_value": round(total_mv, 2),
        "position_count": len(rows),
        "by_type": {k: round(v, 2) for k, v in by_type.items()},
    }
