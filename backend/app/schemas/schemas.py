from __future__ import annotations
from datetime import datetime, date, time
from typing import Optional, List
from pydantic import BaseModel, EmailStr, ConfigDict


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    name: str
    nickname: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime


# ─── Trip ────────────────────────────────────────────────────────────────────

class TripCreate(BaseModel):
    title: str
    description: Optional[str] = None
    region: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    visibility: str = "private"


class TripUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    region: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    visibility: Optional[str] = None
    cover_photo: Optional[str] = None


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    description: Optional[str] = None
    cover_photo: Optional[str] = None
    region: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    visibility: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class TripDetail(TripResponse):
    days: List[TripDayResponse] = []


# ─── TripDay ─────────────────────────────────────────────────────────────────

class TripDayCreate(BaseModel):
    date: date
    title: Optional[str] = None


class TripDayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trip_id: str
    date: date
    title: Optional[str] = None
    waypoints: List[WaypointResponse] = []


# ─── Waypoint ────────────────────────────────────────────────────────────────

class WaypointCreate(BaseModel):
    place_name: str
    address: Optional[str] = None
    kakao_place_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    visit_date: Optional[date] = None
    arrival_time: Optional[time] = None
    end_time: Optional[time] = None
    transport_mode: Optional[str] = "car"
    note: Optional[str] = None
    order: int = 0


class WaypointUpdate(BaseModel):
    place_name: Optional[str] = None
    address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    arrival_time: Optional[time] = None
    end_time: Optional[time] = None
    transport_mode: Optional[str] = None
    note: Optional[str] = None
    order: Optional[int] = None


class WaypointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trip_day_id: str
    order: int
    place_name: str
    address: Optional[str] = None
    kakao_place_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    visit_date: Optional[date] = None
    arrival_time: Optional[time] = None
    end_time: Optional[time] = None
    transport_mode: Optional[str] = None
    note: Optional[str] = None


# ─── Memo ────────────────────────────────────────────────────────────────────

class MemoCreate(BaseModel):
    content: str
    trip_day_id: Optional[str] = None
    waypoint_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    tags: Optional[List[str]] = None


class MemoUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class MemoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trip_id: str
    trip_day_id: Optional[str] = None
    waypoint_id: Optional[str] = None
    content: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# ─── Photo ───────────────────────────────────────────────────────────────────

class PhotoCreate(BaseModel):
    image_url: str
    s3_key: Optional[str] = None
    thumb_key: Optional[str] = None
    waypoint_id: Optional[str] = None
    memo_id: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    taken_at: Optional[datetime] = None
    caption: Optional[str] = None


class PhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    trip_id: str
    waypoint_id: Optional[str] = None
    memo_id: Optional[str] = None
    image_url: str
    s3_key: Optional[str] = None
    thumb_key: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    taken_at: Optional[datetime] = None
    caption: Optional[str] = None
    created_at: datetime


# ─── Maps ────────────────────────────────────────────────────────────────────

class PlaceSearchResult(BaseModel):
    place_id: str
    name: str
    address: str
    lat: float
    lng: float


class DirectionsRequest(BaseModel):
    origin: str
    destination: str
    mode: str = "driving"
    waypoints: Optional[List[str]] = None


# ─── Forward refs ─────────────────────────────────────────────────────────────

TripDetail.model_rebuild()
TripDayResponse.model_rebuild()
