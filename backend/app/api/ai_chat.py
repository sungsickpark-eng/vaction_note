"""
ChatGPT(gpt-3.5-turbo) 기반 여행 AI 어시스턴트
- 비용 최적화: 짧은 프롬프트 + max_tokens 제한 + 서버 캐시
- 스트리밍 SSE 응답으로 UX 개선
"""
import json
import hashlib
from typing import Optional, AsyncIterator
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import AsyncOpenAI

from app.core.config import get_settings
from app.core.security import get_current_user
from app.models.models import User

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()

# ─── 서버 캐시 (동일 요청 재사용, API 비용 절감) ─────────────────────────────
_CACHE: dict[str, str] = {}
MAX_CACHE = 200  # 최대 200개 캐시


def _cache_key(*parts: str) -> str:
    return hashlib.md5("|".join(parts).encode()).hexdigest()


def _get_client() -> AsyncOpenAI:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OpenAI API 키가 설정되지 않았습니다")
    return AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


# ─── 스키마 ───────────────────────────────────────────────────────────────────

class RecommendRequest(BaseModel):
    mbti: str
    duration: str = "2박3일"
    companion: str = "커플"
    theme: str = "자연"


class MissionTipRequest(BaseModel):
    mission_title: str
    mission_desc: str


class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None   # 현재 여행/미션 맥락


class TripPlanRequest(BaseModel):
    destination: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: str = "2박3일"
    people: int = 2
    budget_per_day: int = 100000   # 1인당 하루 예산 (원)
    transport: str = "자가용"       # 자가용 | 대중교통 | 도보


# ─── 공통 스트리밍 유틸 ───────────────────────────────────────────────────────

async def _stream_openai(system: str, user: str, max_tokens: int = 400) -> AsyncIterator[str]:
    client = _get_client()
    stream = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=0.8,
        stream=True,
    )
    async for chunk in stream:
        content = chunk.choices[0].delta.content
        if content:
            yield f"data: {json.dumps({'text': content})}\n\n"
    yield "data: [DONE]\n\n"


async def _call_openai(system: str, user: str, max_tokens: int = 400) -> str:
    """캐시 가능한 단일 응답 (스트리밍 아님)."""
    client = _get_client()
    resp = await client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=0.8,
    )
    return resp.choices[0].message.content or ""


# ─── 엔드포인트 ───────────────────────────────────────────────────────────────

@router.post("/recommend/stream")
async def recommend_stream(
    body: RecommendRequest,
    current_user: User = Depends(get_current_user),
):
    """MBTI 기반 여행지 추천 — SSE 스트리밍."""
    is_P = "P" in body.mbti.upper()
    is_I = "I" in body.mbti.upper()

    activity = "조용한 힐링(산책·카페·자연·독서)" if is_I else "활동적(서핑·트레킹·야시장·액티비티)"
    style = "즉흥적이고 자유로운" if is_P else "계획적이고 꼼꼼한"

    system = "당신은 한국 국내 여행 전문가입니다. 한국어로 간결하고 열정적으로 답하세요."
    user = (
        f"MBTI: {body.mbti} ({style} 성향, {activity} 여행 선호)\n"
        f"기간: {body.duration}, 동행: {body.companion}, 테마: {body.theme}\n\n"
        f"국내 여행지 1곳을 추천해주세요. 다음 형식으로:\n"
        f"📍 **[여행지명]** — [한 줄 설명]\n\n"
        f"**{body.mbti}에게 딱인 이유** (2-3문장)\n\n"
        f"**꼭 해볼 것**\n1. ...\n2. ...\n3. ...\n\n"
        f"**💡 핵심 팁** (1가지)"
    )

    async def generator():
        async for chunk in _stream_openai(system, user, max_tokens=450):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/mission-tip/stream")
