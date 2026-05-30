"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi, waypointsApi } from "@/lib/api";
import { TripDetail, Waypoint, Memo } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import dynamic from "next/dynamic";
import MemoPanel from "@/components/memo/MemoPanel";

const TripMap = dynamic(() => import("@/components/map/TripMap"), { ssr: false });

export default function TripPlanPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"plan" | "memo">("plan");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: () =>
      tripsApi.get(id).then((r) => {
        const data = r.data as TripDetail;
        // 첫 로드 시 첫 번째 날짜 자동 선택
        setSelectedDayId((prev) => prev ?? data.days[0]?.id ?? null);
        return data;
      }),
  });

  const { data: memos = [] } = useQuery({
    queryKey: ["memos", id],
    queryFn: () => tripsApi.listMemos(id).then((r) => r.data as Memo[]),
    enabled: !!trip,
  });

  const addWaypointMutation = useMutation({
    mutationFn: ({ dayId, data }: { dayId: string; data: any }) =>
      waypointsApi.add(id, dayId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const deleteWaypointMutation = useMutation({
    mutationFn: (wpId: string) => waypointsApi.delete(wpId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trip", id] }),
  });

  // 지도에서 장소 선택 시 → 현재 선택된 날짜에 경유지 추가
  const handleAddPlace = (place: {
    place_id: string; name: string; address: string; lat: number; lng: number;
  }) => {
    if (!selectedDayId) {
      alert("먼저 좌측에서 날짜를 선택해주세요");
      return;
    }
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
  };

  const selectedDay = (trip as TripDetail | undefined)?.days.find(
    (d) => d.id === selectedDayId
  );
  const allWaypoints: Waypoint[] =
    (trip as TripDetail | undefined)?.days.flatMap((d) => d.waypoints) ?? [];

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">불러오는 중...</div>
    );
  if (!trip) return null;

  const typedTrip = trip as TripDetail;

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <Link href={`/trips/${id}`} className="text-gray-500 hover:text-gray-700 text-sm">
            ← 상세
          </Link>
          <h1 className="font-bold text-gray-800">{typedTrip.title}</h1>
          {typedTrip.region && (
            <span className="text-sm text-gray-500">📍 {typedTrip.region}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("plan")}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              activeTab === "plan"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📅 일정
          </button>
          <button
            onClick={() => setActiveTab("memo")}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              activeTab === "memo"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            📝 메모
          </button>
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
                    <span className="opacity-80">
                      {format(new Date(day.date), "M/d", { locale: ko })}
                    </span>
                  </button>
                ))}
              </div>

              {/* 안내 문구 */}
              {!selectedDayId && (
                <p className="text-xs text-gray-400 text-center px-4 pt-3">
                  날짜를 선택한 뒤 지도에서 장소를 검색하세요
                </p>
              )}
              {selectedDayId && (
                <p className="text-xs text-indigo-500 text-center px-4 pt-2 pb-1">
                  지도 상단 검색창에서 장소를 찾아 추가하세요
                </p>
              )}

              {/* 경유지 목록 */}
              <div className="flex-1 overflow-y-auto p-3">
                {!selectedDay ? (
                  <p className="text-sm text-gray-400 text-center mt-8">
                    날짜를 선택해주세요
                  </p>
                ) : selectedDay.waypoints.length === 0 ? (
                  <div className="text-center mt-10 text-gray-400">
                    <span className="text-3xl block mb-2">🗺️</span>
                    <p className="text-sm">지도에서 장소를 검색해서</p>
                    <p className="text-sm">일정에 추가하세요</p>
                  </div>
                ) : (
                  <ol className="space-y-2">
                    {selectedDay.waypoints.map((wp, idx) => (
                      <WaypointItem
                        key={wp.id}
                        wp={wp}
                        idx={idx}
                        onDelete={() => deleteWaypointMutation.mutate(wp.id)}
                      />
                    ))}
                  </ol>
                )}
              </div>
            </>
          ) : (
            <MemoPanel tripId={id} memos={memos} days={typedTrip.days} />
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

function WaypointItem({
  wp,
  idx,
  onDelete,
}: {
  wp: Waypoint;
  idx: number;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 group">
      <span className="w-6 h-6 flex items-center justify-center bg-indigo-600 text-white text-xs font-bold rounded-full shrink-0 mt-0.5">
        {idx + 1}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-800 truncate">{wp.place_name}</p>
        {wp.address && (
          <p className="text-xs text-gray-400 truncate">{wp.address}</p>
        )}
        {wp.arrival_time && (
          <p className="text-xs text-indigo-500">⏰ {wp.arrival_time}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-gray-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition shrink-0"
      >
        ✕
      </button>
    </li>
  );
}
