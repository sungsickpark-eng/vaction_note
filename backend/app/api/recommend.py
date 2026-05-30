from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import random

from app.core.security import get_current_user
from app.models.models import User

router = APIRouter(prefix="/api/recommend", tags=["recommend"])

# ─── 여행지 데이터 ────────────────────────────────────────────────────────────

DESTINATIONS = {
    "I": [  # 조용한·내향적 여행지
        {
            "id": "namhae",
            "name": "남해",
            "region": "경남",
            "emoji": "🏝️",
            "tagline": "섬 속의 고요한 쉼표",
            "description": "바다와 산이 만나는 조용한 섬. 혼자만의 시간이 필요할 때 최적입니다.",
            "highlights": ["독일마을 산책", "다랭이마을 일몰", "앵강만 카약"],
            "vibe_tags": ["혼자 여행", "감성", "자연"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "도착 & 다랭이마을", "activities": ["다랭이마을 棚田 산책", "노을 감상", "해산물 저녁식사", "숙소 체크인"]},
                    {"day": 2, "title": "독일마을 & 귀가", "activities": ["독일마을 카페 브런치", "보물섬 전망대", "바래길 트레킹", "귀가"]},
                ],
                "couple_2n3d": [
                    {"day": 1, "title": "도착 & 앵강만", "activities": ["앵강만 카약 체험", "해산물 저녁", "펜션 체크인"]},
                    {"day": 2, "title": "다랭이마을 & 독일마을", "activities": ["다랭이마을 일출", "독일마을 산책 & 카페", "물레방아 펜션 쉬기"]},
                    {"day": 3, "title": "보물섬 탐방 & 귀가", "activities": ["보물섬 전망대", "금산 보리암", "특산물 쇼핑 후 귀가"]},
                ],
            },
        },
        {
            "id": "yeongwol",
            "name": "영월",
            "region": "강원",
            "emoji": "⭐",
            "tagline": "별이 가장 잘 보이는 곳",
            "description": "빛 공해 없는 하늘, 청정 자연 속 나만의 감성 여행.",
            "highlights": ["별마로 천문대 별 관측", "동강 래프팅", "고씨동굴 탐험"],
            "vibe_tags": ["별 관측", "캠핑", "자연"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "도착 & 별 관측", "activities": ["단종 역사 박물관", "저녁식사 (한우)", "별마로 천문대 별 보기"]},
                    {"day": 2, "title": "동강 & 귀가", "activities": ["동강 래프팅", "선돌 전망대", "고씨동굴 탐험 후 귀가"]},
                ],
                "family_2n3d": [
                    {"day": 1, "title": "도착 & 역사 탐방", "activities": ["청령포 단종 유배지", "장릉 문화재 탐방", "한우 저녁"]},
                    {"day": 2, "title": "자연 체험", "activities": ["고씨동굴", "동강 래프팅", "별마로 천문대"]},
                    {"day": 3, "title": "힐링 & 귀가", "activities": ["김삿갓 계곡 산책", "메밀꽃밭 (시즌)", "귀가"]},
                ],
            },
        },
        {
            "id": "damyang",
            "name": "담양",
            "region": "전남",
            "emoji": "🎋",
            "tagline": "대나무 숲 사이 바람 소리",
            "description": "죽녹원의 푸른 대나무 숲, 메타세쿼이아 길의 감성이 가득한 힐링 여행.",
            "highlights": ["죽녹원 새벽 산책", "메타세쿼이아 가로수길", "관방제림 카페 거리"],
            "vibe_tags": ["감성 사진", "힐링", "카페"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "도착 & 죽녹원", "activities": ["죽녹원 산책", "떡갈비 점심", "관방제림 카페 거리 탐방", "메타세쿼이아 길 석양"]},
                    {"day": 2, "title": "소쇄원 & 귀가", "activities": ["소쇄원 조선시대 정원", "창평 슬로시티 산책", "죽순 요리 점심 후 귀가"]},
                ],
                "couple_1n2d": [
                    {"day": 1, "title": "감성 담양", "activities": ["메타세쿼이아 길 사진", "죽녹원 커플 산책", "담양 막걸리 저녁"]},
                    {"day": 2, "title": "소쇄원 & 귀가", "activities": ["소쇄원 고즈넉한 산책", "카페 호수 브런치", "귀가"]},
                ],
            },
        },
        {
            "id": "suncheon",
            "name": "순천",
            "region": "전남",
            "emoji": "🌾",
            "tagline": "갈대와 생태계의 보고",
            "description": "순천만 갈대밭, 드라마 세트장… 시간이 천천히 흐르는 도시.",
            "highlights": ["순천만 갈대밭 일몰", "낙안읍성 민속마을", "정원박람회장"],
            "vibe_tags": ["자연", "사진", "힐링"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "갈대밭 & 낙안읍성", "activities": ["순천만 습지 탐방", "갈대밭 일몰 감상", "낙안읍성 저녁"]},
                    {"day": 2, "title": "정원 & 귀가", "activities": ["국가정원 산책", "드라마 세트장", "꼬막 비빔밥 점심 후 귀가"]},
                ],
            },
        },
        {
            "id": "tongyeong",
            "name": "통영",
            "region": "경남",
            "emoji": "⛵",
            "tagline": "한국의 나폴리",
            "description": "푸른 바다, 케이블카, 신선한 해산물. 조용히 바다를 바라보기 최적.",
            "highlights": ["한려수도 조망 케이블카", "동피랑 벽화마을", "미륵도 달아공원 일몰"],
            "vibe_tags": ["바다", "힐링", "미식"],
            "itinerary": {
                "couple_2n3d": [
                    {"day": 1, "title": "도착 & 동피랑", "activities": ["동피랑 벽화마을", "서호시장 해산물", "강구항 야경"]},
                    {"day": 2, "title": "케이블카 & 미륵도", "activities": ["한려수도 케이블카", "달아공원 일몰", "통영 굴 요리 저녁"]},
                    {"day": 3, "title": "섬 투어 & 귀가", "activities": ["소매물도 당일 배", "등대섬 트레킹", "귀가"]},
                ],
            },
        },
    ],
    "E": [  # 활동적·외향적 여행지
        {
            "id": "busan",
            "name": "부산",
            "region": "부산",
            "emoji": "🌊",
            "tagline": "에너지 넘치는 해변 도시",
            "description": "서핑, 야시장, 나이트라이프… 매 순간이 액티비티.",
            "highlights": ["해운대 서핑 체험", "광안대교 야경", "서면 야시장 투어"],
            "vibe_tags": ["서핑", "나이트라이프", "맛집"],
            "itinerary": {
                "friends_2n3d": [
                    {"day": 1, "title": "도착 & 해운대", "activities": ["해운대 서핑 레슨", "마린시티 야경", "서면 술집 투어"]},
                    {"day": 2, "title": "감천 & 광안리", "activities": ["감천문화마을", "광안리 해수욕", "광안대교 야경 카페"]},
                    {"day": 3, "title": "국제시장 & 귀가", "activities": ["국제시장 먹거리", "깡통시장", "씨앗호떡 후 귀가"]},
                ],
                "couple_1n2d": [
                    {"day": 1, "title": "해운대 & 야경", "activities": ["해운대 비치 산책", "동백섬 누리마루", "광안대교 야경 디너"]},
                    {"day": 2, "title": "감천 & 귀가", "activities": ["감천문화마을", "자갈치시장 회 점심", "귀가"]},
                ],
            },
        },
        {
            "id": "jeju",
            "name": "제주도",
            "region": "제주",
            "emoji": "🌋",
            "tagline": "무한한 액티비티의 섬",
            "description": "한라산 트레킹, 스쿠버다이빙, ATV… 에너지를 다 쓰고 오세요.",
            "highlights": ["한라산 백록담 등반", "우도 자전거 일주", "협재 스노클링"],
            "vibe_tags": ["트레킹", "스노클링", "ATV"],
            "itinerary": {
                "friends_3n4d": [
                    {"day": 1, "title": "도착 & 동쪽", "activities": ["성산일출봉 트레킹", "우도 자전거 일주", "흑돼지 저녁"]},
                    {"day": 2, "title": "한라산", "activities": ["한라산 어리목 코스", "1100고지 습지", "제주 시내 맛집"]},
                    {"day": 3, "title": "서쪽 액티비티", "activities": ["협재해수욕장 스노클링", "ATV 체험", "해산물 저녁"]},
                    {"day": 4, "title": "올레길 & 귀가", "activities": ["올레 7코스 일부", "카페 투어", "귀가"]},
                ],
            },
        },
        {
            "id": "gangneung",
            "name": "강릉",
            "region": "강원",
            "emoji": "🏄",
            "tagline": "서핑 & 커피의 도시",
            "description": "경포 서핑, 안목 카페거리, 밤새 이어지는 축제 분위기.",
            "highlights": ["경포해변 서핑 레슨", "안목 커피거리 카페 투어", "주문진 수산시장"],
            "vibe_tags": ["서핑", "카페", "음식"],
            "itinerary": {
                "friends_1n2d": [
                    {"day": 1, "title": "서핑 & 카페", "activities": ["경포 서핑 레슨", "안목 카페거리 3곳 투어", "강릉 중앙시장 먹거리"]},
                    {"day": 2, "title": "주문진 & 귀가", "activities": ["주문진 수산시장", "정동진 일출 (선택)", "귀가"]},
                ],
            },
        },
        {
            "id": "jeonju",
            "name": "전주",
            "region": "전북",
            "emoji": "🏯",
            "tagline": "맛의 도시, 한옥마을 탐험",
            "description": "비빔밥, 막걸리, 한옥 카페… 먹고 즐기는 에너지 충전 여행.",
            "highlights": ["한옥마을 야간 투어", "남부시장 야시장", "막걸리 골목 투어"],
            "vibe_tags": ["맛집", "야시장", "문화"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "한옥마을 & 야시장", "activities": ["전주 한옥마을 산책", "남부시장 야시장", "막걸리 골목 투어"]},
                    {"day": 2, "title": "비빔밥 & 귀가", "activities": ["전주 전통 비빔밥 아침", "경기전 방문", "초코파이 쇼핑 후 귀가"]},
                ],
            },
        },
        {
            "id": "sokcho",
            "name": "속초",
            "region": "강원",
            "emoji": "🏔️",
            "tagline": "산과 바다 동시에",
            "description": "설악산 케이블카, 속초 해수욕장, 아바이마을… 하루가 48시간이었으면.",
            "highlights": ["설악산 케이블카 권금성", "속초 해수욕장 서핑", "아바이마을 먹거리"],
            "vibe_tags": ["트레킹", "해수욕", "맛집"],
            "itinerary": {
                "friends_2n3d": [
                    {"day": 1, "title": "도착 & 설악산", "activities": ["설악산 케이블카", "울산바위 트레킹", "아바이마을 저녁"]},
                    {"day": 2, "title": "해변 & 액티비티", "activities": ["속초해수욕장 서핑", "청초호 카약", "속초 시장 먹거리"]},
                    {"day": 3, "title": "낙산사 & 귀가", "activities": ["낙산사 의상대 일출", "양양 서핑 레슨", "귀가"]},
                ],
            },
        },
    ],
}

