"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { differenceInDays } from "date-fns";
import { useAiStream } from "@/hooks/useAiStream";
import dynamic from "next/dynamic";
import { createTripFromAiPlan, CreateTripProgress } from "@/lib/createTripFromAiPlan";

const AiPlanMapModal = dynamic(
  () => import("@/components/ai/AiPlanMapModal"),
  { ssr: false }
);

// ─── 데이터 ───────────────────────────────────────────────────────────────────

const DIMS = [
  { key: "EI", left: { val: "E", label: "E", desc: "외향형" }, right: { val: "I", label: "I", desc: "내향형" } },
  { key: "NS", left: { val: "N", label: "N", desc: "직관형" }, right: { val: "S", label: "S", desc: "감각형" } },
  { key: "TF", left: { val: "T", label: "T", desc: "사고형" }, right: { val: "F", label: "F", desc: "감정형" } },
  { key: "JP", left: { val: "J", label: "J", desc: "판단형" }, right: { val: "P", label: "P", desc: "인식형" } },
] as const;

const MBTI_DESCRIPTIONS: Record<string, string> = {
  ISTJ: "계획표 없이는 못 움직이는 당신", ISFJ: "여행지보다 숙소 리뷰 먼저 보는 당신",
  INFJ: "혼자만 아는 숨은 명소 찾는 당신", INTJ: "최적 동선 미리 짜오는 당신",
  ISTP: "즉흥이지만 혼자인 당신", ISFP: "감성 사진 찍으러 떠나는 당신",
  INFP: "여행 에세이 쓰고 싶은 당신", INTP: "독특한 박물관 찾아다니는 당신",
  ESTJ: "여행 리더 자처하는 당신", ESFJ: "일행 모두를 챙기는 당신",
  ENFJ: "여행지에서도 사람 사귀는 당신", ENTJ: "최고 효율 일정 짜는 당신",
  ESTP: "현지인처럼 즉흥적으로 노는 당신", ESFP: "파티 어디서든 만드는 당신",
  ENFP: "버스 잘못 탔지만 더 좋은 곳 발견하는 당신", ENTP: "현지 사람과 대화로 숨은 맛집 찾는 당신",
};

const THEMES = [
  { val: "자연", emoji: "🌿" }, { val: "문화역사", emoji: "🏛️" },
  { val: "맛집", emoji: "🍽️" }, { val: "액티비티", emoji: "⚡" },
  { val: "야경", emoji: "🌃" }, { val: "힐링/스파", emoji: "💆" },
  { val: "드라이브", emoji: "🚗" }, { val: "캠핑", emoji: "⛺" },
  { val: "감성/사진", emoji: "📷" }, { val: "쇼핑", emoji: "🛍️" },
  { val: "축제/이벤트", emoji: "🎪" }, { val: "공연/문화", emoji: "🎭" },
];

