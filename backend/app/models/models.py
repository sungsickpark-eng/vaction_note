import uuid
from datetime import datetime, date, time
from sqlalchemy import (
    Column, String, Text, Boolean, Float, Integer,
    DateTime, Date, Time, ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    name = Column(String(100), nullable=False)
    nickname = Column(String(50), nullable=True)
    avatar_url = Column(String(512), nullable=True)
    hashed_password = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trips = relationship("Trip", back_populates="user", cascade="all, delete-orphan")
    premiums = relationship("TripPremium", back_populates="user", cascade="all, delete-orphan")


class Trip(Base):
    __tablename__ = "trips"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    cover_photo = Column(String(512), nullable=True)
    region = Column(String(100), nullable=True)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    visibility = Column(
        SAEnum("private", "link", "public", name="visibility_enum", native_enum=False),
        default="private",
        nullable=False,
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="trips")
    days = relationship("TripDay", back_populates="trip", cascade="all, delete-orphan", order_by="TripDay.date")
    memos = relationship("Memo", back_populates="trip", cascade="all, delete-orphan")
    photos = relationship("Photo", back_populates="trip", cascade="all, delete-orphan")
    premium = relationship("TripPremium", back_populates="trip", uselist=False, cascade="all, delete-orphan")


class TripDay(Base):
    __tablename__ = "trip_days"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    title = Column(String(200), nullable=True)

    trip = relationship("Trip", back_populates="days")
    waypoints = relationship("Waypoint", back_populates="trip_day", cascade="all, delete-orphan", order_by="Waypoint.order")
    memos = relationship("Memo", back_populates="trip_day")


class Waypoint(Base):
    __tablename__ = "waypoints"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    trip_day_id = Column(String(36), ForeignKey("trip_days.id", ondelete="CASCADE"), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    place_name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=True)
    kakao_place_id = Column(String(255), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    visit_date = Column(Date, nullable=True)
    arrival_time = Column(Time, nullable=True)
    transport_mode = Column(
        SAEnum("walk", "car", "transit", name="transport_enum", native_enum=False),
        default="car",
        nullable=True,
    )
    note = Column(Text, nullable=True)

    trip_day = relationship("TripDay", back_populates="waypoints")
    photos = relationship("Photo", back_populates="waypoint")


class Memo(Base):
    __tablename__ = "memos"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    trip_day_id = Column(String(36), ForeignKey("trip_days.id", ondelete="SET NULL"), nullable=True)
    waypoint_id = Column(String(36), ForeignKey("waypoints.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    trip = relationship("Trip", back_populates="memos")
    trip_day = relationship("TripDay", back_populates="memos")
    photos = relationship("Photo", back_populates="memo")


class Photo(Base):
    __tablename__ = "photos"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    waypoint_id = Column(String(36), ForeignKey("waypoints.id", ondelete="SET NULL"), nullable=True)
    memo_id = Column(String(36), ForeignKey("memos.id", ondelete="SET NULL"), nullable=True)
    s3_key = Column(String(512), nullable=True)
    thumb_key = Column(String(512), nullable=True)
    image_url = Column(String(512), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    taken_at = Column(DateTime, nullable=True)
    caption = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trip = relationship("Trip", back_populates="photos")
    waypoint = relationship("Waypoint", back_populates="photos")
    memo = relationship("Memo", back_populates="photos")


class TripPremium(Base):
    """여행당 유료 기능 활성화 (메모·사진)"""
    __tablename__ = "trip_premiums"

    id = Column(String(36), primary_key=True, default=gen_uuid)
    trip_id = Column(String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, unique=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Integer, nullable=False, default=1000)
    payment_key = Column(String(200), nullable=True)   # 실제 결제 키 (PG 연동 시)
    paid_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    trip = relationship("Trip", back_populates="premium")
    user = relationship("User", back_populates="premiums")
