"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Trip } from "@/types";
import { format, differenceInDays } from "date-fns";
import { ko } from "date-fns/locale";
import { useAiStream } from "@/hooks/useAiStream";
import dynamic from "next/dynamic";

const AiPlanMapModal = dynamic(
  () => import("@/components/ai/AiPlanMapModal"),
  { ssr: false }
);

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading: authLoading, logout } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  const { data, isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: () => tripsApi.list().then((r) => r.data as Trip[]),
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tripsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trips"] }),
  });

  if (authLoading || !user) return null;

  const trips = data ?? [];
  const now = new Date();
  const ongoing = trips.filter((t) => !t.end_date || new Date(t.end_date) >= now);
  const past = trips.filter((t) => t.end_date && new Date(t.end_date) < now);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-bold text-indigo-700">여행 일지 다이어리</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.name}님</span>
          <button onClick={() => { logout(); router.push("/"); }}
            className="text-sm text-gray-500 hover:text-gray-800">로그아웃</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* ── 1. AI 여행 계획 추천 입력폼 ── */}
        <TripPlannerForm />

        {/* ── 2. 바로 새 여행 만들기 + 배너 ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">내 여행 목록</h2>
            <Link href="/trips/new"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium">
              + 새 여행 만들기
            </Link>
          </div>

          {/* 배너 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <Link href="/recommend"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl p-3 hover:opacity-90 transition">
              <span className="text-2xl shrink-0">🧭</span>
              <div><p className="font-bold text-sm">MBTI 추천</p><p className="text-purple-100 text-xs">성향 맞춤 여행지</p></div>
            </Link>
            <Link href="/mission"
              className="flex items-center gap-2 bg-gradient-to-r from-gray-800 to-gray-600 text-white rounded-xl p-3 hover:opacity-90 transition">
              <span className="text-2xl shrink-0">🎯</span>
              <div><p className="font-bold text-sm">미션 여행</p><p className="text-gray-300 text-xs">도전과 함께하는 여행</p></div>
            </Link>
            <Link href="/ai-travel"
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl p-3 hover:opacity-90 transition">
              <span className="text-2xl shrink-0">🤖</span>
              <div><p className="font-bold text-sm">AI 어시스턴트</p><p className="text-emerald-100 text-xs">ChatGPT 여행 조언</p></div>
            </Link>
          </div>
        </div>

        {/* ── 3. 진행 중 / 예정 여행 ── */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">불러오는 중...</div>
        ) : trips.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {ongoing.length > 0 && (
              <TripSection
                title="🚀 진행 중 / 예정"
                trips={ongoing}
                variant="ongoing"
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}

            {/* ── 4. 완료된 여행 ── */}
            {past.length > 0 && (
              <CompletedSection
                trips={past}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── AI 여행 계획 입력 폼 ─────────────────────────────────────────────────────

function TripPlannerForm() {
  const router = useRouter();
  const { text, parsedDays, loading, error, stream, reset } = useAiStream();
  const resultRef = useRef<HTMLDivElement>(null);
  const [creating, setCreating] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    start_date: "",
    end_date: "",
    people: 2,
    budget_per_day: 100000,
    transport: "자가용",
  });
  const [submitted, setSubmitted] = useState(false);

  // 기간 자동 계산
  const duration = form.start_date && form.end_date
    ? (() => {
        const days = differenceInDays(new Date(form.end_date), new Date(form.start_date));
        if (days === 0) return "당일";
        return `${days}박${days + 1}일`;
      })()
    : "";

  const handleSubmit = async () => {
    if (!form.destination) { alert("여행지를 입력해주세요"); return; }
    setSubmitted(true);
    await stream("/api/ai/trip-plan/stream", {
      ...form,
      duration: duration || "2박3일",
    });
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  // AI 일정을 반영해서 여행 생성 → 일별 메모 자동 추가
  const handleCreateTrip = async () => {
    setCreating(true);
    try {
      const token = localStorage.getItem("access_token");
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

      // 1. 여행 생성
      const tripRes = await fetch(`${API}/api/trips`, {
        method: "POST", headers,
        body: JSON.stringify({
          title: `${form.destination} 여행 (AI 추천)`,
          region: form.destination,
          start_date: form.start_date || undefined,
          end_date: form.end_date || undefined,
          visibility: "private",
        }),
      });
      const trip = await tripRes.json();
      if (!trip.id) throw new Error("여행 생성 실패");

      // 2. 일별 메모 자동 추가 (parsedDays가 있을 때)
      if (parsedDays.length > 0 && form.start_date) {
        const startDate = new Date(form.start_date);

        for (const day of parsedDays) {
          // 해당 날짜의 TripDay 찾기 (인덱스 기반)
          const dayDate = new Date(startDate);
          dayDate.setDate(startDate.getDate() + (day.day - 1));
          const dateStr = dayDate.toISOString().split("T")[0];

          // 해당 날짜의 trip day ID 가져오기
          const daysRes = await fetch(`${API}/api/trips/${trip.id}/days`, { headers });
          const days = await daysRes.json();
          const tripDay = days.find((d: { date: string; id: string }) => d.date === dateStr);

          // 활동 내용을 메모로 추가
          const content = `📅 Day ${day.day} — ${day.title}\n\n` +
            day.activities.map((a: string) => `• ${a}`).join("\n");

          await fetch(`${API}/api/trips/${trip.id}/memos`, {
            method: "POST", headers,
            body: JSON.stringify({
              content,
              trip_day_id: tripDay?.id || undefined,
            }),
          });
        }
      }

      router.push(`/trips/${trip.id}/plan`);
    } catch (e) {
      console.error(e);
      alert("여행 생성 중 오류가 발생했습니다");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      {/* 지도 모달 */}
      <AiPlanMapModal
        isOpen={mapModalOpen}
        onClose={() => setMapModalOpen(false)}
        days={parsedDays}
        destination={form.destination}
      />

    <section className="bg-white rounded-2xl shadow-md overflow-hidden">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">✨</span>
        <div>
          <h2 className="font-black text-white text-lg">AI 여행 계획 추천</h2>
          <p className="text-indigo-200 text-xs">여행 정보를 입력하면 맞춤 일정을 만들어드려요</p>
        </div>
      </div>

      <div className="p-6">
        {/* 입력 폼 */}
        <div className="space-y-4 mb-4">

          {/* Row 1: 출발지 → 여행지 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">🏠 출발지</label>
              <input
                value={form.origin}
                onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                placeholder="예: 서울, 대구..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">📍 여행지 (목적지)</label>
              <input
                value={form.destination}
                onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                placeholder="예: 제주도, 부산..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Row 2: 여행 일정 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">🗓️ 여행 일정</label>
            <div className="flex items-center gap-2">
              <input
                type="date" value={form.start_date} min={today}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <span className="text-gray-400 text-sm shrink-0">~</span>
              <input
                type="date" value={form.end_date} min={form.start_date || today}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              {duration && (
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg shrink-0">{duration}</span>
              )}
            </div>
          </div>

          {/* Row 3: 이동 수단 */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-2">🚗 이동 수단</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { val: "자가용", emoji: "🚗", desc: "드라이브" },
                { val: "렌트카", emoji: "🚙", desc: "현지 렌트" },
                { val: "대중교통", emoji: "🚌", desc: "기차·버스" },
                { val: "도보", emoji: "🚶", desc: "걸어서" },
              ].map(({ val, emoji, desc }) => (
                <button
                  key={val}
                  onClick={() => setForm((f) => ({ ...f, transport: val }))}
                  className={`py-2.5 rounded-xl border transition flex flex-col items-center gap-0.5 ${
                    form.transport === val
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-indigo-300"
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs font-bold">{val}</span>
                  <span className="text-xs text-gray-400 hidden sm:block">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Row 4: 인원 + 예산 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">👥 인원</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setForm((f) => ({ ...f, people: Math.max(1, f.people - 1) }))}
                  className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold">−</button>
                <span className="flex-1 text-center text-sm font-bold text-gray-800">{form.people}명</span>
                <button onClick={() => setForm((f) => ({ ...f, people: Math.min(20, f.people + 1) }))}
                  className="px-3 py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold">+</button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">💰 1인 일 예산</label>
              <select
                value={form.budget_per_day}
                onChange={(e) => setForm((f) => ({ ...f, budget_per_day: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-2 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                <option value={30000}>3만원</option>
                <option value={50000}>5만원</option>
                <option value={80000}>8만원</option>
                <option value={100000}>10만원</option>
                <option value={150000}>15만원</option>
                <option value={200000}>20만원</option>
                <option value={300000}>30만원</option>
                <option value={500000}>50만원+</option>
              </select>
            </div>
          </div>

        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={loading || !form.destination}
            className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><span className="animate-spin">🤖</span> 계획 생성 중...</>
            ) : (
              <><span>🤖</span> AI 여행 계획 추천받기</>
            )}
          </button>
          {submitted && (
            <button onClick={() => { reset(); setSubmitted(false); }}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition text-sm font-medium">
              초기화
            </button>
          )}
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {/* AI 결과 */}
        {(loading || text) && (
          <div ref={resultRef} className="mt-5 border-t pt-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <span className="font-bold text-gray-700 text-sm">
                {form.destination} {duration && `· ${duration}`} {form.people > 1 && `· ${form.people}명`} · {(form.budget_per_day / 10000).toFixed(0)}만원/인/일
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed min-h-[80px]">
              {!text && loading && (
                <div className="flex items-center gap-2 text-gray-400">
                  {[0,1,2].map(i=>(
                    <span key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                      style={{animationDelay:`${i*0.15}s`}} />
                  ))}
                  <span>여행 계획 생성 중...</span>
                </div>
              )}
              <AiMarkdown text={text} />
              {loading && text && (
                <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>

            {!loading && text && (
              <div className="space-y-3 mt-3">
                {/* 교통 예약 링크 */}
                {(form.transport === "대중교통" || form.transport === "렌트카") && (
                  <BookingLinks transport={form.transport} />
                )}

                {/* 버튼 */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* 지도로 보기 (parsedDays가 있을 때만 활성) */}
                  <button
                    onClick={() => setMapModalOpen(true)}
                    disabled={parsedDays.length === 0}
                    className="py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-30 transition text-sm flex items-center justify-center gap-1.5"
                  >
                    🗺️ 지도로 일정 확인
                  </button>
                  <button
                    onClick={handleCreateTrip}
                    disabled={creating}
                    className="py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition text-sm flex items-center justify-center gap-1.5"
                  >
                    {creating ? (
                      <><span className="animate-spin">⏳</span> 생성 중...</>
                    ) : (
                      <>🗓️ 여행 만들기</>
                    )}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="py-2.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition text-sm font-medium"
                  >
                    🔄 다시 추천
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
    </>
  );
}

// ─── 예약 링크 컴포넌트 ───────────────────────────────────────────────────────

const TRANSPORT_LINKS = [
  { label: "🚆 KTX·기차", url: "https://www.letskorail.com", bg: "bg-red-500", transports: ["대중교통"] },
  { label: "🚄 SRT", url: "https://etk.srail.kr", bg: "bg-blue-600", transports: ["대중교통"] },
  { label: "🚌 고속버스", url: "https://www.kobus.co.kr", bg: "bg-green-600", transports: ["대중교통"] },
  { label: "✈️ 항공권", url: "https://flight.naver.com", bg: "bg-sky-500", transports: ["대중교통", "렌트카"] },
  { label: "🚙 쏘카", url: "https://www.socar.kr", bg: "bg-teal-500", transports: ["렌트카"] },
  { label: "🚙 롯데렌터카", url: "https://www.lotterentacar.net", bg: "bg-red-600", transports: ["렌트카"] },
];

const HOTEL_LINKS = [
  { label: "🏨 야놀자", url: "https://www.yanolja.com", bg: "bg-pink-500" },
  { label: "🏩 여기어때", url: "https://www.goodchoice.kr", bg: "bg-purple-500" },
  { label: "🏠 에어비앤비", url: "https://www.airbnb.co.kr", bg: "bg-rose-500" },
  { label: "🌐 부킹닷컴", url: "https://www.booking.com", bg: "bg-blue-700" },
  { label: "🏷️ 호텔스닷컴", url: "https://www.hotels.com", bg: "bg-red-700" },
  { label: "🗺️ 트립닷컴", url: "https://www.trip.com/ko", bg: "bg-cyan-600" },
];

function BookingLinks({ transport }: { transport: string }) {
  const filteredTransport = TRANSPORT_LINKS.filter((l) => l.transports.includes(transport));
  return (
    <div className="space-y-3">
      {filteredTransport.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <p className="text-xs font-bold text-blue-700 mb-2">
            {transport === "렌트카" ? "🚙 렌트카·항공 예약" : "🚌 교통편 예약 바로가기"}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {filteredTransport.map(({ label, url, bg }) => (
              <a key={url} href={url} target="_blank" rel="noopener noreferrer"
                className={`${bg} text-white text-xs font-bold py-2 px-2 rounded-lg text-center hover:opacity-90 transition`}>
                {label}
              </a>
            ))}
          </div>
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
        <p className="text-xs font-bold text-amber-700 mb-2">🏨 숙박 예약 바로가기</p>
        <div className="grid grid-cols-3 gap-2">
          {HOTEL_LINKS.map(({ label, url, bg }) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer"
              className={`${bg} text-white text-xs font-bold py-2 px-1 rounded-lg text-center hover:opacity-90 transition`}>
              {label}
            </a>
          ))}
        </div>
      </div>
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

// ─── 진행 중 섹션 ─────────────────────────────────────────────────────────────

function TripSection({ title, trips, variant, onDelete }: {
  title: string; trips: Trip[]; variant: "ongoing" | "past"; onDelete: (id: string) => void;
}) {
  return (
    <section>
      <h3 className="text-lg font-bold text-gray-700 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} variant={variant} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

// ─── 완료된 여행 섹션 ─────────────────────────────────────────────────────────

function CompletedSection({ trips, onDelete }: {
  trips: Trip[]; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? trips : trips.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-gray-700">✅ 완료된 여행</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
            {trips.length}개
          </span>
        </div>
        {trips.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-sm text-indigo-500 hover:underline"
          >
            {expanded ? "접기 ↑" : `더 보기 +${trips.length - 3}`}
          </button>
        )}
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: "총 여행 횟수", value: `${trips.length}회`, emoji: "✈️" },
          {
            label: "총 여행 일수",
            value: `${trips.reduce((acc, t) => {
              if (!t.start_date || !t.end_date) return acc;
              return acc + differenceInDays(new Date(t.end_date), new Date(t.start_date)) + 1;
            }, 0)}일`,
            emoji: "📅",
          },
          {
            label: "방문 지역",
            value: `${new Set(trips.map((t) => t.region).filter(Boolean)).size}곳`,
            emoji: "📍",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-3 text-center shadow-sm border">
            <span className="text-xl block mb-1">{stat.emoji}</span>
            <p className="font-black text-gray-800 text-lg">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((trip) => (
          <TripCard key={trip.id} trip={trip} variant="past" onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

// ─── 여행 카드 ────────────────────────────────────────────────────────────────

function TripCard({ trip, variant, onDelete }: {
  trip: Trip; variant: "ongoing" | "past"; onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const isPast = variant === "past";

  const dateRange = trip.start_date && trip.end_date
    ? `${format(new Date(trip.start_date), "yy.MM.dd", { locale: ko })} ~ ${format(new Date(trip.end_date), "yy.MM.dd", { locale: ko })}`
    : "날짜 미정";

  const duration = trip.start_date && trip.end_date
    ? `${differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1}일`
    : null;

  // D-Day 계산
  const dday = trip.start_date
    ? (() => {
        const diff = differenceInDays(new Date(trip.start_date), new Date());
        if (diff === 0) return "D-Day";
        if (diff > 0) return `D-${diff}`;
        return null;
      })()
    : null;

  return (
    <div className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden ${isPast ? "opacity-80" : ""}`}>
      {/* 썸네일 */}
      <div
        className={`h-28 cursor-pointer flex items-center justify-center relative ${
          isPast
            ? "bg-gradient-to-br from-gray-300 to-gray-400"
            : "bg-gradient-to-br from-indigo-400 to-purple-500"
        }`}
        onClick={() => router.push(`/trips/${trip.id}`)}
      >
        {trip.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_photo} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">{isPast ? "📸" : "🗺️"}</span>
        )}

        {/* 배지 */}
        <div className="absolute top-2 right-2 flex gap-1">
          {isPast && (
            <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">완료</span>
          )}
          {!isPast && dday && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              dday === "D-Day" ? "bg-red-500 text-white animate-pulse" : "bg-white/90 text-indigo-700"
            }`}>{dday}</span>
          )}
          {duration && (
            <span className="text-xs bg-black/40 text-white px-2 py-0.5 rounded-full">{duration}</span>
          )}
        </div>
      </div>

      {/* 내용 */}
      <div className="p-4">
        <h4
          className="font-bold text-gray-800 cursor-pointer hover:text-indigo-600 truncate mb-0.5"
          onClick={() => router.push(`/trips/${trip.id}`)}
        >
          {trip.title}
        </h4>
        <p className="text-xs text-gray-500">{trip.region || "지역 미정"}</p>
        <p className="text-xs text-gray-400 mt-0.5">{dateRange}</p>

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-300">
            {{ private: "🔒", link: "🔗", public: "🌍" }[trip.visibility]}
          </span>
          <div className="flex gap-1.5">
            {!isPast && (
              <button
                onClick={() => router.push(`/trips/${trip.id}/plan`)}
                className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium"
              >
                계획
              </button>
            )}
            <button
              onClick={() => router.push(`/trips/${trip.id}`)}
              className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 font-medium"
            >
              보기
            </button>
            <button
              onClick={() => { if (confirm("삭제하시겠습니까?")) onDelete(trip.id); }}
              className="text-xs px-2 py-1 bg-red-50 text-red-400 rounded-lg hover:bg-red-100 font-medium"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 빈 상태 ─────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-16">
      <span className="text-5xl block mb-4">✈️</span>
      <p className="text-gray-500 mb-2 font-medium">아직 여행이 없습니다</p>
      <p className="text-gray-400 text-sm mb-6">위 폼에서 AI 여행 계획을 추천받거나 새 여행을 만들어보세요</p>
      <Link href="/trips/new"
        className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-bold">
        첫 여행 만들기
      </Link>
    </div>
  );
}
