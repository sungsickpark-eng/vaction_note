import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import get_settings
from app.models.models import User, Trip, Photo
from app.schemas.schemas import PhotoCreate, PhotoResponse

router = APIRouter(tags=["photos"])
settings = get_settings()


@router.get("/api/trips/{trip_id}/photos", response_model=List[PhotoResponse])
async def list_photos(
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
        select(Photo).where(Photo.trip_id == trip_id).order_by(Photo.taken_at.desc(), Photo.created_at.desc())
    )
    return result2.scalars().all()


@router.post("/api/trips/{trip_id}/photos", response_model=PhotoResponse, status_code=201)
async def register_photo(
    trip_id: str,
    body: PhotoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Trip).where(Trip.id == trip_id, Trip.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="여행을 찾을 수 없습니다")

    photo = Photo(trip_id=trip_id, **body.model_dump())
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    return photo


@router.post("/api/photos/presign")
async def presign_upload(
    trip_id: str,
    filename: str,
    content_type: str = "image/jpeg",
    current_user: User = Depends(get_current_user),
):
    """S3 presigned URL 발급 (로컬 개발에서는 더미 응답)"""
    if not settings.AWS_ACCESS_KEY_ID or settings.AWS_ACCESS_KEY_ID == "your-aws-key":
        # 로컬 개발: 더미 응답
        file_id = str(uuid.uuid4())
        return {
            "upload_url": f"http://localhost:8000/api/photos/local-upload/{file_id}",
            "image_url": f"http://localhost:8000/static/photos/{file_id}",
            "s3_key": f"photos/{trip_id}/{file_id}",
        }

    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_S3_REGION,
    )
    file_id = str(uuid.uuid4())
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "jpg"
    key = f"photos/{trip_id}/{file_id}.{ext}"

    presigned = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": settings.AWS_S3_BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=300,
    )
    return {
        "upload_url": presigned,
        "image_url": f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_S3_REGION}.amazonaws.com/{key}",
        "s3_key": key,
    }


@router.delete("/api/photos/{photo_id}", status_code=204)
async def delete_photo(
    photo_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Photo)
        .join(Trip, Photo.trip_id == Trip.id)
        .where(Photo.id == photo_id, Trip.user_id == current_user.id)
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없습니다")
    await db.delete(photo)
    await db.commit()
