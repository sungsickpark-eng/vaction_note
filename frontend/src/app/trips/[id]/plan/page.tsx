"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi, waypointsApi, mapsApi, api } from "@/lib/api";
import { TripDetail, Waypoint, Memo } from "@/types";
import PremiumGate from "@/components/premium/PremiumGate";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import dynamic from "next/dynamic";
import MemoPanel from "@/components/memo/MemoPanel";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const TripMap = dynamic(() => import("@/components/map/TripMap"), { ssr: false });

// ─── 유틸: 메모에서 AI 추천 활동 파싱 ────────────────────────────────────────

function parseActivities(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => l.replace(/^[•\s]+/, "").trim())
    .filter((l) => l.length > 4);
}

/** 이동/귀가 등 장소가 없는 활동인지 판단 */
function isTransitActivity(activity: string): boolean {
  const cleaned = activity.replace(/^(오전|오후|저녁|낮|밤)\s*[:：]\s*/i, "").trim();
  return /에서.+로\s*(이동|출발|이동$)/.test(cleaned) ||
    /^(귀가|귀환|출발|이동|체크아웃|비행기\s*탑승|버스\s*탑승|기차\s*탑승)/.test(cleaned);
}

function extractSearchQuery(activity: string, region: string): string {
  let text = activity.replace(/^(오전|오후|저녁|낮|밤)\s*[:：]\s*/i, "").trim();
  text = text.replace(/\s*(에서\s+)?이동.*/i, "");
  text = text.replace(/\s*(로|으로)\s+이동.*/i, "");
  const beforeVerb = text.match(
    /^(.+?)(?:\s+(?:방문|탐방|산책|관람|식사|도착|출발|탑승|체크인|구경|감상|경유|투어|체험))/
  );
  const name = beforeVerb ? beforeVerb[1].trim() : text.split(/\s+/).slice(0, 3).join(" ");
  return `${name} ${region}`.trim();
}

// ─── AI 추천 패널 ─────────────────────────────────────────────────────────────

interface AiSuggestion {
  activity: string;
  status: "idle" | "loading" | "ok" | "fail" | "added";
}

