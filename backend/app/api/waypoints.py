from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Trip, TripDay, Waypoint
from app.schemas.schemas import WaypointCreate, WaypointUpdate, WaypointResponse

router = APIRouter(tags=["waypoints"])


@router.post("/api/trips/{trip_id}/days/{day_id}/waypoints", response_model=WaypointResponse, status_code=201)
async def add_waypoint(
    trip_id: str,
    day_id: str,
    body: WaypointCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    result2 = await db.execute(
        select(TripDay).where(TripDay.id == day_id, TripDay.trip_id == trip_id)
    )
    if not result2.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="일정을 찾을 수 없습니다")

    wp = Waypoint(trip_day_id=day_id, **body.model_dump())
    db.add(wp)
    await db.commit()
    await db.refresh(wp)
    return wp


@router.put("/api/waypoints/{waypoint_id}", response_model=WaypointResponse)
async def update_waypoint(
    waypoint_id: str,
    body: WaypointUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Waypoint)
        .join(TripDay, Waypoint.trip_day_id == TripDay.id)
        .join(Trip, TripDay.trip_id == Trip.id)
        .where(Waypoint.id == waypoint_id, Trip.user_id == current_user.id)
    )
    wp = result.scalar_one_or_none()
    if not wp:
        raise HTTPException(status_code=404, detail="경유지를 찾을 수 없습니다")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(wp, k, v)
    await db.commit()
    await db.refresh(wp)
    return wp


@router.delete("/api/waypoints/{waypoint_id}", status_code=204)
async def delete_waypoint(
    waypoint_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Waypoint)
        .join(TripDay, Waypoint.trip_day_id == TripDay.id)
        .join(Trip, TripDay.trip_id == Trip.id)
        .where(Waypoint.id == waypoint_id, Trip.user_id == current_user.id)
    )
    wp = result.scalar_one_or_none()
    if not wp:
        raise HTTPException(status_code=404, detail="경유지를 찾을 수 없습니다")
    await db.delete(wp)
    await db.commit()


@router.put("/api/trips/{trip_id}/days/{day_id}/waypoints/reorder", response_model=List[WaypointResponse])
async def reorder_waypoints(
    trip_id: str,
    day_id: str,
    ordered_ids: List[str],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    for idx, wp_id in enumerate(ordered_ids):
        res = await db.execute(select(Waypoint).where(Waypoint.id == wp_id, Waypoint.trip_day_id == day_id))
        wp = res.scalar_one_or_none()
        if wp:
            wp.order = idx
    await db.commit()

    result2 = await db.execute(
        select(Waypoint).where(Waypoint.trip_day_id == day_id).order_by(Waypoint.order)
    )
    return result2.scalars().all()
