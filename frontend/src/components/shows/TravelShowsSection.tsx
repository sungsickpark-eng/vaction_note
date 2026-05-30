"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TRAVEL_SHOWS, TravelShow } from "./travelShowsData";
import { createTripFromAiPlan, CreateTripProgress } from "@/lib/createTripFromAiPlan";
import { AiDay } from "@/hooks/useAiStream";

// ─── 섹션 메인 ────────────────────────────────────────────────────────────────

export default function TravelShowsSection() {
  const [selectedShow, setSelectedShow] = useState<TravelShow | null>(null);

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📺</span>
        <div>
          <h2 className="text-xl font-black text-gray-800">방송 여행 따라하기</h2>
          <p className="text-sm text-gray-500">TV 여행 프로그램 일정을 그대로 내 여행으로</p>
        </div>
      </div>

      {/* 가로 스크롤 카드 */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}>
        {TRAVEL_SHOWS.map((show) => (
          <ShowCard key={show.id} show={show} onClick={() => setSelectedShow(show)} />
        ))}
      </div>

      {/* 상세 모달 */}
      {selectedShow && (
        <ShowDetailModal
          show={selectedShow}
          onClose={() => setSelectedShow(null)}
        />
      )}
    </section>
  );
}

// ─── 썸네일 카드 ──────────────────────────────────────────────────────────────

function ShowCard({ show, onClick }: { show: TravelShow; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-48 text-left rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all group"
    >
      {/* 썸네일 */}
      <div className={`h-32 bg-gradient-to-br ${show.gradient} flex flex-col items-center justify-center relative`}>
        <span className="text-5xl">{show.emoji}</span>
        {/* 채널 배지 */}
        <span className="absolute top-2 left-2 text-xs bg-black/40 text-white px-2 py-0.5 rounded-full font-bold">
          {show.channel}
        </span>
        {/* 기간 배지 */}
        <span className="absolute top-2 right-2 text-xs bg-white/30 text-white px-2 py-0.5 rounded-full font-medium">
          {show.duration}
        </span>
      </div>

      {/* 정보 */}
      <div className="bg-white p-3">
        <p className="font-black text-gray-800 text-sm leading-tight truncate">{show.title}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{show.destination}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {show.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

// ─── 상세 모달 ────────────────────────────────────────────────────────────────

function ShowDetailModal({ show, onClose }: { show: TravelShow; onClose: () => void }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState<CreateTripProgress | null>(null);

  const handleStart = async () => {
    setCreating(true);
    setProgress({ stage: "trip" });
    try {
      const parsedDays: AiDay[] = show.days.map((d) => ({
        day: d.day,
        title: d.title,
        activities: d.activities,
      }));

      const tripId = await createTripFromAiPlan(
        {
          destination: show.destination,
          parsedDays,
          title: `[방송 따라하기] ${show.title}`,
        },
        setProgress
      );
      router.push(`/trips/${tripId}/plan`);
    } catch {
      alert("여행 생성 중 오류가 발생했습니다");
    } finally {
      setCreating(false);
      setProgress(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto shadow-2xl">

        {/* 헤더 썸네일 */}
        <div className={`bg-gradient-to-br ${show.gradient} p-8 text-white relative`}>
          <button onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">✕</button>

          <div className="flex items-start gap-4">
            <span className="text-6xl">{show.emoji}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-white/30 px-2 py-0.5 rounded-full font-bold">{show.channel}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{show.duration}</span>
              </div>
              <h2 className="text-2xl font-black leading-tight">{show.title}</h2>
              <p className="text-white/80 text-sm mt-1">{show.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <span className="text-white/70 text-sm">📍 {show.destination}</span>
            <span className="text-white/70 text-sm">🎬 {show.cast}</span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {show.tags.map((tag) => (
              <span key={tag} className="text-xs bg-white/20 text-white px-2.5 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
        </div>

        {/* 내용 */}
        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600 leading-relaxed">{show.description}</p>

          {/* 일별 일정 */}
          <div>
            <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2">
              <span>📅</span> 방송 일정 그대로
            </h3>
            <div className="space-y-4">
              {show.days.map((day) => (
                <div key={day.day} className="border-l-4 border-indigo-400 pl-4">
                  <p className="font-bold text-indigo-700 text-sm">
                    Day {day.day} — {day.title}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {day.activities.map((act, i) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                        <span className="text-indigo-300 mt-0.5 shrink-0">▸</span>
                        {act.replace(/^[•]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* 실행 버튼 */}
          <button
            onClick={handleStart}
            disabled={creating}
            className={`w-full py-4 text-white font-black text-lg rounded-2xl hover:opacity-90 disabled:opacity-60 transition shadow-lg bg-gradient-to-r ${show.gradient} flex items-center justify-center gap-2`}
          >
            {creating ? (
              <>
                <span className="animate-spin">⏳</span>
                <span className="text-sm">
                  {progress?.stage === "trip" && "여행 생성 중..."}
                  {progress?.stage === "memo" && `Day ${progress.day} 일정 저장...`}
                  {progress?.stage === "waypoint" && `Day ${progress.day} 장소 연결...`}
                </span>
              </>
            ) : (
              <>📺 이 일정대로 여행하기</>
            )}
          </button>
          <p className="text-xs text-center text-gray-400">
            실제 방송 일정을 참고해 구성했습니다. 일부 장소는 변경될 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
}