function AiSuggestionsPanel({
  dayId,
  memos,
  region,
  onAddPlace,
}: {
  dayId: string;
  memos: Memo[];
  region?: string;
  onAddPlace: (place: { place_id: string; name: string; address: string; lat: number; lng: number }) => void;
}) {
  const dayMemo = memos.find((m) => m.trip_day_id === dayId);
  // 이동/귀가 활동은 제외하고 장소가 있는 활동만 필터링
  const activities = dayMemo
    ? parseActivities(dayMemo.content).filter((a) => !isTransitActivity(a))
    : [];

  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);

  // dayId나 activities 변경 시 suggestions 초기화 (useEffect로 안전하게 처리)
  useEffect(() => {
    setSuggestions(activities.map((a) => ({ activity: a, status: "idle" as const })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId, dayMemo?.id]);

  const handleAdd = useCallback(async (idx: number) => {
    const sug = suggestions[idx];
    if (!sug || sug.status === "loading" || sug.status === "added") return;

    setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, status: "loading" } : s));

    const query = extractSearchQuery(sug.activity, region || "");
    try {
      const res = await mapsApi.search(query);
      const hit = res.data.results?.[0];
      if (hit) {
        onAddPlace({
          place_id: hit.place_id,
          name: hit.name,
          address: hit.address,
          lat: hit.lat,
          lng: hit.lng,
        });
        setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, status: "added" } : s));
      } else {
        // 검색 결과 없음 → 장소명 + 지역 단순화해서 재시도
        const simpleQuery = extractSearchQuery(sug.activity, region || "").split(" ").slice(0, 2).join(" ");
        const res2 = await mapsApi.search(simpleQuery);
        const hit2 = res2.data.results?.[0];
        if (hit2) {
          onAddPlace({ place_id: hit2.place_id, name: hit2.name, address: hit2.address, lat: hit2.lat, lng: hit2.lng });
          setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, status: "added" } : s));
        } else {
          setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, status: "fail" } : s));
        }
      }
    } catch {
      setSuggestions((prev) => prev.map((s, i) => i === idx ? { ...s, status: "fail" } : s));
    }
  }, [suggestions, region, onAddPlace]);

  if (!dayMemo || activities.length === 0) return null;

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-center gap-1.5 px-1 mb-2">
        <span className="text-sm">🤖</span>
        <p className="text-xs font-bold text-indigo-600">AI 추천 장소</p>
        <span className="text-xs text-gray-400 ml-auto">
          {suggestions.filter((s) => s.status === "added").length}/{suggestions.length} 추가됨
        </span>
      </div>
      <div className="space-y-1.5">
        {suggestions.map((sug, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2 rounded-xl px-2.5 py-2 border transition ${
              sug.status === "added"
                ? "bg-indigo-50 border-indigo-200"
                : sug.status === "fail"
                ? "bg-red-50 border-red-100"
                : "bg-gray-50 border-gray-100 hover:border-indigo-200"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-700 leading-snug">{sug.activity}</p>
            </div>
            <button
              onClick={() => handleAdd(idx)}
              disabled={sug.status === "loading" || sug.status === "added"}
              className={`shrink-0 text-xs px-2 py-1 rounded-lg font-bold transition ${
                sug.status === "added"
                  ? "bg-indigo-100 text-indigo-500 cursor-default"
                  : sug.status === "loading"
                  ? "bg-gray-100 text-gray-400 cursor-wait"
                  : sug.status === "fail"
                  ? "bg-red-100 text-red-500 hover:bg-red-200"
                  : "bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
              }`}
            >
              {sug.status === "loading" ? "⏳"
                : sug.status === "added" ? "✓ 추가됨"
                : sug.status === "fail" ? "🔍 재시도"
                : "＋ 추가"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function TripPlanPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  // URL 쿼리 파라미터에서 dayId 읽기 (여행 상세 카드 클릭 시 전달)
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const urlDayId = searchParams?.get("dayId") ?? null;

  const [selectedDayId, setSelectedDayId] = useState<string | null>(urlDayId);
  const [activeTab, setActiveTab] = useState<"plan" | "memo" | "book">("plan");

  // 프리미엄 상태 조회
  const { data: premiumData, refetch: refetchPremium } = useQuery({
    queryKey: ["premium", id],
    queryFn: () => api.get(`/api/trips/${id}/premium`).then((r) => r.data as { is_premium: boolean }),
    enabled: !!id,
    retry: false,
  });
  const isPremium = premiumData?.is_premium ?? false;

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () =>
      tripsApi.get(id).then((r) => {
        const data = r.data as TripDetail;
        // URL dayId가 있으면 우선 적용, 없으면 첫 번째 날짜
        setSelectedDayId((prev) => prev ?? urlDayId ?? data.days[0]?.id ?? null);
        return data;
      }),
  });

  const { data: memos = [] } = useQuery({
    queryKey: ["memos", id],
    queryFn: () => tripsApi.listMemos(id).then((r) => r.data as Memo[]),
    enabled: !!trip,
  });

  const addWaypointMutation = useMutation({
    mutationFn: ({ dayId, data }: { dayId: string; data: Record<string, unknown> }) =>
      waypointsApi.add(id, dayId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const deleteWaypointMutation = useMutation({
    mutationFn: (wpId: string) => waypointsApi.delete(wpId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const handleAddPlace = useCallback((place: {
    place_id: string; name: string; address: string; lat: number; lng: number;
  }) => {
    if (!selectedDayId) { alert("먼저 날짜를 선택해주세요"); return; }
    const day = (trip as TripDetail)?.days.find((d) => d.id === selectedDayId);
    addWaypointMutation.mutate({
      dayId: selectedDayId,
      data: {
        place_name: place.name,
        address: place.address,
        kakao_place_id: place.place_id,
        lat: place.lat,
        lng: place.lng,
        order: day?.waypoints.length ?? 0,
      },
    });
  }, [selectedDayId, trip, addWaypointMutation]);

  const selectedDay = (trip as TripDetail | undefined)?.days.find((d) => d.id === selectedDayId);
  const allWaypoints: Waypoint[] =
    (trip as TripDetail | undefined)?.days.flatMap((d) => d.waypoints) ?? [];

  // ── 드래그 정렬 ──────────────────────────────────────────────────────────────
  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>([]);

  useEffect(() => {
    setLocalWaypoints(selectedDay?.waypoints ?? []);
  }, [selectedDay?.waypoints]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !selectedDayId) return;

    setLocalWaypoints((prev) => {
      const oldIdx = prev.findIndex((w) => w.id === active.id);
      const newIdx = prev.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      waypointsApi.reorder(id, selectedDayId, reordered.map((w) => w.id))
        .then(() => qc.invalidateQueries({ queryKey: ["trip", id] }));
      return reordered;
    });
  }, [selectedDayId, id, qc]);

  const handleTimeChange = useCallback((wpId: string, time: string) => {
    waypointsApi.update(wpId, { arrival_time: time || null })
      .then(() => qc.invalidateQueries({ queryKey: ["trip", id] }));
  }, [id, qc]);

  if (isLoading)
    return <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>;
  if (!trip) return null;

  const typedTrip = trip as TripDetail;

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/trips/${id}`} className="text-gray-500 hover:text-gray-700 text-sm">← 상세</Link>
          <h1 className="font-bold text-gray-800">{typedTrip.title}</h1>
          {typedTrip.region && <span className="text-sm text-gray-500">📍 {typedTrip.region}</span>}
        </div>
        <div className="flex gap-2">
          {(["plan", "memo", "book"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                activeTab === tab
                  ? tab === "book" ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {tab === "plan" ? "📅 일정"
                : tab === "memo" ? <span>📝 메모{!isPremium && " 🔐"}</span>
                : "🔗 예약"}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 좌측 패널 */}
        <aside className="w-72 bg-white border-r flex flex-col overflow-hidden shrink-0">
          {activeTab === "plan" ? (
            <>
              {/* 날짜 탭 */}
              <div className="flex overflow-x-auto border-b px-2 py-2 gap-1 shrink-0">
                {typedTrip.days.map((day, idx) => (
                  <button
                    key={day.id}
                    onClick={() => setSelectedDayId(day.id)}
                    className={`shrink-0 px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition ${
                      selectedDayId === day.id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Day {idx + 1}
                    <br />
                    <span className="opacity-80">{format(new Date(day.date), "M/d", { locale: ko })}</span>
                  </button>
                ))}
              </div>

              {/* 안내 */}
              {selectedDayId && (
                <p className="text-xs text-indigo-500 text-center px-4 pt-2 pb-0.5">
                  지도 검색창 또는 AI 추천에서 장소 추가
                </p>
              )}

              {/* 경유지 + AI 추천 통합 스크롤 */}
              <div className="flex-1 overflow-y-auto p-3">
                {!selectedDay ? (
                  <p className="text-sm text-gray-400 text-center mt-8">날짜를 선택해주세요</p>
                ) : (
                  <>
                    {/* 추가된 경유지 */}
                    {localWaypoints.length > 0 ? (
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={localWaypoints.map((w) => w.id)} strategy={verticalListSortingStrategy}>
                          <ol className="space-y-2">
                            {localWaypoints.map((wp, idx) => (
                              <WaypointItem
                                key={wp.id}
                                wp={wp}
                                idx={idx}
                                onDelete={() => deleteWaypointMutation.mutate(wp.id)}
                                onTimeChange={handleTimeChange}
                              />
                            ))}
                          </ol>
                        </SortableContext>
                      </DndContext>
                    ) : (
                      <div className="text-center text-gray-400 py-6">
                        <span className="text-3xl block mb-2">🗺️</span>
                        <p className="text-xs">지도 검색창 또는 아래 AI 추천으로<br />장소를 추가하세요</p>
                      </div>
                    )}

                    {/* AI 추천 장소 */}
                    <AiSuggestionsPanel
                      dayId={selectedDayId!}
                      memos={memos}
                      region={typedTrip.region}
                      onAddPlace={handleAddPlace}
                    />
                  </>
                )}
              </div>
            </>
          ) : activeTab === "memo" ? (
            isPremium ? (
              <MemoPanel tripId={id} memos={memos} days={typedTrip.days} />
            ) : (
              <PremiumGate tripId={id} onActivated={() => refetchPremium()} />
            )
          ) : (
            <BookingPanel region={typedTrip.region} />
          )}
        </aside>

        {/* 우측 지도 */}
        <div className="flex-1 relative">
          <TripMap
            waypoints={selectedDay ? selectedDay.waypoints : allWaypoints}
            center={
              allWaypoints[0]
                ? { lat: allWaypoints[0].lat!, lng: allWaypoints[0].lng! }
                : { lat: 37.5665, lng: 126.978 }
            }
            onAddPlace={handleAddPlace}
          />
        </div>
      </div>
    </div>
  );
}

// ─── 경유지 아이템 ─────────────────────────────────────────────────────────────

function WaypointItem({
  wp, idx, onDelete, onTimeChange,
}: {
  wp: Waypoint;
  idx: number;
  onDelete: () => void;
  onTimeChange: (id: string, time: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: wp.id });
  const [time, setTime] = useState(wp.arrival_time ?? "");

  useEffect(() => { setTime(wp.arrival_time ?? ""); }, [wp.arrival_time]);

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-start gap-2 bg-gray-50 rounded-xl p-3 group"
    >
      {/* 드래그 핸들 */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 mt-0.5 px-0.5 touch-none"
        title="드래그하여 순서 변경"
      >
        ⠿
      </button>
      <span className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full shrink-0 mt-0.5">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800 truncate">{wp.place_name}</p>
        {wp.address && <p className="text-xs text-gray-400 truncate">{wp.address}</p>}
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={(e) => onTimeChange(wp.id, e.target.value)}
          className="mt-1 text-xs text-indigo-600 bg-transparent border-none outline-none cursor-pointer w-24"
          title="방문 시간 설정"
        />
      </div>
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5"
      >✕</button>
    </li>
  );
}

// ─── 예약 패널 ────────────────────────────────────────────────────────────────

const TRANSPORT_SECTIONS = [
  { title: "✈️ 항공권", links: [
    { label: "네이버항공", url: "https://flight.naver.com", bg: "bg-green-600" },
    { label: "스카이스캐너", url: "https://www.skyscanner.co.kr", bg: "bg-sky-500" },
    { label: "트립닷컴", url: "https://www.trip.com/ko", bg: "bg-cyan-600" },
  ]},
  { title: "🚆 기차", links: [
    { label: "코레일 KTX", url: "https://www.letskorail.com", bg: "bg-red-500" },
    { label: "SRT", url: "https://etk.srail.kr", bg: "bg-blue-600" },
  ]},
  { title: "🚌 버스", links: [
    { label: "고속버스 코버스", url: "https://www.kobus.co.kr", bg: "bg-green-700" },
    { label: "시외버스", url: "https://www.busterminal.or.kr", bg: "bg-emerald-600" },
  ]},
  { title: "🚙 렌트카", links: [
    { label: "쏘카", url: "https://www.socar.kr", bg: "bg-teal-500" },
    { label: "그린카", url: "https://www.greencar.co.kr", bg: "bg-green-500" },
    { label: "롯데렌터카", url: "https://www.lotterentacar.net", bg: "bg-red-600" },
  ]},
];

const HOTEL_SECTIONS = [
  { title: "🏨 국내 숙박", links: [
    { label: "야놀자", url: "https://www.yanolja.com", bg: "bg-pink-500" },
    { label: "여기어때", url: "https://www.goodchoice.kr", bg: "bg-purple-500" },
    { label: "데일리호텔", url: "https://www.dailyhotel.com", bg: "bg-indigo-500" },
  ]},
  { title: "🌐 글로벌 예약", links: [
    { label: "에어비앤비", url: "https://www.airbnb.co.kr", bg: "bg-rose-500" },
    { label: "부킹닷컴", url: "https://www.booking.com", bg: "bg-blue-700" },
    { label: "호텔스닷컴", url: "https://www.hotels.com", bg: "bg-red-700" },
    { label: "아고다", url: "https://www.agoda.com/ko-kr", bg: "bg-red-500" },
  ]},
];

function BookingPanel({ region }: { region?: string }) {
  const enc = encodeURIComponent(region || "");
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-5">
      {region && <p className="text-xs text-center text-gray-400 bg-gray-50 rounded-lg py-1.5">📍 {region} 여행 예약 링크</p>}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">교통편 예약</h3>
        <div className="space-y-3">
          {TRANSPORT_SECTIONS.map((sec) => (
            <div key={sec.title}>
              <p className="text-xs font-bold text-gray-600 mb-1.5">{sec.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {sec.links.map(({ label, url, bg }) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                    className={`${bg} text-white text-xs font-bold py-2 px-2 rounded-lg text-center hover:opacity-90 transition`}>{label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t" />
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">숙박 예약</h3>
        <div className="space-y-3">
          {HOTEL_SECTIONS.map((sec) => (
            <div key={sec.title}>
              <p className="text-xs font-bold text-gray-600 mb-1.5">{sec.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {sec.links.map(({ label, url, bg }) => {
                  let finalUrl = url;
                  if (region && url.includes("yanolja.com")) finalUrl = `${url}/search?keyword=${enc}`;
                  if (region && url.includes("goodchoice.kr")) finalUrl = `${url}/hotels?keyword=${enc}`;
                  return (
                    <a key={url} href={finalUrl} target="_blank" rel="noopener noreferrer"
                      className={`${bg} text-white text-xs font-bold py-2 px-2 rounded-lg text-center hover:opacity-90 transition`}>{label}</a>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
