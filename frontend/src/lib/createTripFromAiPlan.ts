import { AiDay } from "@/hooks/useAiStream";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

/** 활동 텍스트에서 Kakao 검색용 장소명 추출 */
function extractPlaceName(activity: string, region: string): string {
  let text = activity.replace(/^(오전|오후|저녁|낮|밤)\s*[:：]\s*/i, "").trim();
  text = text.replace(/\s*(에서\s+)?이동.*/i, "");
  text = text.replace(/\s*(로|으로)\s+이동.*/i, "");
  text = text.replace(/\s*(으로|로)\s+출발.*/i, "");

  // 동사 이전 명사구 추출
  const beforeVerb = text.match(
    /^(.+?)(?:\s+(?:방문|탐방|산책|관람|식사|도착|출발|탑승|체크인|구경|감상|경유|투어|체험|쇼핑|감상))/
  );
  const name = (beforeVerb?.[1] ?? text.split(/\s+/).slice(0, 3).join(" ")).trim();

  return `${name} ${region}`.trim();
}

/** 장소 단순 이동/이탈 활동인지 판단 (지오코딩 불필요) */
function isTransitOnly(activity: string): boolean {
  return /^(오전|오후|저녁|낮|밤)\s*[:：].*에서.*로\s+이동/i.test(activity) ||
    /^(오전|오후|저녁|낮|밤)\s*[:：]\s*(출발|귀가|체크아웃)/i.test(activity);
}

export interface CreateTripProgress {
  stage: "trip" | "memo" | "waypoint" | "done";
  day?: number;
  total?: number;
  place?: string;
}

/**
 * AI 플랜으로 여행 생성:
 * 1. 여행 생성
 * 2. 일별 메모 추가
 * 3. 활동 → 지오코딩 → 경유지(waypoint) 추가
 */
export async function createTripFromAiPlan(
  {
    destination,
    startDate,
    endDate,
    parsedDays,
    title,
  }: {
    destination: string;
    startDate?: string;
    endDate?: string;
    parsedDays: AiDay[];
    title: string;
  },
  onProgress?: (p: CreateTripProgress) => void
): Promise<string> {
  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // ─ 1. 여행 생성 ────────────────────────────────────────────────────────────
  onProgress?.({ stage: "trip" });
  const tripRes = await fetch(`${API}/api/trips`, {
    method: "POST", headers,
    body: JSON.stringify({
      title,
      region: destination,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      visibility: "private",
    }),
  });
  const trip = await tripRes.json();
  if (!trip.id) throw new Error("여행 생성 실패");

  if (!parsedDays.length || !startDate) return trip.id;

  // ─ 2. 일별 Trip Day 목록 가져오기 ──────────────────────────────────────────
  const daysRes = await fetch(`${API}/api/trips/${trip.id}/days`, { headers });
  const tripDays: { id: string; date: string }[] = await daysRes.json();

  // 시간대 문제 없이 날짜 계산 (YYYY-MM-DD 문자열 직접 조작)
  function addDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d + days);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  const totalDays = parsedDays.length;

  for (const day of parsedDays) {
    const dateStr = addDays(startDate, day.day - 1);
    const tripDay = tripDays.find((d) => d.date === dateStr);
    if (!tripDay) continue;

    // ─ 3. 메모 추가 ────────────────────────────────────────────────────────
    onProgress?.({ stage: "memo", day: day.day, total: totalDays });
    const content =
      `📅 Day ${day.day} — ${day.title}\n\n` +
      day.activities.map((a) => `• ${a}`).join("\n");
    await fetch(`${API}/api/trips/${trip.id}/memos`, {
      method: "POST", headers,
      body: JSON.stringify({ content, trip_day_id: tripDay.id }),
    });

    // ─ 4. 활동별 지오코딩 → 경유지 추가 ───────────────────────────────────
    let order = 0;
    for (const activity of day.activities) {
      if (isTransitOnly(activity)) continue;

      const query = extractPlaceName(activity, destination);
      onProgress?.({ stage: "waypoint", day: day.day, total: totalDays, place: query });

      try {
        const searchRes = await fetch(
          `${API}/api/maps/search?q=${encodeURIComponent(query)}`,
          { headers }
        );
        const searchData = await searchRes.json();
        const hit = searchData.results?.[0];

        if (hit) {
          await fetch(`${API}/api/trips/${trip.id}/days/${tripDay.id}/waypoints`, {
            method: "POST", headers,
            body: JSON.stringify({
              place_name: hit.name,
              address: hit.address,
              kakao_place_id: hit.place_id,
              lat: hit.lat,
              lng: hit.lng,
              note: activity,   // 원본 활동 내용을 노트로 보존
              order: order++,
            }),
          });
        }
      } catch {
        // 지오코딩 실패 시 해당 장소 건너뜀
      }

      await new Promise((r) => setTimeout(r, 120)); // rate-limit 방지
    }
  }

  onProgress?.({ stage: "done" });
  return trip.id;
}
