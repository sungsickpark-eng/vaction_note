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
    .filter((l) => l.length > 2)
    .slice(0, 4);
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

const DAY_GRADIENTS = [
  "from-indigo-500 to-purple-600",
  "from-sky-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-600",
  "from-violet-500 to-indigo-600",
  "from-teal-500 to-green-600",
];

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">불러오는 중...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">여행을 찾을 수 없습니다</div>;

  const dateRange = trip.start_date && trip.end_date
    ? `${format(new Date(trip.start_date), "yyyy.MM.dd", { locale: ko })} ~ ${format(new Date(trip.end_date), "MM.dd", { locale: ko })}`
    : null;

  const allWaypoints: Waypoint[] = trip.days.flatMap((d) => d.waypoints);

  // AI 메모 제외한 일반 메모만 표시
  const userMemos = memos.filter((m) => !m.content.startsWith("📅 Day"));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← 대시보드</Link>
          <h1 className="font-bold text-gray-800 truncate max-w-[180px] sm:max-w-none">{trip.title}</h1>
        </div>
        <button
          onClick={() => router.push(`/trips/${id}/plan`)}
          className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition font-medium"
        >
          ✏️ 일정 편집
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">

        {/* ── 지역 지도 ── */}
        {trip.region && (
          <div className="relative">
            <RegionMap region={trip.region} waypoints={allWaypoints} height="260px" />
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-sm font-bold text-indigo-700 flex items-center gap-1.5">
              📍 {trip.region}
              {dateRange && <span className="text-xs text-gray-400 font-normal ml-1">{dateRange}</span>}
            </div>
          </div>
        )}

        {/* ── 일별 일정 카드 뉴스 ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-black text-gray-800">📅 일별 일정</h2>
            <button
              onClick={() => router.push(`/trips/${id}/plan`)}
              className="text-sm text-indigo-500 hover:underline font-medium"
            >
              전체 편집 →
            </button>
          </div>

          {trip.days.length === 0 ? (
            <div className="bg-white rounded-2xl shadow p-10 text-center text-gray-400">
              <p className="mb-3">아직 일정이 없어요</p>
              <button
                onClick={() => router.push(`/trips/${id}/plan`)}
                className="text-indigo-500 hover:underline text-sm"
              >
                일정 추가하기 →
              </button>
            </div>
          ) : (
            /* 가로 스크롤 카드 */
            <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
              {trip.days.map((day, idx) => {
                const dayMemo = findDayMemo(memos, day.id, idx);
                const activities = dayMemo ? parseAiActivities(dayMemo.content) : [];
                const wps = day.waypoints;
                const gradient = DAY_GRADIENTS[idx % DAY_GRADIENTS.length];

                return (
                  <button
                    key={day.id}
                    onClick={() => router.push(`/trips/${id}/plan?dayId=${day.id}`)}
                    className="shrink-0 w-52 text-left rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group"
                  >
                    {/* 카드 헤더 */}
                    <div className={`bg-gradient-to-br ${gradient} p-4 text-white relative`}>
                      <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">
                        Day {idx + 1}
                      </span>
                      <p className="font-black text-lg mt-1">
                        {format(new Date(day.date), "M월 d일", { locale: ko })}
                      </p>
                      <p className="text-white/80 text-xs">
                        {format(new Date(day.date), "(E)", { locale: ko })}
                      </p>
                      {wps.length > 0 && (
                        <span className="absolute top-3 right-3 text-xs bg-white/30 px-2 py-0.5 rounded-full">
                          📍{wps.length}곳
                        </span>
                      )}
                    </div>

                    {/* 카드 본문 */}
                    <div className="bg-white p-3 min-h-[120px]">
                      {/* 경유지가 있으면 경유지 표시 */}
                      {wps.length > 0 ? (
                        <ul className="space-y-1.5">
                          {wps.slice(0, 3).map((wp, wi) => (
                            <li key={wp.id} className="flex items-start gap-1.5 text-xs text-gray-700">
                              <span className="shrink-0 w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold mt-0.5">
                                {wi + 1}
                              </span>
                              <span className="truncate">{wp.place_name}</span>
                            </li>
                          ))}
                          {wps.length > 3 && (
                            <li className="text-xs text-gray-400 pl-5">+{wps.length - 3}개 더</li>
                          )}
                        </ul>
                      ) : activities.length > 0 ? (
                        /* AI 추천 활동 표시 */
                        <ul className="space-y-1.5">
                          {activities.slice(0, 3).map((act, ai) => (
                            <li key={ai} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <span className="text-indigo-400 shrink-0 mt-0.5">▸</span>
                              <span className="truncate">{act}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-400 mt-2">일정을 추가해보세요</p>
                      )}

                      {/* 하단 화살표 */}
                      <div className="mt-3 flex items-center justify-end">
                        <span className="text-xs text-indigo-400 font-bold group-hover:translate-x-1 transition-transform">→</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── 메모 카드 뉴스 ── */}
        {userMemos.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-black text-gray-800">📝 여행 메모</h2>
              <span className="text-sm text-gray-400">{userMemos.length}개</span>
            </div>

            <div className="space-y-3">
              {userMemos.map((memo) => (
                <button
                  key={memo.id}
                  onClick={() => setSelectedMemo(memo)}
                  className="w-full text-left bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all p-4 group"
                >
                  <div className="flex items-start gap-3">
                    {/* 감정 태그 아이콘 */}
                    <div className="shrink-0 w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                      {memo.tags?.[0] ?? "📝"}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* 내용 미리보기 (2줄) */}
                      <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug">
                        {memo.content.replace(/^[📅•\s]+/, "").substring(0, 80)}
                        {memo.content.length > 80 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {memo.tags && memo.tags.length > 1 && (
                          <div className="flex gap-1">
                            {memo.tags.slice(1, 4).map((tag) => (
                              <span key={tag} className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">
                          {format(new Date(memo.created_at), "M.d HH:mm", { locale: ko })}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 text-gray-300 group-hover:text-indigo-400 transition-colors">›</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

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
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{selectedMemo.tags?.[0] ?? "📝"}</span>
                <span className="text-sm text-gray-400">
                  {format(new Date(selectedMemo.created_at), "yyyy년 M월 d일 HH:mm", { locale: ko })}
                </span>
              </div>
              <button
                onClick={() => setSelectedMemo(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-light"
              >✕</button>
            </div>

            {/* 메모 전체 내용 */}
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base mb-4">
              {selectedMemo.content}
            </p>

            {/* 태그 */}
            {selectedMemo.tags && selectedMemo.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {selectedMemo.tags.map((tag) => (
                  <span key={tag} className="text-sm bg-yellow-50 text-yellow-600 px-3 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* 위치 정보 */}
            {selectedMemo.lat && selectedMemo.lng && (
              <p className="text-xs text-gray-400">
                📍 {selectedMemo.lat.toFixed(4)}, {selectedMemo.lng.toFixed(4)}
              </p>
            )}

            <button
              onClick={() => setSelectedMemo(null)}
              className="w-full mt-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
