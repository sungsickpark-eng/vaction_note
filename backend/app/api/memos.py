from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import User, Trip, Memo
from app.schemas.schemas import MemoCreate, MemoUpdate, MemoResponse

router = APIRouter(tags=["memos"])


@router.get("/api/trips/{trip_id}/memos", response_model=List[MemoResponse])
async def list_memos(
    trip_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")
    if trip.user_id != current_user.id and trip.visibility == "private":
        raise HTTPException(status_code=403, detail="접근 권한이 없습니다")

    result2 = await db.execute(
        select(Memo).where(Memo.trip_id == trip_id).order_by(Memo.created_at.desc())
    )
    return result2.scalars().all()


@router.post("/api/trips/{trip_id}/memos", response_model=MemoResponse, status_code=201)
async def create_memo(
    trip_id: str,
    body: MemoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    memo = Memo(trip_id=trip_id, **body.model_dump())
    db.add(memo)
    await db.commit()
    await db.refresh(memo)
    return memo


@router.put("/api/memos/{memo_id}", response_model=MemoResponse)
async def update_memo(
    memo_id: str,
    body: MemoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Memo)
        .join(Trip, Memo.trip_id == Trip.id)
        .where(Memo.id == memo_id, Trip.user_id == current_user.id)
    )
    memo = result.scalar_one_or_none()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없습니다")

    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(memo, k, v)
    await db.commit()
    await db.refresh(memo)
    return memo


@router.delete("/api/memos/{memo_id}", status_code=204)
async def delete_memo(
    memo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Memo)
        .join(Trip, Memo.trip_id == Trip.id)
        .where(Memo.id == memo_id, Trip.user_id == current_user.id)
    )
    memo = result.scalar_one_or_none()
    if not memo:
        raise HTTPException(status_code=404, detail="메모를 찾을 수 없습니다")
    await db.delete(memo)
    await db.commit()