# P형 즉흥 추천용 멘트
P_INTROS = {
    "I": [
        "짐 싸지 말고 그냥 떠나세요. 그게 진짜 힐링이에요. 📦",
        "아무 계획 없이 창문 밖을 봐요. 그 방향으로 가면 돼요. 🪟",
        "오늘 저녁, 조용한 어딘가에 있을 수 있어요. 지금 바로요. ✨",
    ],
    "E": [
        "예약? 그냥 가면 돼요. 어디서든 친구 사귀면 되잖아요! 🎉",
        "지금 이 순간, 어딘가에서 파티가 열리고 있어요. 당신만 없는 거예요. 🎊",
        "짐은 가방 하나면 충분해요. 에너지는 현지에서 충전하세요! ⚡",
    ],
}


# ─── 스키마 ───────────────────────────────────────────────────────────────────

class SpontaneousRequest(BaseModel):
    mbti: str  # e.g. "ENFP"
    exclude_ids: List[str] = []  # 이미 본 여행지 제외


class PlanRequest(BaseModel):
    mbti: str
    duration: str   # "당일" | "1박2일" | "2박3일" | "4일이상"
    companion: str  # "혼자" | "커플" | "친구들" | "가족"
    theme: str      # "자연" | "문화역사" | "맛집" | "액티비티"


