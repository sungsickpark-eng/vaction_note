from fastapi import APIRouter, Depends, Query
from typing import Optional
import httpx

from app.core.config import get_settings
from app.core.security import get_optional_user
from app.models.models import User

router = APIRouter(prefix="/api/maps", tags=["maps"])
settings = get_settings()

KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
KAKAO_COORD2ADDRESS_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"


def _kakao_headers() -> dict:
    return {"Authorization": f"KakaoAK {settings.KAKAO_REST_API_KEY}"}


@router.get("/search")
async def search_places(
    q: str = Query(..., description="장소 검색어"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not settings.KAKAO_REST_API_KEY or settings.KAKAO_REST_API_KEY == "your-kakao-rest-api-key":
        return {"results": [], "message": "카카오 REST API 키를 설정해주세요"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            KAKAO_KEYWORD_URL,
            headers=_kakao_headers(),
            params={"query": q, "size": 10},
        )
        data = resp.json()

    results = []
    for place in data.get("documents", []):
        results.append({
            "place_id": place.get("id"),
            "name": place.get("place_name"),
            "address": place.get("road_address_name") or place.get("address_name"),
            "lat": float(place.get("y", 0)),
            "lng": float(place.get("x", 0)),
        })

    return {"results": results}


@router.get("/geocode")
async def reverse_geocode(
    lat: float = Query(...),
    lng: float = Query(...),
    current_user: Optional[User] = Depends(get_optional_user),
):
    if not settings.KAKAO_REST_API_KEY or settings.KAKAO_REST_API_KEY == "your-kakao-rest-api-key":
        return {"address": f"{lat}, {lng}", "message": "카카오 REST API 키를 설정해주세요"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            KAKAO_COORD2ADDRESS_URL,
            headers=_kakao_headers(),
            params={"x": lng, "y": lat},
        )
        data = resp.json()

    documents = data.get("documents", [])
    if documents:
        doc = documents[0]
        road = doc.get("road_address")
        addr = doc.get("address")
        address = (road.get("address_name") if road else None) or (addr.get("address_name") if addr else f"{lat}, {lng}")
    else:
        address = f"{lat}, {lng}"

    return {"address": address}
