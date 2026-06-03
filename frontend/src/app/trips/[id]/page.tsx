"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { tripsApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TripDetail, Memo, Waypoint } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import dynamic from "next/dynamic";

const RegionMap = dynamic(() => import("@/components/map/RegionMap"), { ssr: false });

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function parseAiActivities(content: string): string[] {
  return content
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => l.replace(/^[•\s]+/, "").trim())
    .filter((l) => l.length > 2);
}

function findDayMemo(memos: Memo[], dayId: string, dayIdx: number): Memo | undefined {
  const byId = memos.find((m) => m.trip_day_id === dayId);
  if (byId) return byId;
  const dayNum = dayIdx + 1;
  return memos.find(
    (m) =>
      m.content.includes(`📅 Day ${dayNum}`) ||
      m.content.match(new RegExp(`^📅\\s*Day\\s+${dayNum}[\\s—–-]`, "m"))
  );
}

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => tripsApi.get(id).then((r) => r.data as TripDetail),
  });

  const { data: memos = [] } = useQuery({
    queryKey: ["memos", id],
    queryFn: () => tripsApi.listMemos(id).then((r) => r.data as Memo[]),
    enabled: !!trip,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">여행을 찾을 수 없습니다</div>;

  const dateRange = trip.start_date && trip.end_date
    ? `${format(new Date(trip.start_date), "yyyy년 M월 d일", { locale: ko })} ~ ${format(new Date(trip.end_date), "M월 d일", { locale: ko })}`
    : null;

  const allWaypoints: Waypoint[] = trip.days.flatMap((d) => d.waypoints);
  const userMemos = memos.filter((m) => !m.content.startsWith("📅 Day"));

  const handleDayClick = (dayId: string) => {
    router.push(`/trips/${id}/plan?dayId=${dayId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">← 대시보드</Link>
          <h1 className="font-bold text-lg text-gray-800">{trip.title}</h1>
        </div>
        <button
          onClick={() => router.push(`/trips/${id}/plan`)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          일정 계획 편집
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* ── 상단 지도 ── */}
        {trip.region && (
          <div className="mb-6 relative">
            <RegionMap region={trip.region} waypoints={allWaypoints} height="340px" />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
              <span>📍</span>
              <span>{trip.region}</span>
              {allWaypoints.length > 0 && (
                <span className="text-xs text-gray-400 font-normal ml-1">({allWaypoints.length}개 장소)</span>
              )}
            </div>
          </div>
        )}

        {/* 여행 기본 정보 */}
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {trip.region && <span>📍 {trip.region}</span>}
            {dateRange && <span>📅 {dateRange}</span>}
            <span>
              {trip.visibility === "private" ? "🔒 나만 보기"
                : trip.visibility === "link" ? "🔗 링크 공유"
                : "🌍 전체 공개"}
            </span>
          </div>
          {trip.description && <p className="mt-3 text-gray-700">{trip.description}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── 일별 일정 (클릭 가능한 카드) ── */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-4">일별 일정</h2>
            {trip.days.length === 0 ? (
              <div
                onClick={() => router.push(`/trips/${id}/plan`)}
                className="bg-white rounded-xl shadow p-8 text-center text-gray-400 cursor-pointer hover:shadow-md transition"
              >
                <p>아직 일정이 없습니다</p>
                <p className="text-indigo-500 text-sm mt-2 hover:underline">일정 추가하기 →</p>
              </div>
            ) : (
              trip.days.map((day, idx) => (
                <div
                  key={day.id}
                  onClick={() => handleDayClick(day.id)}
                  className="bg-white rounded-xl shadow p-5 mb-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white text-sm font-bold rounded-full shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">
                        Day {idx + 1} — {format(new Date(day.date), "M월 d일 (E)", { locale: ko })}
                      </p>
                      {day.title && <p className="text-sm text-gray-500">{day.title}</p>}
                    </div>
                    {/* 클릭 힌트 화살표 */}
                    <span className="text-gray-300 group-hover:text-indigo-400 transition-colors text-lg shrink-0">›</span>
                  </div>

                  <DayItinerary
                    day={day}
                    dayIdx={idx}
                    memos={memos}
                  />
                </div>
              ))
            )}
          </div>

          {/* ── 사이드: 메모 + 사진 ── */}
          <div className="space-y-6">
            {/* 메모 */}
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">메모 ({userMemos.length})</h2>
              {userMemos.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-4 text-center text-gray-400 text-sm">메모가 없습니다</div>
              ) : (
                userMemos.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemo(m)}
                    className="bg-white rounded-xl shadow p-4 mb-3 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 line-clamp-2 leading-snug">{m.content}</p>
                        {m.tags && m.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {m.tags.map((tag) => (
                              <span key={tag} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1.5">
                          {format(new Date(m.created_at), "M.d HH:mm", { locale: ko })}
                        </p>
                      </div>
                      <span className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0">›</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ── 메모 상세 모달 ── */}
      {selectedMemo && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedMemo(null)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedMemo.tags?.[0] ?? "📝"}</span>
                <span className="text-sm text-gray-400">
                  {format(new Date(selectedMemo.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                </span>
              </div>
              <button onClick={() => setSelectedMemo(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base mb-4">
              {selectedMemo.content}
            </p>

            {selectedMemo.tags && selectedMemo.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedMemo.tags.map((tag) => (
                  <span key={tag} className="text-sm bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full">{tag}</span>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelectedMemo(null)}
              className="w-full mt-2 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 일별 일정 내용 컴포넌트 ──────────────────────────────────────────────────

function DayItinerary({
  day,
  dayIdx,
  memos,
}: {
  day: { id: string; waypoints: Waypoint[] };
  dayIdx: number;
  memos: Memo[];
}) {
  const dayMemo = findDayMemo(memos, day.id, dayIdx);
  const aiActivities = dayMemo ? parseAiActivities(dayMemo.content) : [];
  const hasWaypoints = day.waypoints.length > 0;
  const hasAi = aiActivities.length > 0;

  if (!hasWaypoints && !hasAi) {
    return (
      <p className="text-sm text-gray-400 pl-11">일정을 클릭해서 장소를 추가해보세요</p>
    );
  }

  return (
    <div className="pl-11 space-y-4">
      {/* 경유지 */}
      {hasWaypoints && (
        <ol className="space-y-2">
          {day.waypoints.map((wp, wi) => (
            <li key={wp.id} className="flex items-start gap-3">
              <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-0.5 shrink-0">
                {wi + 1}
              </span>
              <div>
                <p className="font-medium text-gray-800">{wp.place_name}</p>
                {wp.address && <p className="text-xs text-gray-400">{wp.address}</p>}
                {(wp as unknown as { note?: string }).note && (
                  <p className="text-xs text-gray-500 mt-0.5 italic">
                    {(wp as unknown as { note?: string }).note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* AI 추천 활동 */}
      {hasAi && (
        <div className={hasWaypoints ? "border-t pt-3" : ""}>
          {hasWaypoints && (
            <p className="text-xs font-bold text-indigo-500 mb-2">🤖 AI 추천 활동</p>
          )}
          <ul className="space-y-2">
            {aiActivities.map((act, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full mt-0.5 shrink-0 font-medium ${
                  hasWaypoints ? "bg-purple-50 text-purple-500" : "bg-indigo-50 text-indigo-500"
                }`}>
                  {hasWaypoints ? "🤖" : i + 1}
                </span>
                <p className="text-sm text-gray-700 leading-snug">{act}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