def _get_pool(mbti: str) -> list:
    return DESTINATIONS["I"] if "I" in mbti.upper() else DESTINATIONS["E"]


def _pick_itinerary(dest: dict, companion: str, duration: str) -> list:
    """동행자·기간에 맞는 일정 선택."""
    it = dest.get("itinerary", {})
    if not it:
        return []

    # 키 매핑
    comp_map = {"혼자": "solo", "커플": "couple", "친구들": "friends", "가족": "family"}
    dur_map = {"당일": "1n2d", "1박2일": "1n2d", "2박3일": "2n3d", "4일이상": "3n4d"}

    comp_key = comp_map.get(companion, "couple")
    dur_key = dur_map.get(duration, "2n3d")

    # 가장 가까운 키 찾기
    for ck in [comp_key, "couple", "solo", "friends", "family"]:
        for dk in [dur_key, "2n3d", "1n2d", "3n4d"]:
            key = f"{ck}_{dk}"
            if key in it:
                return it[key]

    # fallback: 첫 번째 일정
    return list(it.values())[0] if it else []


# ─── 엔드포인트 ───────────────────────────────────────────────────────────────

@router.post("/spontaneous")
async def spontaneous(
    body: SpontaneousRequest,
    current_user: User = Depends(get_current_user),
):
    """P형: 즉흥 여행지 추천."""
    pool = _get_pool(body.mbti)
    available = [d for d in pool if d["id"] not in body.exclude_ids]
    if not available:
        available = pool  # 전부 봤으면 리셋

    dest = random.choice(available)
    ie = "I" if "I" in body.mbti.upper() else "E"
    intro = random.choice(P_INTROS[ie])

    return {
        "intro": intro,
        "destination": {
            "id": dest["id"],
            "name": dest["name"],
            "region": dest["region"],
            "emoji": dest["emoji"],
            "tagline": dest["tagline"],
            "description": dest["description"],
            "highlights": dest["highlights"],
            "vibe_tags": dest["vibe_tags"],
        },
    }


