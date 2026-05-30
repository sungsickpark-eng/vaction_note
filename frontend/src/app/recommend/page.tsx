"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

// ─── MBTI 데이터 ──────────────────────────────────────────────────────────────

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

type Destination = {
  id: string; name: string; region: string; emoji: string;
  tagline: string; description: string; highlights: string[]; vibe_tags: string[];
};
type ItineraryDay = { day: number; title: string; activities: string[] };

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function RecommendPage() {
  const router = useRouter();
  const [selected, setSelected] = useState({ EI: "E", NS: "N", TF: "F", JP: "P" });
  const [step, setStep] = useState<"select" | "loading" | "result">("select");

  // P형 결과
  const [pResult, setPResult] = useState<{ intro: string; destination: Destination } | null>(null);
  const [seenIds, setSeenIds] = useState<string[]>([]);

  // J형 폼
  const [showJForm, setShowJForm] = useState(false);
  const [jForm, setJForm] = useState({ duration: "2박3일", companion: "커플", theme: "자연" });
  const [jResult, setJResult] = useState<{ destination: Destination; itinerary: ItineraryDay[]; meta: Record<string, string> } | null>(null);

  const [error, setError] = useState("");

  const mbti = selected.EI + selected.NS + selected.TF + selected.JP;
  const isP = selected.JP === "P";
  const isJ = selected.JP === "J";

  const handleStart = () => {
    if (isP) fetchSpontaneous();
    else setShowJForm(true);
  };

  const fetchSpontaneous = async (excludeIds: string[] = seenIds) => {
    setStep("loading");
    setError("");
    try {
      const res = await api.post("/api/recommend/spontaneous", { mbti, exclude_ids: excludeIds });
      setPResult(res.data);
      setSeenIds((prev) => [...prev, res.data.destination.id]);
      setStep("result");
    } catch {
      setError("추천을 가져오지 못했습니다. 다시 시도해주세요.");
      setStep("select");
    }
  };

  const fetchPlan = async () => {
    setStep("loading");
    setError("");
    try {
      const res = await api.post("/api/recommend/plan", { mbti, ...jForm });
      setJResult(res.data);
      setShowJForm(false);
      setStep("result");
    } catch {
      setError("일정을 생성하지 못했습니다. 다시 시도해주세요.");
      setStep("select");
    }
  };

  const reset = () => {
    setStep("select");
    setPResult(null);
    setJResult(null);
    setShowJForm(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← 대시보드</Link>
        <h1 className="font-bold text-lg text-purple-700">MBTI 여행 추천</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── MBTI 선택 화면 ── */}
        {step === "select" && !showJForm && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <span className="text-5xl block mb-3">🧭</span>
              <h2 className="text-2xl font-bold text-gray-800">당신의 MBTI는?</h2>
              <p className="text-gray-500 mt-1">성향에 맞는 여행지를 찾아드릴게요</p>
            </div>

            {/* MBTI 토글 */}
            <div className="bg-white rounded-2xl shadow-md p-6 space-y-4">
              {DIMS.map((dim) => (
                <div key={dim.key} className="flex items-center gap-3">
                  <button
                    onClick={() => setSelected((s) => ({ ...s, [dim.key]: dim.left.val }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                      selected[dim.key] === dim.left.val
                        ? "bg-purple-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {dim.left.label}
                    <span className="block text-xs font-normal mt-0.5">{dim.left.desc}</span>
                  </button>
                  <span className="text-gray-300 font-light">↔</span>
                  <button
                    onClick={() => setSelected((s) => ({ ...s, [dim.key]: dim.right.val }))}
                    className={`flex-1 py-3 rounded-xl font-bold text-lg transition-all ${
                      selected[dim.key] === dim.right.val
                        ? "bg-purple-600 text-white shadow-lg scale-105"
                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                    }`}
                  >
                    {dim.right.label}
                    <span className="block text-xs font-normal mt-0.5">{dim.right.desc}</span>
                  </button>
                </div>
              ))}
            </div>

            {/* MBTI 결과 배지 */}
            <div className="bg-white rounded-2xl shadow p-5 text-center">
              <span className="text-4xl font-black text-purple-600 tracking-widest">{mbti}</span>
              <p className="text-gray-500 text-sm mt-2">{MBTI_DESCRIPTIONS[mbti]}</p>
              <div className="mt-3 flex justify-center gap-2">
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${isP ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                  {isP ? "🎲 즉흥 여행형" : "📋 계획 여행형"}
                </span>
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${selected.EI === "I" ? "bg-green-100 text-green-600" : "bg-pink-100 text-pink-600"}`}>
                  {selected.EI === "I" ? "🌿 힐링 여행" : "⚡ 액티브 여행"}
                </span>
              </div>
            </div>

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}

            <button
              onClick={handleStart}
              className="w-full py-4 bg-purple-600 text-white text-lg font-bold rounded-2xl hover:bg-purple-700 active:scale-95 transition-all shadow-lg"
            >
              {isP ? "🎲 지금 당장 추천받기" : "📋 여행 계획 세우기"}
            </button>
          </div>
        )}

        {/* ── J형 폼 ── */}
        {showJForm && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <span className="text-4xl block mb-2">📋</span>
              <h2 className="text-xl font-bold text-gray-800">완벽한 여행을 위해 몇 가지만 알려주세요</h2>
              <p className="text-sm text-gray-500 mt-1">{mbti} 성향에 딱 맞는 일정을 만들어드릴게요</p>
            </div>

            <div className="bg-white rounded-2xl shadow-md p-6 space-y-6">
              <FormSelect
                label="🗓️ 여행 기간"
                options={["당일", "1박2일", "2박3일", "4일이상"]}
                value={jForm.duration}
                onChange={(v) => setJForm((f) => ({ ...f, duration: v }))}
              />
              <FormSelect
                label="👥 동행자"
                options={["혼자", "커플", "친구들", "가족"]}
                value={jForm.companion}
                onChange={(v) => setJForm((f) => ({ ...f, companion: v }))}
              />
              <FormSelect
                label="🎯 여행 테마"
                options={["자연", "문화역사", "맛집", "액티비티"]}
                value={jForm.theme}
                onChange={(v) => setJForm((f) => ({ ...f, theme: v }))}
              />
            </div>

            <button
              onClick={fetchPlan}
              className="w-full py-4 bg-blue-600 text-white text-lg font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg"
            >
              📅 나만의 일정 생성하기
            </button>
            <button onClick={() => setShowJForm(false)} className="w-full text-gray-400 text-sm hover:text-gray-600">
              ← MBTI 다시 선택
            </button>
          </div>
        )}

        {/* ── 로딩 ── */}
        {step === "loading" && (
          <div className="text-center py-24 space-y-4">
            <div className="text-6xl animate-bounce">{isP ? "🎲" : "🗺️"}</div>
            <p className="text-lg font-medium text-gray-700">
              {isP ? "주사위를 굴리는 중..." : "최적 일정을 계산하는 중..."}
            </p>
            <div className="flex justify-center gap-1 mt-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* ── P형 결과 ── */}
        {step === "result" && pResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <p className="text-purple-600 font-medium text-sm mb-1">{mbti} • 즉흥 여행 추천</p>
              <p className="text-gray-600 italic text-sm">"{pResult.intro}"</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-orange-400 to-pink-500 p-8 text-center text-white">
                <span className="text-7xl block mb-3">{pResult.destination.emoji}</span>
                <h3 className="text-4xl font-black">{pResult.destination.name}</h3>
                <p className="text-orange-100 mt-1">{pResult.destination.region}</p>
                <p className="text-white/90 text-lg mt-3 font-medium">{pResult.destination.tagline}</p>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-gray-600 leading-relaxed">{pResult.destination.description}</p>

                <div>
                  <p className="font-bold text-gray-800 mb-2">✨ 지금 바로 할 것</p>
                  <ul className="space-y-2">
                    {pResult.destination.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-5 h-5 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {pResult.destination.vibe_tags.map((tag) => (
                    <span key={tag} className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>

                <button
                  onClick={() => router.push(`/trips/new?region=${pResult.destination.name}`)}
                  className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 transition"
                >
                  🗓️ 이 여행 바로 만들기
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => fetchSpontaneous()}
                className="flex-1 py-3 bg-orange-100 text-orange-600 font-bold rounded-xl hover:bg-orange-200 transition"
              >
                🎲 다른 곳 추천
              </button>
              <button
                onClick={reset}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                ← 처음으로
              </button>
            </div>
          </div>
        )}

        {/* ── J형 결과 ── */}
        {step === "result" && jResult && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center">
              <p className="text-blue-600 font-medium text-sm mb-1">{mbti} • {jResult.meta.companion} · {jResult.meta.duration} · {jResult.meta.theme}</p>
            </div>

            <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-8 text-center text-white">
                <span className="text-7xl block mb-3">{jResult.destination.emoji}</span>
                <h3 className="text-4xl font-black">{jResult.destination.name}</h3>
                <p className="text-blue-100 mt-1">{jResult.destination.region}</p>
                <p className="text-white/90 text-lg mt-3 font-medium">{jResult.destination.tagline}</p>
              </div>

              <div className="p-6 space-y-5">
                <p className="text-gray-600 leading-relaxed">{jResult.destination.description}</p>

                {/* 일정표 */}
                {jResult.itinerary.length > 0 && (
                  <div>
                    <p className="font-bold text-gray-800 mb-3">📅 추천 일정</p>
                    <div className="space-y-4">
                      {jResult.itinerary.map((day) => (
                        <div key={day.day} className="border-l-4 border-blue-500 pl-4">
                          <p className="font-bold text-blue-700 text-sm">Day {day.day} — {day.title}</p>
                          <ul className="mt-1 space-y-1">
                            {day.activities.map((act, i) => (
                              <li key={i} className="text-sm text-gray-600 flex items-start gap-1.5">
                                <span className="text-blue-300 mt-0.5">▸</span>{act}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {jResult.destination.vibe_tags.map((tag) => (
                    <span key={tag} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>

                <button
                  onClick={() => router.push(`/trips/new?region=${jResult.destination.name}`)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition"
                >
                  🗓️ 이 일정으로 여행 만들기
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setStep("select"); setShowJForm(true); setJResult(null); }}
                className="flex-1 py-3 bg-blue-100 text-blue-600 font-bold rounded-xl hover:bg-blue-200 transition"
              >
                🔄 조건 바꿔 다시 추천
              </button>
              <button
                onClick={reset}
                className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                ← 처음으로
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── 하위 컴포넌트 ─────────────────────────────────────────────────────────────

function FormSelect({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              value === opt
                ? "bg-blue-600 text-white shadow"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
