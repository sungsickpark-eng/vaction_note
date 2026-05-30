from fastapi import APIRouter, Depends
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
            "id": "namhae", "name": "남해", "region": "경남", "emoji": "🏝️",
            "tagline": "섬 속의 고요한 쉼표",
            "description": "바다와 산이 만나는 조용한 섬. 혼자만의 시간이 필요할 때 최적입니다.",
            "highlights": ["독일마을 산책", "다랭이마을 일몰", "앵강만 카약"],
            "vibe_tags": ["혼자 여행", "감성", "자연", "힐링", "바다"],
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
            "id": "yeongwol", "name": "영월", "region": "강원", "emoji": "⭐",
            "tagline": "별이 가장 잘 보이는 곳",
            "description": "빛 공해 없는 청정 하늘 아래 별 관측과 동강 래프팅이 공존하는 힐링 여행지.",
            "highlights": ["별마로 천문대 별 관측", "동강 래프팅", "고씨동굴 탐험"],
            "vibe_tags": ["별 관측", "캠핑", "자연", "힐링", "액티비티"],
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
            "id": "damyang", "name": "담양", "region": "전남", "emoji": "🎋",
            "tagline": "대나무 숲 사이 바람 소리",
            "description": "죽녹원의 푸른 대나무 숲, 메타세쿼이아 길의 감성이 가득한 힐링 여행.",
            "highlights": ["죽녹원 새벽 산책", "메타세쿼이아 가로수길", "관방제림 카페 거리"],
            "vibe_tags": ["감성 사진", "힐링", "카페", "자연", "드라이브"],
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
            "id": "suncheon", "name": "순천", "region": "전남", "emoji": "🌾",
            "tagline": "갈대와 생태계의 보고",
            "description": "순천만 갈대밭, 드라마 세트장… 시간이 천천히 흐르는 국제 정원 도시.",
            "highlights": ["순천만 습지 갈대밭 일몰", "낙안읍성 민속마을", "국가정원 산책"],
            "vibe_tags": ["자연", "사진", "힐링", "문화역사", "감성"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "갈대밭 & 낙안읍성", "activities": ["순천만 습지 탐방", "갈대밭 일몰 감상", "낙안읍성 저녁"]},
                    {"day": 2, "title": "정원 & 귀가", "activities": ["국가정원 산책", "드라마 세트장", "꼬막 비빔밥 점심 후 귀가"]},
                ],
                "couple_2n3d": [
                    {"day": 1, "title": "도착 & 갈대밭", "activities": ["순천만 습지 탐방", "갈대밭 일몰", "여수행 저녁"]},
                    {"day": 2, "title": "정원 & 낙안읍성", "activities": ["국가정원", "낙안읍성", "벌교 꼬막 맛집"]},
                    {"day": 3, "title": "선암사 & 귀가", "activities": ["선암사 등산", "조계산 단풍 (시즌)", "귀가"]},
                ],
            },
        },
        {
            "id": "tongyeong", "name": "통영", "region": "경남", "emoji": "⛵",
            "tagline": "한국의 나폴리",
            "description": "푸른 바다, 케이블카, 신선한 해산물. 조용히 바다를 바라보기 최적.",
            "highlights": ["한려수도 조망 케이블카", "동피랑 벽화마을", "미륵도 달아공원 일몰"],
            "vibe_tags": ["바다", "힐링", "맛집", "야경", "감성"],
            "itinerary": {
                "couple_2n3d": [
                    {"day": 1, "title": "도착 & 동피랑", "activities": ["동피랑 벽화마을", "서호시장 해산물", "강구항 야경"]},
                    {"day": 2, "title": "케이블카 & 미륵도", "activities": ["한려수도 케이블카", "달아공원 일몰", "통영 굴 요리 저녁"]},
                    {"day": 3, "title": "섬 투어 & 귀가", "activities": ["소매물도 당일 배", "등대섬 트레킹", "귀가"]},
                ],
            },
        },
        {
            "id": "haenam", "name": "해남", "region": "전남", "emoji": "🌅",
            "tagline": "땅끝마을에서 새로운 시작",
            "description": "대한민국 최남단 땅끝마을. 두륜산과 대흥사의 고즈넉한 절 분위기가 마음을 비워줍니다.",
            "highlights": ["땅끝 전망대", "대흥사 새벽 예불", "두륜산 케이블카"],
            "vibe_tags": ["자연", "힐링", "문화역사", "사색", "드라이브"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "땅끝 & 대흥사", "activities": ["땅끝탑 도착", "대흥사 저녁 예불 참관", "템플스테이"]},
                    {"day": 2, "title": "두륜산 & 귀가", "activities": ["두륜산 케이블카", "고산 윤선도 유적지", "귀가"]},
                ],
            },
        },
        {
            "id": "pyeongchang", "name": "평창", "region": "강원", "emoji": "🐑",
            "tagline": "고원의 맑은 공기, 목장 힐링",
            "description": "해발 800m의 고원 도시. 대관령 양떼목장, 삼양목장에서 힐링을 느껴보세요.",
            "highlights": ["대관령 양떼목장 산책", "삼양목장 하늘목장", "오대산 월정사"],
            "vibe_tags": ["자연", "힐링", "캠핑", "사진", "드라이브"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "목장 & 월정사", "activities": ["대관령 양떼목장", "오대산 월정사 전나무 숲길", "메밀 음식 저녁"]},
                    {"day": 2, "title": "삼양목장 & 귀가", "activities": ["삼양목장 하늘목장", "바람의 언덕", "메밀밭 (시즌) 후 귀가"]},
                ],
            },
        },
        {
            "id": "boseong", "name": "보성", "region": "전남", "emoji": "🍵",
            "tagline": "초록빛 녹차밭 속 힐링",
            "description": "한국 최대 녹차 산지. 푸른 녹차밭 사이를 걷는 것만으로도 힐링이 됩니다.",
            "highlights": ["대한다원 녹차밭 산책", "율포해수욕장", "벌교 꼬막 정식"],
            "vibe_tags": ["자연", "힐링", "사진", "감성", "맛집"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "녹차밭 & 율포", "activities": ["대한다원 녹차밭 새벽 안개", "녹차 아이스크림", "율포해수욕장 산책", "꼬막 저녁"]},
                    {"day": 2, "title": "벌교 & 귀가", "activities": ["벌교 꼬막 아침시장", "태백산맥 문학관", "귀가"]},
                ],
            },
        },
        {
            "id": "chuncheon", "name": "춘천", "region": "강원", "emoji": "🦢",
            "tagline": "호수 위 느릿느릿 낭만 여행",
            "description": "소양강과 의암호가 품은 낭만의 도시. 닭갈비와 막국수, 그리고 물레길 카누까지.",
            "highlights": ["소양강 스카이워크", "의암호 물레길 카누", "춘천 닭갈비 거리"],
            "vibe_tags": ["힐링", "맛집", "감성", "자연", "드라이브"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "닭갈비 & 소양강", "activities": ["춘천 닭갈비 점심", "소양강 스카이워크", "의암호 산책", "막걸리 저녁"]},
                    {"day": 2, "title": "물레길 & 귀가", "activities": ["물레길 카누 체험", "남이섬 (선택)", "막국수 점심 후 귀가"]},
                ],
            },
        },
        {
            "id": "hapcheon", "name": "합천", "region": "경남", "emoji": "📿",
            "tagline": "팔만대장경의 고요한 땅",
            "description": "해인사와 팔만대장경, 황매산 철쭉… 역사와 자연이 깊게 공존하는 곳.",
            "highlights": ["해인사 장경판전", "황매산 철쭉 (4~5월)", "합천 영상테마파크"],
            "vibe_tags": ["문화역사", "자연", "힐링", "사색", "사진"],
            "itinerary": {
                "solo_1n2d": [
                    {"day": 1, "title": "해인사 & 황매산", "activities": ["해인사 장경판전 관람", "성보박물관", "황매산 산책 (시즌)"]},
                    {"day": 2, "title": "테마파크 & 귀가", "activities": ["합천 영상테마파크", "합천호 드라이브", "귀가"]},
                ],
            },
        },
    ],
    "E": [  # 활동적·외향적 여행지
        {
            "id": "busan", "name": "부산", "region": "부산", "emoji": "🌊",
            "tagline": "에너지 넘치는 해변 도시",
            "description": "서핑, 야시장, 나이트라이프… 매 순간이 액티비티.",
            "highlights": ["해운대 서핑 체험", "광안대교 야경", "서면 야시장 투어"],
            "vibe_tags": ["서핑", "나이트라이프", "맛집", "야경", "쇼핑"],
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
            "id": "jeju", "name": "제주도", "region": "제주", "emoji": "🌋",
            "tagline": "무한한 액티비티의 섬",
            "description": "한라산 트레킹, 스쿠버다이빙, ATV… 에너지를 다 쓰고 오세요.",
            "highlights": ["한라산 백록담 등반", "우도 자전거 일주", "협재 스노클링"],
            "vibe_tags": ["트레킹", "스노클링", "ATV", "액티비티", "드라이브"],
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
            "id": "gangneung", "name": "강릉", "region": "강원", "emoji": "🏄",
            "tagline": "서핑 & 커피의 도시",
            "description": "경포 서핑, 안목 카페거리, 밤새 이어지는 축제 분위기.",
            "highlights": ["경포해변 서핑 레슨", "안목 커피거리 카페 투어", "주문진 수산시장"],
            "vibe_tags": ["서핑", "카페", "음식", "맛집", "축제"],
            "itinerary": {
                "friends_1n2d": [
                    {"day": 1, "title": "서핑 & 카페", "activities": ["경포 서핑 레슨", "안목 카페거리 3곳 투어", "강릉 중앙시장 먹거리"]},
                    {"day": 2, "title": "주문진 & 귀가", "activities": ["주문진 수산시장", "정동진 일출 (선택)", "귀가"]},
                ],
            },
        },
        {
            "id": "jeonju", "name": "전주", "region": "전북", "emoji": "🏯",
            "tagline": "맛의 도시, 한옥마을 탐험",
            "description": "비빔밥, 막걸리, 한옥 카페… 먹고 즐기는 에너지 충전 여행.",
            "highlights": ["한옥마을 야간 투어", "남부시장 야시장", "막걸리 골목 투어"],
            "vibe_tags": ["맛집", "야시장", "문화역사", "쇼핑", "축제"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "한옥마을 & 야시장", "activities": ["전주 한옥마을 산책", "남부시장 야시장", "막걸리 골목 투어"]},
                    {"day": 2, "title": "비빔밥 & 귀가", "activities": ["전주 전통 비빔밥 아침", "경기전 방문", "초코파이 쇼핑 후 귀가"]},
                ],
            },
        },
        {
            "id": "sokcho", "name": "속초", "region": "강원", "emoji": "🏔️",
            "tagline": "산과 바다 동시에",
            "description": "설악산 케이블카, 속초 해수욕장, 아바이마을… 하루가 48시간이었으면.",
            "highlights": ["설악산 케이블카 권금성", "속초 해수욕장 서핑", "아바이마을 먹거리"],
            "vibe_tags": ["트레킹", "해수욕", "맛집", "액티비티", "자연"],
            "itinerary": {
                "friends_2n3d": [
                    {"day": 1, "title": "도착 & 설악산", "activities": ["설악산 케이블카", "울산바위 트레킹", "아바이마을 저녁"]},
                    {"day": 2, "title": "해변 & 액티비티", "activities": ["속초해수욕장 서핑", "청초호 카약", "속초 시장 먹거리"]},
                    {"day": 3, "title": "낙산사 & 귀가", "activities": ["낙산사 의상대 일출", "양양 서핑 레슨", "귀가"]},
                ],
            },
        },
        {
            "id": "yeosu", "name": "여수", "region": "전남", "emoji": "🌙",
            "tagline": "밤바다가 아름다운 항구도시",
            "description": "해상 케이블카, 낭만포차, 돌산도… 낮보다 밤이 더 아름다운 도시.",
            "highlights": ["여수 해상 케이블카", "돌산 낭만포차", "오동도 산책"],
            "vibe_tags": ["야경", "맛집", "나이트라이프", "축제", "바다"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "케이블카 & 포차", "activities": ["오동도 산책", "여수 해상 케이블카", "돌산 낭만포차 저녁"]},
                    {"day": 2, "title": "이순신광장 & 귀가", "activities": ["이순신 광장", "수산시장 회", "귀가"]},
                ],
                "friends_2n3d": [
                    {"day": 1, "title": "도착 & 야경", "activities": ["오동도", "여수 해상 케이블카", "돌산 낭만포차"]},
                    {"day": 2, "title": "액티비티 & 맛집", "activities": ["향일암 일출", "고흥 나로도 (선택)", "갓김치 맛집"]},
                    {"day": 3, "title": "이순신 & 귀가", "activities": ["진남관 역사 탐방", "수산시장", "귀가"]},
                ],
            },
        },
        {
            "id": "daejeon", "name": "대전", "region": "대전", "emoji": "🍰",
            "tagline": "성심당의 도시, 과학 탐험",
            "description": "성심당 빵 투어, 엑스포과학공원, 계족산 황톳길… 가족과 친구 모두 좋아하는 도시.",
            "highlights": ["성심당 베이커리 투어", "엑스포과학공원", "계족산 황톳길 맨발 걷기"],
            "vibe_tags": ["맛집", "쇼핑", "액티비티", "문화역사", "자연"],
            "itinerary": {
                "family_1n2d": [
                    {"day": 1, "title": "성심당 & 엑스포", "activities": ["성심당 투어 (오픈 런)", "엑스포과학공원", "으능정이 거리 쇼핑"]},
                    {"day": 2, "title": "계족산 & 귀가", "activities": ["계족산 황톳길 맨발 걷기", "장태산 자연휴양림", "귀가"]},
                ],
            },
        },
        {
            "id": "incheon", "name": "인천", "region": "인천", "emoji": "🏮",
            "tagline": "개항장에서 떠나는 시간 여행",
            "description": "차이나타운, 신포시장, 월미도, 개항장 거리까지. 서울 근교 최고의 당일 여행지.",
            "highlights": ["차이나타운 탕수육·공갈빵", "월미도 바이킹", "신포국제시장"],
            "vibe_tags": ["맛집", "쇼핑", "문화역사", "야경", "액티비티"],
            "itinerary": {
                "friends_1n2d": [
                    {"day": 1, "title": "차이나타운 & 월미도", "activities": ["차이나타운 음식 투어", "월미 테마파크", "신포시장 저녁"]},
                    {"day": 2, "title": "개항장 & 귀가", "activities": ["개항장 거리 탐방", "송도 센트럴파크 산책", "귀가"]},
                ],
            },
        },
        {
            "id": "gyeongju", "name": "경주", "region": "경북", "emoji": "🏛️",
            "tagline": "천년 역사 야간 투어",
            "description": "첨성대 야경, 자전거 능선 투어, 황리단길 맛집까지. 낮과 밤 모두 즐거운 역사 도시.",
            "highlights": ["황리단길 맛집 탐방", "첨성대 야간 조명", "보문호 자전거"],
            "vibe_tags": ["문화역사", "야경", "맛집", "자전거", "축제"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "역사 & 야경", "activities": ["불국사·석굴암 오전 탐방", "황리단길 맛집 점심", "첨성대 야간 조명 감상"]},
                    {"day": 2, "title": "보문호 & 귀가", "activities": ["보문호 자전거", "교촌마을 한옥 카페", "귀가"]},
                ],
            },
        },
        {
            "id": "pohang", "name": "포항", "region": "경북", "emoji": "🦞",
            "tagline": "호미곶 일출과 대게의 도시",
            "description": "한반도 최동단 호미곶 일출, 죽도시장 대게, 영일만 야경까지.",
            "highlights": ["호미곶 새해 일출", "죽도시장 대게·물회", "영일만 야경 드라이브"],
            "vibe_tags": ["맛집", "야경", "드라이브", "축제", "자연"],
            "itinerary": {
                "friends_1n2d": [
                    {"day": 1, "title": "호미곶 & 죽도시장", "activities": ["호미곶 해맞이광장", "죽도시장 대게 점심", "영일대해수욕장"]},
                    {"day": 2, "title": "구룡포 & 귀가", "activities": ["구룡포 일본인 가옥 거리", "과메기 구이 점심", "귀가"]},
                ],
            },
        },
        {
            "id": "ulsan", "name": "울산", "region": "울산", "emoji": "🦢",
            "tagline": "공업도시의 반전 — 자연과 야경",
            "description": "대왕암 바위 해안, 태화강 십리대숲, 작괘천 반구대 암각화까지 의외의 매력.",
            "highlights": ["태화강 십리대숲 산책", "대왕암 해안 트레킹", "간절곶 일출"],
            "vibe_tags": ["자연", "액티비티", "야경", "드라이브", "문화역사"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "십리대숲 & 대왕암", "activities": ["태화강 십리대숲 자전거", "대왕암 해안 트레킹", "방어진 항구 횟집"]},
                    {"day": 2, "title": "간절곶 & 귀가", "activities": ["간절곶 일출 (새벽)", "언양 불고기 점심", "귀가"]},
                ],
            },
        },
        {
            "id": "gunsan", "name": "군산", "region": "전북", "emoji": "🕰️",
            "tagline": "근대 역사 골목 시간 여행",
            "description": "일제강점기 흔적이 남은 근대 거리, 이성당 빵, 새만금 드라이브.",
            "highlights": ["근대역사박물관 거리", "이성당 단팥빵 (오픈 런)", "선유도 해수욕장"],
            "vibe_tags": ["문화역사", "맛집", "드라이브", "쇼핑", "감성"],
            "itinerary": {
                "couple_1n2d": [
                    {"day": 1, "title": "근대 거리 & 이성당", "activities": ["이성당 단팥빵 오픈 런", "근대역사박물관 거리", "히로쓰 가옥", "군산항 야경"]},
                    {"day": 2, "title": "선유도 & 귀가", "activities": ["새만금 방조제 드라이브", "선유도 해수욕장", "귀가"]},
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
        "핸드폰 충전기 하나만 챙기세요. 나머지는 현지에서 해결해요. 🔋",
        "지금 당장 KTX 예매 창 여세요. 첫 눈에 들어오는 곳으로. 🚆",
    ],
    "E": [
        "예약? 그냥 가면 돼요. 어디서든 친구 사귀면 되잖아요! 🎉",
        "지금 이 순간, 어딘가에서 파티가 열리고 있어요. 당신만 없는 거예요. 🎊",
        "짐은 가방 하나면 충분해요. 에너지는 현지에서 충전하세요! ⚡",
        "오늘 저녁 약속 취소하고 떠나세요. 더 재밌는 사람들이 기다려요! 🌟",
        "지금 단톡방에 '이번 주말 같이 갈 사람?' 쳐보세요. 그게 시작이에요. 📱",
    ],
}


# ─── 스키마 ───────────────────────────────────────────────────────────────────

THEMES = [
    "자연", "문화역사", "맛집", "액티비티",
    "야경", "힐링/스파", "드라이브", "캠핑",
    "감성/사진", "쇼핑", "축제/이벤트", "공연/문화",
]

THEME_TAGS = {
    "자연":    ["자연", "트레킹", "힐링", "바다", "캠핑", "자전거"],
    "문화역사": ["문화역사", "역사", "사색", "사진", "문화"],
    "맛집":    ["맛집", "미식", "음식", "야시장", "카페", "쇼핑"],
    "액티비티": ["서핑", "ATV", "스노클링", "나이트라이프", "트레킹", "액티비티"],
    "야경":    ["야경", "나이트라이프", "감성", "바다", "드라이브"],
    "힐링/스파": ["힐링", "자연", "사색", "감성", "온천"],
    "드라이브": ["드라이브", "자연", "바다", "자전거", "감성"],
    "캠핑":    ["캠핑", "자연", "별 관측", "트레킹", "힐링"],
    "감성/사진": ["감성", "감성 사진", "사진", "카페", "힐링"],
    "쇼핑":    ["쇼핑", "맛집", "야시장", "문화", "음식"],
    "축제/이벤트": ["축제", "나이트라이프", "야시장", "문화", "맛집"],
    "공연/문화": ["문화역사", "공연", "문화", "사진", "야경"],
}


class SpontaneousRequest(BaseModel):
    mbti: str
    exclude_ids: List[str] = []


class PlanRequest(BaseModel):
    mbti: str
    duration: str   = "2박3일"
    companion: str  = "커플"
    theme: str      = "자연"


def _get_pool(mbti: str) -> list:
    return DESTINATIONS["I"] if "I" in mbti.upper() else DESTINATIONS["E"]


def _pick_itinerary(dest: dict, companion: str, duration: str) -> list:
    it = dest.get("itinerary", {})
    if not it:
        return []
    comp_map = {"혼자": "solo", "커플": "couple", "친구들": "friends", "가족": "family"}
    dur_map  = {"당일": "1n2d", "1박2일": "1n2d", "2박3일": "2n3d", "4일이상": "3n4d"}
    ck = comp_map.get(companion, "couple")
    dk = dur_map.get(duration, "2n3d")
    for c in [ck, "couple", "solo", "friends", "family"]:
        for d in [dk, "2n3d", "1n2d", "3n4d"]:
            key = f"{c}_{d}"
            if key in it:
                return it[key]
    return list(it.values())[0] if it else []


# ─── 엔드포인트 ───────────────────────────────────────────────────────────────

@router.get("/themes")
async def list_themes():
    """사용 가능한 테마 목록."""
    return {"themes": THEMES}


@router.post("/spontaneous")
async def spontaneous(
    body: SpontaneousRequest,
    current_user: User = Depends(get_current_user),
):
    pool = _get_pool(body.mbti)
    available = [d for d in pool if d["id"] not in body.exclude_ids]
    if not available:
        available = pool

    dest = random.choice(available)
    ie = "I" if "I" in body.mbti.upper() else "E"
    intro = random.choice(P_INTROS[ie])

    return {
        "intro": intro,
        "destination": {
            "id": dest["id"], "name": dest["name"], "region": dest["region"],
            "emoji": dest["emoji"], "tagline": dest["tagline"],
            "description": dest["description"], "highlights": dest["highlights"],
            "vibe_tags": dest["vibe_tags"],
        },
    }


@router.post("/plan")
async def plan(
    body: PlanRequest,
    current_user: User = Depends(get_current_user),
):
    pool = _get_pool(body.mbti)
    preferred_tags = THEME_TAGS.get(body.theme, [])

    def score(d: dict) -> int:
        return sum(1 for tag in d.get("vibe_tags", []) if tag in preferred_tags)

    sorted_pool = sorted(pool, key=score, reverse=True)
    dest = sorted_pool[0] if sorted_pool else random.choice(pool)
    itinerary = _pick_itinerary(dest, body.companion, body.duration)

    return {
        "destination": {
            "id": dest["id"], "name": dest["name"], "region": dest["region"],
            "emoji": dest["emoji"], "tagline": dest["tagline"],
            "description": dest["description"], "highlights": dest["highlights"],
            "vibe_tags": dest["vibe_tags"],
        },
        "itinerary": itinerary,
        "meta": {"duration": body.duration, "companion": body.companion, "theme": body.theme},
    }
