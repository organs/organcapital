"""
Seed script for Organ Capital fake data.
Run: python seed.py
Generates ~18 months of realistic treasury data.
"""

import random
import math
import os
import sys
from datetime import date, timedelta
from sqlalchemy.orm import Session

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import engine, SessionLocal, Base
from models import DimCustodian, DimTime, FctCurrentCash, FctAssets, FctNeeds

random.seed(42)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

US_HOLIDAYS_2024_2025 = {
    date(2024, 1, 1), date(2024, 1, 15), date(2024, 2, 19), date(2024, 5, 27),
    date(2024, 6, 19), date(2024, 7, 4), date(2024, 9, 2), date(2024, 11, 11),
    date(2024, 11, 28), date(2024, 12, 25),
    date(2025, 1, 1), date(2025, 1, 20), date(2025, 2, 17), date(2025, 5, 26),
    date(2025, 6, 19), date(2025, 7, 4), date(2025, 9, 1), date(2025, 11, 11),
    date(2025, 11, 27), date(2025, 12, 25),
}


def is_business_day(d: date) -> bool:
    return d.weekday() < 5 and d not in US_HOLIDAYS_2024_2025


def date_range(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=1)


def business_days(start: date, end: date):
    return [d for d in date_range(start, end) if is_business_day(d)]


FAKE_ISSUERS = [
    "Apex Energy Corp", "Meridian Healthcare", "Atlas Retail Group", "Nexus Telecom",
    "Pinnacle Auto Finance", "Crestwood Media", "Irongate Manufacturing",
    "Solaris Real Estate", "Titan Logistics", "Vanguard Consumer Brands",
    "Harbor Financial Services", "Summit Technology", "Pacific Gaming Corp",
    "Redwood Pharma", "Eagle Infrastructure", "Cascade Chemicals",
    "Fortress Defense Systems", "Keystone Agriculture", "Riverstone Energy",
    "Northstar Hospitality",
]

SECTORS = ["Energy", "Healthcare", "Retail", "Telecom", "Auto", "Media",
           "Manufacturing", "Real Estate", "Logistics", "Consumer", "Financials",
           "Technology", "Gaming", "Pharma", "Infrastructure"]

RATINGS = ["BBB+", "BBB", "BBB-", "BB+", "BB", "BB-", "B+", "B", "B-"]

CUSIP_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789"


def fake_cusip():
    return "".join(random.choices(CUSIP_CHARS, k=9))


def random_walk(start: float, volatility: float, mean_reversion: float, min_val: float, max_val: float, n: int):
    values = [start]
    for _ in range(n - 1):
        shock = random.gauss(0, volatility)
        reversion = mean_reversion * (start - values[-1])
        new_val = values[-1] + shock + reversion
        new_val = max(min_val, min(max_val, new_val))
        values.append(new_val)
    return values


# ---------------------------------------------------------------------------
# Custodians
# ---------------------------------------------------------------------------

CUSTODIANS = [
    {"name": "Goldman Sachs Prime", "type": "prime_broker", "account_number": "GS-PB-OC-001",
     "currency": "USD", "contact_email": "pbops@gs.com", "city": "New York"},
    {"name": "Morgan Stanley Prime", "type": "prime_broker", "account_number": "MS-PB-OC-002",
     "currency": "USD", "contact_email": "primebrokerage@ms.com", "city": "New York"},
    {"name": "BNY Mellon Custody", "type": "custodian_bank", "account_number": "BNY-CUS-OC-003",
     "currency": "USD", "contact_email": "custody@bnymellon.com", "city": "New York"},
    {"name": "State Street Custody", "type": "custodian_bank", "account_number": "SST-CUS-OC-004",
     "currency": "USD", "contact_email": "custody@statestreet.com", "city": "Boston"},
]

# Starting cash allocation per custodian (~$120M total)
CUSTODIAN_STARTING_CASH = [35_000_000, 30_000_000, 35_000_000, 20_000_000]
CUSTODIAN_VOLATILITY = [2_500_000, 2_000_000, 1_500_000, 1_000_000]


# ---------------------------------------------------------------------------
# Asset templates (40 positions)
# ---------------------------------------------------------------------------

