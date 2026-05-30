from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Trip, TripDay
from app.schemas.schemas import (
    TripCreate, TripUpdate, TripResponse, TripDetail,
    TripDayCreate, TripDayResponse,
)

router = APIRouter(prefix="/api/trips", tags=["trips"])


@router.get("", response_model=List[TripResponse])
async def list_trips(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip).where(Trip.user_id == current_user.id).order_by(Trip.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=TripResponse, status_code=201)
async def create_trip(
    body: TripCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trip = Trip(**body.model_dump(), user_id=current_user.id)
    db.add(trip)
    await db.commit()
    await db.refresh(trip)

    # 날짜 범위가 있으면 TripDay 자동 생성
    if trip.start_date and trip.end_date:
        from datetime import timedelta
        current = trip.start_date
        while current <= trip.end_date:
            day = TripDay(trip_id=trip.id, date=current)
            db.add(day)
            current += timedelta(days=1)
        await db.commit()

    return trip


@router.get("/public", response_model=List[TripResponse])
async def list_public_trips(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Trip).where(Trip.visibility == "public").order_by(Trip.created_at.desc()).limit(50)
    )
    return result.scalars().all()


@router.get("/{trip_id}", response_model=TripDetail)
async def get_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip)
        .options(
            selectinload(Trip.days).selectinload(TripDay.waypoints)
        )
        .where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")
    if trip.user_id != current_user.id and trip.visibility == "private":
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")
    return trip


@router.put("/{trip_id}", response_model=TripResponse)
async def update_trip(
    trip_id: str,
    body: TripUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(trip, k, v)
    await db.commit()
    await db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")
    await db.delete(trip)
    await db.commit()


@router.get("/{trip_id}/days", response_model=List[TripDayResponse])
async def list_days(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TripDay)
        .options(selectinload(TripDay.waypoints))
        .where(TripDay.trip_id == trip_id)
        .order_by(TripDay.date)
    )
    return result.scalars().all()


@router.post("/{trip_id}/days", response_model=TripDayResponse, status_code=201)
async def add_day(
    trip_id: str,
    body: TripDayCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    day = TripDay(trip_id=trip_id, **body.model_dump())
    db.add(day)
    await db.commit()
    await db.refresh(day)
    return day


@router.get("/{trip_id}/share")
async def get_share_link(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip or trip.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    if trip.visibility == "private":
        trip.visibility = "link"
        await db.commit()

    return {"share_url": f"/trips/{trip_id}", "visibility": trip.visibility}