async def mission_tip_stream(
    body: MissionTipRequest,
    current_user: User = Depends(get_current_user),
):
    """미션별 AI 조언 — SSE 스트리밍."""
    system = "당신은 도전적인 여행 미션 전문가입니다. 한국어로 실용적이고 흥미롭게 답하세요."
    user = (
        f"미션: **{body.mission_title}**\n"
        f"({body.mission_desc})\n\n"
        f"이 미션을 성공하기 위한 실용 팁 3가지를 알려주세요.\n"
        f"각 팁은 제목과 2-3문장 설명 포함. 실패하기 쉬운 함정도 1개 언급."
    )

    async def generator():
        async for chunk in _stream_openai(system, user, max_tokens=400):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/mission/random-stream")
async def random_mission_stream(
    current_user: User = Depends(get_current_user),
):
    """AI가 독창적인 미션을 즉석에서 생성 — SSE 스트리밍."""
    import random
    seeds = ["계절", "날씨", "감정", "숫자", "색깔", "음식", "교통수단", "시간"]
    seed = random.choice(seeds)

    system = "창의적인 여행 미션 기획자입니다. 한국어로 답하세요."
    user = (
        f"키워드 '{seed}'에서 영감을 받아 독창적인 여행 미션 1개를 만들어주세요.\n"
        f"기존에 없던 참신한 미션이어야 합니다.\n\n"
        f"형식:\n"
        f"🎯 **미션명**\n"
        f"**한 줄 설명**\n\n"
        f"**규칙** (3가지)\n"
        f"**성공 조건**\n"
        f"**예상 난이도**: ★★☆ (쉬움/보통/어려움)"
    )

    async def generator():
        async for chunk in _stream_openai(system, user, max_tokens=350):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/chat/stream")
async def chat_stream(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
):
    """자유 여행 Q&A 채팅 — SSE 스트리밍."""
    context_part = f"\n현재 맥락: {body.context}" if body.context else ""
    system = (
        "당신은 한국 국내 여행 전문가 AI입니다. "
        "친근하고 실용적으로 답하세요. 불필요한 인사말은 생략하고 핵심부터."
        + context_part
    )

    async def generator():
        async for chunk in _stream_openai(system, body.message, max_tokens=400):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.post("/trip-plan/stream")
async def trip_plan_stream(
    body: TripPlanRequest,
    current_user: User = Depends(get_current_user),
):
    """여행지·기간·인원·예산 기반 맞춤 여행 계획 — SSE 스트리밍."""
    budget_total = body.budget_per_day * body.people
    date_str = (
        f"{body.start_date} ~ {body.end_date}" if body.start_date and body.end_date
        else body.duration
    )

    transport_guide = {
        "자가용": "자가용 이용 (주차 및 드라이브 코스 포함)",
        "대중교통": "대중교통만 이용 (버스·지하철·기차·택시 경로 포함)",
        "도보": "도보 중심 (걸어서 이동 가능한 반경 내 일정, 이동 거리·시간 명시)",
    }.get(body.transport, body.transport)

    system = "당신은 한국 국내 여행 전문 플래너입니다. 한국어로 실용적이고 체계적으로 답하세요."
    user = (
        f"여행지: **{body.destination}**\n"
        f"기간: {date_str} ({body.duration})\n"
        f"인원: {body.people}명\n"
        f"이동 수단: **{transport_guide}**\n"
        f"1인당 하루 예산: {body.budget_per_day:,}원 (총 일일 예산: {budget_total:,}원)\n\n"
        f"위 조건에 딱 맞는 여행 계획을 만들어주세요. 아래 형식으로:\n\n"
        f"**📍 여행 개요** (2문장)\n\n"
        f"**🚗 이동 방법** ({body.transport} 기준 주요 이동 경로 및 팁)\n\n"
        f"**💰 예산 배분** (교통·숙박·식비·활동비 각각 금액)\n\n"
        f"**📅 일별 상세 일정** (각 Day마다 오전·오후·저녁 활동, {body.transport} 이동 동선 포함)\n\n"
        f"**💡 절약 팁** (예산 내 즐기는 핵심 팁 2가지)"
    )

    async def generator():
        async for chunk in _stream_openai(system, user, max_tokens=600):
            yield chunk

    return StreamingResponse(generator(), media_type="text/event-stream",
                              headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/status")
async def ai_status(current_user: User = Depends(get_current_user)):
    """OpenAI API 키 설정 여부 확인."""
    return {"available": bool(settings.OPENAI_API_KEY)}