def build_asset_templates():
    templates = []
    asset_types = ["bond"] * 22 + ["cds"] * 8 + ["interest_rate_swap"] * 6 + ["option"] * 4

    tickers_bonds = [
        "HYG", "JNK", "BKLN", "ANGL", "USHY", "PHB", "HYLS", "FALN",
        "SHYG", "HYLB", "SJNK", "HYD", "HYXF", "HYXU", "HYHG", "HYEM",
        "EMHY", "PCY", "EMB", "VWOB", "CEMB", "IBND",
    ]
    tickers_cds = ["CDX.NA.HY.43", "CDX.NA.HY.42", "CDX.NA.IG.43",
                   "iTraxx.EUR.41", "CDX.EM.38", "CDX.NA.HY.41",
                   "SNAC.HY", "CDX.XO.14"]
    tickers_irs = ["LIBOR3M-5Y", "SOFR-10Y", "SOFR-7Y", "EURIBOR-5Y", "SOFR-2Y", "SONIA-3Y"]
    tickers_opt = ["HYG-PUT-JUN25", "JNK-CALL-DEC25", "CDX-SWAPTION-MAR25", "HY-CAP-SEP25"]

    all_tickers = tickers_bonds + tickers_cds + tickers_irs + tickers_opt

    for i, atype in enumerate(asset_types):
        issuer = random.choice(FAKE_ISSUERS)
        sector = random.choice(SECTORS)
        rating = random.choice(RATINGS)
        face = round(random.uniform(5_000_000, 25_000_000) / 1_000_000) * 1_000_000

        templates.append({
            "asset_type": atype,
            "ticker": all_tickers[i],
            "cusip": fake_cusip(),
            "issuer": issuer,
            "face_value": face,
            "sector": sector,
            "rating": rating,
            "counterparty": random.choice(["Goldman Sachs Prime", "Morgan Stanley Prime"]),
            "currency": "USD",
        })
    return templates


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------

def seed_custodians(db: Session):
    print("Seeding custodians...")
    for c in CUSTODIANS:
        db.add(DimCustodian(**c))
    db.commit()
    print(f"  {len(CUSTODIANS)} custodians inserted.")


def seed_dim_time(db: Session, start: date, end: date):
    print("Seeding dim_time...")
    count = 0
    for d in date_range(start, end):
        db.add(DimTime(
            date_id=d,
            day_of_week=d.strftime("%A"),
            week_number=d.isocalendar()[1],
            month=d.month,
            quarter=(d.month - 1) // 3 + 1,
            year=d.year,
            is_business_day=is_business_day(d),
        ))
        count += 1
    db.commit()
    print(f"  {count} days inserted.")


def seed_cash(db: Session, start: date, end: date):
    print("Seeding fct_current_cash...")
    bdays = business_days(start, end)
    custodians = db.query(DimCustodian).all()

    records = []
    for idx, cust in enumerate(custodians):
        start_bal = CUSTODIAN_STARTING_CASH[idx]
        vol = CUSTODIAN_VOLATILITY[idx]
        balances = random_walk(
            start=start_bal,
            volatility=vol,
            mean_reversion=0.08,
            min_val=5_000_000,
            max_val=80_000_000,
            n=len(bdays),
        )

        prev_close = start_bal
        for i, d in enumerate(bdays):
            close = round(balances[i], 2)
            change = close - prev_close
            inflows = round(max(0, change + random.uniform(0, vol * 0.3)), 2)
            outflows = round(max(0, -change + random.uniform(0, vol * 0.3)), 2)
            records.append(FctCurrentCash(
                date_id=d,
                custodian_id=cust.custodian_id,
                opening_balance=round(prev_close, 2),
                closing_balance=close,
                inflows=inflows,
                outflows=outflows,
                currency="USD",
            ))
            prev_close = close

    db.bulk_save_objects(records)
    db.commit()
    print(f"  {len(records)} cash records inserted.")


def seed_assets(db: Session, start: date, end: date):
    print("Seeding fct_assets...")
    bdays = business_days(start, end)
    templates = build_asset_templates()

    records = []
    for tmpl in templates:
        # Daily mark-to-market for each asset
        base_mv = tmpl["face_value"] * random.uniform(0.85, 1.05)
        mv_series = random_walk(
            start=base_mv,
            volatility=base_mv * 0.005,
            mean_reversion=0.03,
            min_val=base_mv * 0.6,
            max_val=base_mv * 1.3,
            n=len(bdays),
        )
        for i, d in enumerate(bdays):
            mv = round(mv_series[i], 2)
            accrued = round(tmpl["face_value"] * 0.0425 * (d.timetuple().tm_yday / 365), 2)
            settle_offset = 2 if tmpl["asset_type"] == "bond" else 1
            records.append(FctAssets(
                date_id=d,
                asset_type=tmpl["asset_type"],
                ticker=tmpl["ticker"],
                cusip=tmpl["cusip"],
                issuer=tmpl["issuer"],
                face_value=tmpl["face_value"],
                market_value=mv,
                accrued_interest=accrued,
                settlement_date=d + timedelta(days=settle_offset),
                counterparty=tmpl["counterparty"],
                currency=tmpl["currency"],
                sector=tmpl["sector"],
                rating=tmpl["rating"],
            ))

    db.bulk_save_objects(records)
    db.commit()
    print(f"  {len(records)} asset records inserted.")


