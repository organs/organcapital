from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class DimCustodian(Base):
    __tablename__ = "dim_custodian"

    custodian_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # prime_broker / custodian_bank
    account_number = Column(String)
    currency = Column(String, default="USD")
    contact_email = Column(String)
    city = Column(String)

    cash_records = relationship("FctCurrentCash", back_populates="custodian")
    needs = relationship("FctNeeds", back_populates="custodian")


class DimTime(Base):
    __tablename__ = "dim_time"

    date_id = Column(Date, primary_key=True)
    day_of_week = Column(String)
    week_number = Column(Integer)
    month = Column(Integer)
    quarter = Column(Integer)
    year = Column(Integer)
    is_business_day = Column(Boolean, default=True)


class FctCurrentCash(Base):
    __tablename__ = "fct_current_cash"

    settlement_id = Column(Integer, primary_key=True, index=True)
    date_id = Column(Date, ForeignKey("dim_time.date_id"), nullable=False)
    custodian_id = Column(Integer, ForeignKey("dim_custodian.custodian_id"), nullable=False)
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, default=0.0)
    inflows = Column(Float, default=0.0)
    outflows = Column(Float, default=0.0)
    currency = Column(String, default="USD")

    custodian = relationship("DimCustodian", back_populates="cash_records")


class FctAssets(Base):
    __tablename__ = "fct_assets"

    asset_id = Column(Integer, primary_key=True, index=True)
    date_id = Column(Date, ForeignKey("dim_time.date_id"), nullable=False)
    asset_type = Column(String, nullable=False)  # bond / cds / interest_rate_swap / option
    ticker = Column(String)
    cusip = Column(String)
    issuer = Column(String)
    face_value = Column(Float, default=0.0)
    market_value = Column(Float, default=0.0)
    accrued_interest = Column(Float, default=0.0)
    settlement_date = Column(Date)
    counterparty = Column(String)
    currency = Column(String, default="USD")
    sector = Column(String)
    rating = Column(String)


class FctNeeds(Base):
    __tablename__ = "fct_needs"

    need_id = Column(Integer, primary_key=True, index=True)
    date_id = Column(Date, ForeignKey("dim_time.date_id"), nullable=False)
    need_type = Column(String, nullable=False)  # trade_settlement / margin_call / redemption / subscription / coupon_payment
    amount = Column(Float, default=0.0)  # positive = inflow, negative = outflow
    description = Column(Text)
    status = Column(String, default="pending")  # pending / settled / failed
    priority = Column(String, default="medium")  # high / medium / low
    custodian_id = Column(Integer, ForeignKey("dim_custodian.custodian_id"))
    linked_asset_id = Column(Integer, ForeignKey("fct_assets.asset_id"), nullable=True)

    custodian = relationship("DimCustodian", back_populates="needs")
