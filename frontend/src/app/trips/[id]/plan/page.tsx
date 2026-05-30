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
  const [activeTab, setActiveTab] = useState<"plan" | "memo" | "book">("plan");

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
          <button
            onClick={() => setActiveTab("book")}
            className={`px-3 py-1.5 text-sm rounded-lg transition ${
              activeTab === "book"
                ? "bg-emerald-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            🔗 예약
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
          ) : activeTab === "memo" ? (
            <MemoPanel tripId={id} memos={memos} days={typedTrip.days} />
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

// ─── 예약 패널 ────────────────────────────────────────────────────────────────

const TRANSPORT_SECTIONS = [
  {
    title: "✈️ 항공권",
    links: [
      { label: "네이버항공", url: "https://flight.naver.com", bg: "bg-green-600" },
      { label: "스카이스캐너", url: "https://www.skyscanner.co.kr", bg: "bg-sky-500" },
      { label: "트립닷컴", url: "https://www.trip.com/ko", bg: "bg-cyan-600" },
    ],
  },
  {
    title: "🚆 기차",
    links: [
      { label: "코레일 KTX", url: "https://www.letskorail.com", bg: "bg-red-500" },
      { label: "SRT", url: "https://etk.srail.kr", bg: "bg-blue-600" },
    ],
  },
  {
    title: "🚌 버스",
    links: [
      { label: "고속버스 코버스", url: "https://www.kobus.co.kr", bg: "bg-green-700" },
      { label: "시외버스", url: "https://www.busterminal.or.kr", bg: "bg-emerald-600" },
    ],
  },
  {
    title: "🚙 렌트카",
    links: [
      { label: "쏘카", url: "https://www.socar.kr", bg: "bg-teal-500" },
      { label: "그린카", url: "https://www.greencar.co.kr", bg: "bg-green-500" },
      { label: "롯데렌터카", url: "https://www.lotterentacar.net", bg: "bg-red-600" },
      { label: "SK렌터카", url: "https://www.skcar.co.kr", bg: "bg-orange-500" },
    ],
  },
];

const HOTEL_SECTIONS = [
  {
    title: "🏨 국내 숙박",
    links: [
      { label: "야놀자", url: "https://www.yanolja.com", bg: "bg-pink-500" },
      { label: "여기어때", url: "https://www.goodchoice.kr", bg: "bg-purple-500" },
      { label: "데일리호텔", url: "https://www.dailyhotel.com", bg: "bg-indigo-500" },
    ],
  },
  {
    title: "🌐 글로벌 예약",
    links: [
      { label: "에어비앤비", url: "https://www.airbnb.co.kr", bg: "bg-rose-500" },
      { label: "부킹닷컴", url: "https://www.booking.com", bg: "bg-blue-700" },
      { label: "호텔스닷컴", url: "https://www.hotels.com", bg: "bg-red-700" },
      { label: "아고다", url: "https://www.agoda.com/ko-kr", bg: "bg-red-500" },
    ],
  },
  {
    title: "🏕️ 캠핑·독채",
    links: [
      { label: "캠핑닷컴", url: "https://www.camping.co.kr", bg: "bg-lime-600" },
      { label: "글램핑", url: "https://www.glamping.co.kr", bg: "bg-amber-600" },
    ],
  },
];

function BookingPanel({ region }: { region?: string }) {
  const encodedRegion = encodeURIComponent(region || "");

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-5">
      {region && (
        <p className="text-xs text-center text-gray-400 bg-gray-50 rounded-lg py-1.5">
          📍 {region} 여행 예약 링크
        </p>
      )}

      {/* 교통편 */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">교통편 예약</h3>
        <div className="space-y-3">
          {TRANSPORT_SECTIONS.map((sec) => (
            <div key={sec.title}>
              <p className="text-xs font-bold text-gray-600 mb-1.5">{sec.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {sec.links.map(({ label, url, bg }) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${bg} text-white text-xs font-bold py-2 px-2 rounded-lg text-center hover:opacity-90 transition`}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t" />

      {/* 숙박 */}
      <div>
        <h3 className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">숙박 예약</h3>
        <div className="space-y-3">
          {HOTEL_SECTIONS.map((sec) => (
            <div key={sec.title}>
              <p className="text-xs font-bold text-gray-600 mb-1.5">{sec.title}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {sec.links.map(({ label, url, bg }) => {
                  // 지역명이 있으면 야놀자·여기어때 검색 URL에 반영
                  let finalUrl = url;
                  if (region && url.includes("yanolja.com")) finalUrl = `${url}/search?keyword=${encodedRegion}`;
                  if (region && url.includes("goodchoice.kr")) finalUrl = `${url}/hotels?keyword=${encodedRegion}`;

                  return (
                    <a
                      key={url}
                      href={finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${bg} text-white text-xs font-bold py-2 px-2 rounded-lg text-center hover:opacity-90 transition`}
                    >
                      {label}
                    </a>
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