@router.post("/plan")
async def plan(
    body: PlanRequest,
    current_user: User = Depends(get_current_user),
):
    """J형: 조건 기반 맞춤 일정 추천."""
    pool = _get_pool(body.mbti)

    # 테마 필터링 (간단한 태그 매칭)
    theme_map = {
        "자연": ["자연", "트레킹", "힐링", "바다", "캠핑"],
        "문화역사": ["문화", "역사", "사진", "감성"],
        "맛집": ["맛집", "미식", "음식", "야시장"],
        "액티비티": ["서핑", "ATV", "스노클링", "나이트라이프", "트레킹"],
    }
    preferred_tags = theme_map.get(body.theme, [])

    def score(d: dict) -> int:
        return sum(1 for tag in d.get("vibe_tags", []) if tag in preferred_tags)

    sorted_pool = sorted(pool, key=score, reverse=True)
    dest = sorted_pool[0] if sorted_pool else random.choice(pool)

    itinerary = _pick_itinerary(dest, body.companion, body.duration)

    return {
        "destination": {
            "id": dest["id"],
            "name": dest["name"],
            "region": dest["region"],
            "emoji": dest["emoji"],
            "tagline": dest["tagline"],
            "description": dest["description"],
            "highlights": dest["highlights"],
            "vibe_tags": dest["vibe_tags"],
        },
        "itinerary": itinerary,
        "meta": {
            "duration": body.duration,
            "companion": body.companion,
            "theme": body.theme,
        },
    }