def seed_needs(db: Session, start: date, end: date):
    print("Seeding fct_needs...")
    bdays = business_days(start, end)
    custodians = db.query(DimCustodian).all()
    cust_ids = [c.custodian_id for c in custodians]
    cust_by_name = {c.name: c.custodian_id for c in custodians}

    # Latest asset IDs for linking
    latest_asset_date = bdays[-1]
    asset_ids = [
        r[0] for r in db.query(FctAssets.asset_id)
        .filter(FctAssets.date_id == latest_asset_date).all()
    ]

    records = []

    def add(d, need_type, amount, description, status, priority, custodian_id, linked=None):
        records.append(FctNeeds(
            date_id=d,
            need_type=need_type,
            amount=amount,
            description=description,
            status=status,
            priority=priority,
            custodian_id=custodian_id,
            linked_asset_id=linked,
        ))

    # Status: past dates are settled/failed, future/today are pending
    today = bdays[-1]

    def status_for(d):
        if d < today:
            return "settled" if random.random() < 0.92 else "failed"
        return "pending"

    # --- Trade settlements (T+2, frequent) ---
    for d in bdays:
        n_trades = random.randint(1, 5)
        for _ in range(n_trades):
            direction = random.choice([-1, 1])
            amount = direction * round(random.uniform(500_000, 8_000_000), 2)
            cust_id = cust_by_name[random.choice(["Goldman Sachs Prime", "Morgan Stanley Prime"])]
            linked = random.choice(asset_ids) if asset_ids else None
            add(d, "trade_settlement", amount,
                f"Bond trade settlement - T+2",
                status_for(d), "high", cust_id, linked)

    # --- Margin calls (cluster around vol events, ~3x/week) ---
    vol_event_months = {3, 6, 8, 10}  # simulate vol spikes
    for d in bdays:
        base_prob = 0.35
        if d.month in vol_event_months and random.random() < 0.4:
            base_prob = 0.75  # spike
        if random.random() < base_prob:
            amount = -round(random.uniform(1_000_000, 12_000_000), 2)
            cust_id = cust_by_name[random.choice(["Goldman Sachs Prime", "Morgan Stanley Prime"])]
            priority = "high" if abs(amount) > 6_000_000 else "medium"
            add(d, "margin_call", amount,
                f"Variation margin call - {random.choice(['CDX.NA.HY', 'IRS', 'Options'])}",
                status_for(d), priority, cust_id)

    # --- Redemptions (month-end, large outflows) ---
    for d in bdays:
        if d.day >= 25 and random.random() < 0.5:
            amount = -round(random.uniform(5_000_000, 25_000_000) / 1_000_000) * 1_000_000
            cust_id = cust_by_name["BNY Mellon Custody"]
            add(d, "redemption", float(amount),
                f"LP redemption - {random.choice(['Blackrock LP', 'Fidelity Fund', 'Vanguard Inst', 'CalPERS Mandate', 'Nordic Pension'])}",
                status_for(d), "high", cust_id)

    # --- Subscriptions (month-start, inflows) ---
    for d in bdays:
        if d.day <= 5 and random.random() < 0.4:
            amount = round(random.uniform(3_000_000, 15_000_000) / 1_000_000) * 1_000_000
            cust_id = cust_by_name["BNY Mellon Custody"]
            add(d, "subscription", float(amount),
                f"New LP subscription",
                status_for(d), "medium", cust_id)

    # --- Coupon payments (semi-annual, fixed dates) ---
    coupon_months = {1, 7}
    for d in bdays:
        if d.month in coupon_months and d.day in range(14, 18):
            for _ in range(random.randint(3, 8)):
                amount = round(random.uniform(200_000, 800_000), 2)
                cust_id = cust_by_name["BNY Mellon Custody"]
                linked = random.choice(asset_ids) if asset_ids else None
                add(d, "coupon_payment", amount,
                    f"Semi-annual coupon - {random.choice(FAKE_ISSUERS)}",
                    status_for(d), "low", cust_id, linked)

    db.bulk_save_objects(records)
    db.commit()
    print(f"  {len(records)} needs records inserted.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    db_path = os.getenv("DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "organ_capital.db"))
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    print(f"Database: {db_path}")
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    START = date(2024, 1, 2)
    END = date(2025, 12, 31)

    db = SessionLocal()
    try:
        seed_custodians(db)
        seed_dim_time(db, START, END)
        seed_cash(db, START, END)
        seed_assets(db, START, END)
        seed_needs(db, START, END)
        print("\nDone! organ_capital.db is ready.")
    finally:
        db.close()
