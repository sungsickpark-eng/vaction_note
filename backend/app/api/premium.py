"""
여행 프리미엄 기능 API (메모·사진 유료 활성화)
- GET  /api/trips/{trip_id}/premium  → 프리미엄 상태 확인
- POST /api/trips/{trip_id}/premium  → 프리미엄 활성화 (결제 완료 후 호출)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Trip, TripPremium

router = APIRouter(tags=["premium"])

PREMIUM_PRICE = 1000  # 원


@router.get("/api/trips/{trip_id}/premium")
async def get_premium_status(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """여행의 프리미엄 활성화 여부 반환."""
    result = await db.execute(
        select(TripPremium).where(TripPremium.trip_id == trip_id)
    )
    premium = result.scalar_one_or_none()
    return {
        "trip_id": trip_id,
        "is_premium": premium is not None,
        "paid_at": premium.paid_at.isoformat() if premium else None,
        "amount": premium.amount if premium else PREMIUM_PRICE,
        "price": PREMIUM_PRICE,
    }


@router.post("/api/trips/{trip_id}/premium")
async def activate_premium(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    프리미엄 활성화.
    실제 서비스에서는 PG(토스페이먼츠 등) 결제 검증 후 호출.
    현재는 데모 모드: 즉시 활성화.
    """
    # 여행 소유권 확인
    trip_res = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id)
    )
    trip = trip_res.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    # 이미 활성화됐는지 확인
    existing = await db.execute(
        select(TripPremium).where(TripPremium.trip_id == trip_id)
    )
    if existing.scalar_one_or_none():
        return {"message": "이미 프리미엄이 활성화된 여행입니다", "is_premium": True}

    # 프리미엄 레코드 생성 (데모: 바로 저장)
    premium = TripPremium(
        trip_id=trip_id,
        user_id=current_user.id,
        amount=PREMIUM_PRICE,
        paid_at=datetime.utcnow(),
    )
    db.add(premium)
    await db.commit()

    return {
        "message": f"프리미엄 활성화 완료 ({PREMIUM_PRICE:,}원)",
        "is_premium": True,
        "paid_at": premium.paid_at.isoformat(),
    }