type Destination = {
  id: string; name: string; region: string; emoji: string;
  tagline: string; description: string; highlights: string[]; vibe_tags: string[];
};

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function RecommendPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const today = new Date().toISOString().split("T")[0];

  // MBTI 선택
  const [selected, setSelected] = useState({ EI: "E", NS: "N", TF: "F", JP: "P" });
  const mbti = selected.EI + selected.NS + selected.TF + selected.JP;
  const isP = selected.JP === "P";

  // J형 테마 (MBTI 단계에서만)
  const [theme, setTheme] = useState("자연");

  // 추천 결과
  const [destination, setDestination] = useState<Destination | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  // 상세 계획 입력폼
  const [planForm, setPlanForm] = useState({
    origin: "",
    start_date: "",
    end_date: "",
    people: 2,
    budget_per_day: 100000,
    transport: "자가용",
  });

  // AI 계획 결과
  const { text, parsedDays, loading: planLoading, error: planError, stream, reset: resetStream } = useAiStream();
  const planResultRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [createProgress, setCreateProgress] = useState<CreateTripProgress | null>(null);
  const [mapOpen, setMapOpen] = useState(false);

  // 기간 자동 계산
  const duration = planForm.start_date && planForm.end_date
    ? (() => {
        const d = differenceInDays(new Date(planForm.end_date), new Date(planForm.start_date));
        return d === 0 ? "당일" : `${d}박${d + 1}일`;
      })()
    : "";

  // ── MBTI 추천 받기 ────────────────────────────────────────────────────────

  const fetchDestination = async (excludeIds = seenIds) => {
    setRecLoading(true);
    setRecError("");
    resetStream();
    try {
      const params = isP
        ? { mbti, exclude_ids: excludeIds }
        : { mbti, duration: "2박3일", companion: "커플", theme };

      const res = await api.post(
        isP ? "/api/recommend/spontaneous" : "/api/recommend/plan",
        params
      );

      const dest: Destination = isP ? res.data.destination : res.data.destination;
      setDestination(dest);
      if (isP) setSeenIds((prev) => [...prev, dest.id]);
    } catch {
      setRecError("추천을 가져오지 못했습니다. 다시 시도해주세요.");
    } finally {
      setRecLoading(false);
    }
  };

  // ── AI 상세 계획 생성 ─────────────────────────────────────────────────────

  const handleGeneratePlan = async () => {
    if (!destination) return;
    await stream("/api/ai/trip-plan/stream", {
      destination: destination.name,
      origin: planForm.origin,
      start_date: planForm.start_date || undefined,
      end_date: planForm.end_date || undefined,
      duration: duration || "2박3일",
      people: planForm.people,
      budget_per_day: planForm.budget_per_day,
      transport: planForm.transport,
    });
    setTimeout(() => planResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // ── 여행 만들기 ────────────────────────────────────────────────────────────

  const handleCreateTrip = async () => {
    if (!destination) return;
    setCreating(true);
    setCreateProgress({ stage: "trip" });
    try {
      const tripId = await createTripFromAiPlan(
        {
          destination: destination.name,
          startDate: planForm.start_date || undefined,
          endDate: planForm.end_date || undefined,
          parsedDays,
          title: `${destination.name} 여행 (AI 추천)`,
        },
        setCreateProgress
      );
      router.push(`/trips/${tripId}/plan`);
    } catch {
      alert("여행 생성 중 오류가 발생했습니다");
    } finally {
      setCreating(false);
      setCreateProgress(null);
    }
  };

  // ── 렌더 ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      {/* 지도 모달 */}
      {destination && (
        <AiPlanMapModal
          isOpen={mapOpen}
          onClose={() => setMapOpen(false)}
          days={parsedDays}
          destination={destination.name}
        />
      )}

      <header className="bg-white/80 backdrop-blur-sm border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← 대시보드</Link>
        <h1 className="font-bold text-lg text-purple-700">🧭 MBTI 여행 추천</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── STEP 1: MBTI 선택 ── */}
        <section className="bg-white rounded-2xl shadow-md p-6">
          <h2 className="font-bold text-gray-800 mb-4">나의 MBTI</h2>

          <div className="space-y-3 mb-5">
            {DIMS.map((dim) => (
              <div key={dim.key} className="flex items-center gap-2">
                {[dim.left, dim.right].map((opt) => (
                  <button
                    key={opt.val}
                    onClick={() => setSelected((s) => ({ ...s, [dim.key]: opt.val }))}
                    className={`flex-1 py-2.5 rounded-xl font-bold text-base transition-all ${
                      selected[dim.key] === opt.val
                        ? "bg-purple-600 text-white shadow-md scale-105"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {opt.label}
                    <span className="block text-xs font-normal mt-0.5">{opt.desc}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* MBTI 결과 */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
            <span className="text-3xl font-black text-purple-600 tracking-wider">{mbti}</span>
            <div className="flex-1">
              <p className="text-xs text-gray-500">{MBTI_DESCRIPTIONS[mbti]}</p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isP ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                  {isP ? "🎲 즉흥형" : "📋 계획형"}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selected.EI === "I" ? "bg-green-100 text-green-600" : "bg-pink-100 text-pink-600"}`}>
                  {selected.EI === "I" ? "🌿 힐링" : "⚡ 액티브"}
                </span>
              </div>
            </div>
          </div>

          {/* J형: 테마 선택 */}
          {!isP && (
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 mb-2">🎯 선호 테마</p>
              <div className="grid grid-cols-4 gap-1.5">
                {THEMES.map(({ val, emoji }) => (
                  <button
                    key={val}
                    onClick={() => setTheme(val)}
                    className={`py-1.5 px-1 rounded-lg text-xs font-medium transition flex items-center gap-1 justify-center ${
                      theme === val ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-purple-50"
                    }`}
                  >
                    <span>{emoji}</span><span>{val}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => fetchDestination()}
            disabled={recLoading}
            className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 disabled:opacity-50 transition"
          >
            {recLoading ? (
              <span className="flex items-center justify-center gap-2"><span className="animate-spin">🧭</span> 추천 중...</span>
            ) : isP ? "🎲 즉흥 여행지 추천받기" : "🧭 나에게 맞는 여행지 추천받기"}
          </button>
          {recError && <p className="text-red-500 text-xs mt-2 text-center">{recError}</p>}
        </section>

        {/* ── STEP 2: 추천 여행지 카드 + 상세 계획 입력폼 ── */}
        {destination && (
          <>
            {/* 추천 여행지 */}
            <section className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className={`p-6 text-white text-center ${isP ? "bg-gradient-to-br from-orange-400 to-pink-500" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`}>
                <span className="text-6xl block mb-2">{destination.emoji}</span>
                <h3 className="text-3xl font-black">{destination.name}</h3>
                <p className="text-white/80 text-sm mt-1">{destination.region}</p>
                <p className="text-white/90 font-medium mt-2">{destination.tagline}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-gray-600 mb-3">{destination.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {destination.highlights.map((h, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2.5 py-1 rounded-full">✦ {h}</span>
                  ))}
                </div>
                <button
                  onClick={() => fetchDestination()}
                  className="text-xs text-gray-400 hover:text-purple-500 underline"
                >
                  🔄 다른 곳 추천받기
                </button>
              </div>
            </section>

            {/* 상세 계획 입력폼 */}
            <section className="bg-white rounded-2xl shadow-md overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 flex items-center gap-2">
                <span>✨</span>
                <div>
                  <p className="font-black text-white">{destination.name} 상세 여행 계획</p>
                  <p className="text-indigo-200 text-xs">날짜, 인원, 예산을 입력하면 AI가 일정을 짜줍니다</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* 출발지 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">🏠 출발지 (선택)</label>
                  <input
                    value={planForm.origin}
                    onChange={(e) => setPlanForm((f) => ({ ...f, origin: e.target.value }))}
                    placeholder="예: 서울, 대구, 광주..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>

                {/* 여행 일정 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">🗓️ 여행 일정</label>
                  <div className="flex items-center gap-2">
                    <input type="date" value={planForm.start_date} min={today}
                      onChange={(e) => setPlanForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <span className="text-gray-400 text-sm">~</span>
                    <input type="date" value={planForm.end_date} min={planForm.start_date || today}
                      onChange={(e) => setPlanForm((f) => ({ ...f, end_date: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    {duration && (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg shrink-0">{duration}</span>
                    )}
                  </div>
                </div>

                {/* 이동 수단 */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-2">🚗 이동 수단</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: "자가용", emoji: "🚗" }, { val: "렌트카", emoji: "🚙" },
                      { val: "대중교통", emoji: "🚌" }, { val: "도보", emoji: "🚶" },
                    ].map(({ val, emoji }) => (
                      <button
                        key={val}
                        onClick={() => setPlanForm((f) => ({ ...f, transport: val }))}
                        className={`py-2.5 rounded-xl border transition flex flex-col items-center gap-0.5 text-xs font-bold ${
                          planForm.transport === val
                            ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                            : "border-gray-200 text-gray-500 hover:border-indigo-300"
                        }`}
                      >
                        <span className="text-xl">{emoji}</span>{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 인원 + 예산 */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">👥 인원</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setPlanForm((f) => ({ ...f, people: Math.max(1, f.people - 1) }))}
                        className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold">−</button>
                      <span className="flex-1 text-center text-sm font-bold">{planForm.people}명</span>
                      <button onClick={() => setPlanForm((f) => ({ ...f, people: Math.min(20, f.people + 1) }))}
                        className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold">+</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">💰 1인 일 예산</label>
                    <select
                      value={planForm.budget_per_day}
                      onChange={(e) => setPlanForm((f) => ({ ...f, budget_per_day: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      {[30000, 50000, 80000, 100000, 150000, 200000, 300000, 500000].map((v) => (
                        <option key={v} value={v}>{v >= 10000 ? `${v / 10000}만원` : `${v}원`}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 생성 버튼 */}
                <button
                  onClick={handleGeneratePlan}
                  disabled={planLoading}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {planLoading
                    ? <><span className="animate-spin">🤖</span> 계획 생성 중...</>
                    : <><span>🤖</span> AI 여행 계획 추천받기</>}
                </button>
              </div>
            </section>

            {/* ── STEP 3: AI 계획 결과 ── */}
            {(planLoading || text) && (
              <section ref={planResultRef} className="bg-white rounded-2xl shadow-md p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span>🤖</span>
                  <span className="font-bold text-gray-700 text-sm">
                    {destination.name} {duration && `· ${duration}`} · {planForm.people}명 · {planForm.transport}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-[80px]">
                  {!text && planLoading && (
                    <div className="flex items-center gap-2 text-gray-400">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                      <span>여행 계획 생성 중...</span>
                    </div>
                  )}
                  <AiMarkdown text={text} />
                  {planLoading && text && (
                    <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                  )}
                </div>

                {planError && <p className="text-red-500 text-xs mt-2">{planError}</p>}

                {!planLoading && text && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <button
                      onClick={() => setMapOpen(true)}
                      disabled={parsedDays.length === 0}
                      className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-30 transition text-sm"
                    >
                      🗺️ 지도로 확인
                    </button>
                    {user ? (
                      <button
                        onClick={handleCreateTrip}
                        disabled={creating}
                        className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-1"
                      >
                        {creating ? (
                          <>
                            <span className="animate-spin text-base">⏳</span>
                            <span className="text-xs">
                              {createProgress?.stage === "trip" && "여행 생성 중..."}
                              {createProgress?.stage === "memo" && `Day ${createProgress.day} 메모 저장...`}
                              {createProgress?.stage === "waypoint" && `Day ${createProgress.day} 장소 연결...`}
                            </span>
                          </>
                        ) : "🗓️ 여행 만들기"}
                      </button>
                    ) : (
                      <Link
                        href="/login"
                        className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition text-sm flex items-center justify-center"
                      >
                        🔐 로그인 후 여행 만들기
                      </Link>
                    )}
                    <button
                      onClick={handleGeneratePlan}
                      className="py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
                    >
                      🔄 다시 추천
                    </button>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── 마크다운 렌더러 ──────────────────────────────────────────────────────────

function AiMarkdown({ text }: { text: string }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i} className="text-gray-900">{part.slice(2, -2)}</strong>
          : <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
      )}
    </>
  );
}
