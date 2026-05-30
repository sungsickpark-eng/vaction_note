"use client";

import { useQuery } from "@tanstack/react-query";
import { tripsApi } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TripDetail, Memo, Photo, Waypoint } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import dynamic from "next/dynamic";

const RegionMap = dynamic(() => import("@/components/map/RegionMap"), { ssr: false });

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => tripsApi.get(id).then((r) => r.data as TripDetail),
  });

  const { data: memos = [] } = useQuery({
    queryKey: ["memos", id],
    queryFn: () => tripsApi.listMemos(id).then((r) => r.data as Memo[]),
    enabled: !!trip,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["photos", id],
    queryFn: () => tripsApi.listPhotos(id).then((r) => r.data as Photo[]),
    enabled: !!trip,
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>;
  if (!trip) return <div className="min-h-screen flex items-center justify-center text-gray-400">여행을 찾을 수 없습니다</div>;

  const dateRange =
    trip.start_date && trip.end_date
      ? `${format(new Date(trip.start_date), "yyyy년 M월 d일", { locale: ko })} ~ ${format(new Date(trip.end_date), "M월 d일", { locale: ko })}`
      : null;

  // 전체 경유지 (순서대로)
  const allWaypoints: Waypoint[] = trip.days.flatMap((d) => d.waypoints);

  return (
    <div className="min-h-screen bg-gray-50">
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
            <RegionMap
              region={trip.region}
              waypoints={allWaypoints}
              height="340px"
            />
            {/* 지역명 배지 */}
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow text-sm font-semibold text-indigo-700 flex items-center gap-1.5">
              <span>📍</span>
              <span>{trip.region}</span>
              {allWaypoints.length > 0 && (
                <span className="text-xs text-gray-400 font-normal ml-1">
                  ({allWaypoints.length}개 장소)
                </span>
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
          {/* 타임라인 */}
          <div className="lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-800 mb-4">일별 일정</h2>
            {trip.days.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">
                <p>아직 일정이 없습니다</p>
                <button
                  onClick={() => router.push(`/trips/${id}/plan`)}
                  className="mt-3 text-indigo-600 hover:underline"
                >
                  일정 추가하기 →
                </button>
              </div>
            ) : (
              trip.days.map((day, idx) => (
                <div key={day.id} className="bg-white rounded-xl shadow p-5 mb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white text-sm font-bold rounded-full">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-gray-800">
                        Day {idx + 1} — {format(new Date(day.date), "M월 d일 (E)", { locale: ko })}
                      </p>
                      {day.title && <p className="text-sm text-gray-500">{day.title}</p>}
                    </div>
                  </div>
                  {day.waypoints.length === 0 ? (
                    <p className="text-sm text-gray-400 pl-11">경유지 없음</p>
                  ) : (
                    <ol className="pl-11 space-y-3">
                      {day.waypoints.map((wp, wi) => (
                        <li key={wp.id} className="flex items-start gap-3">
                          <span className="text-xs font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mt-0.5">
                            {wi + 1}
                          </span>
                          <div>
                            <p className="font-medium text-gray-800">{wp.place_name}</p>
                            {wp.address && <p className="text-xs text-gray-400">{wp.address}</p>}
                            {wp.arrival_time && (
                              <p className="text-xs text-gray-500">도착: {wp.arrival_time}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 사이드: 메모 + 사진 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">메모 ({memos.length})</h2>
              {memos.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-4 text-center text-gray-400 text-sm">메모가 없습니다</div>
              ) : (
                memos.slice(0, 5).map((m) => (
                  <div key={m.id} className="bg-white rounded-xl shadow p-4 mb-3">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.content}</p>
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {m.tags.map((tag) => (
                          <span key={tag} className="text-xs bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(m.created_at), "M.d HH:mm", { locale: ko })}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-800 mb-4">사진 ({photos.length})</h2>
              {photos.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-4 text-center text-gray-400 text-sm">사진이 없습니다</div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 9).map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={p.id}
                      src={p.image_url}
                      alt={p.caption || ""}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
