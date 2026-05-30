"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAiStream } from "@/hooks/useAiStream";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type Tab = "recommend" | "mission" | "chat";

interface ChatMsg {
  role: "user" | "ai";
  content: string;
}

const MBTI_LIST = [
  "ISTJ","ISFJ","INFJ","INTJ","ISTP","ISFP","INFP","INTP",
  "ESTJ","ESFJ","ENFJ","ENTJ","ESTP","ESFP","ENFP","ENTP",
];

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function AiTravelPage() {
  const [tab, setTab] = useState<Tab>("recommend");

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← 대시보드</Link>
        <h1 className="font-bold text-lg text-gray-800">🤖 AI 여행 어시스턴트</h1>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium ml-auto">
          GPT-3.5
        </span>
      </header>

      {/* 탭 */}
      <div className="bg-white border-b px-4">
        <div className="flex max-w-2xl mx-auto">
          {([
            { key: "recommend", label: "🧭 여행지 추천", desc: "MBTI 맞춤" },
            { key: "mission", label: "🎯 미션 추천", desc: "AI 미션 생성" },
            { key: "chat", label: "💬 자유 질문", desc: "뭐든 물어봐요" },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-3 text-center transition border-b-2 ${
                tab === t.key
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-sm font-bold block">{t.label}</span>
              <span className="text-xs text-gray-400">{t.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {tab === "recommend" && <RecommendTab />}
        {tab === "mission" && <MissionTab />}
        {tab === "chat" && <ChatTab />}
      </main>
    </div>
  );
}

// ─── 여행지 추천 탭 ───────────────────────────────────────────────────────────

function RecommendTab() {
  const router = useRouter();
  const { text, loading, error, stream, reset } = useAiStream();
  const [form, setForm] = useState({
    mbti: "ENFP",
    duration: "2박3일",
    companion: "커플",
    theme: "자연",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitted(true);
    await stream("/api/ai/recommend/stream", form);
  };

  // 여행지명 파싱 (굵은 텍스트에서 추출)
  const destinationMatch = text.match(/📍\s*\*\*([^\*]+)\*\*/);
  const destination = destinationMatch?.[1]?.split("—")[0]?.trim();

  return (
    <div className="space-y-5">
      {!submitted ? (
        <>
          <div className="bg-white rounded-2xl shadow p-6 space-y-5">
            <h2 className="font-bold text-gray-800 text-lg">나의 정보를 알려주세요</h2>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">MBTI</label>
              <div className="grid grid-cols-4 gap-2">
                {MBTI_LIST.map((m) => (
                  <button
                    key={m}
                    onClick={() => setForm((f) => ({ ...f, mbti: m }))}
                    className={`py-1.5 text-sm rounded-lg font-medium transition ${
                      form.mbti === m
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <OptionGroup
              label="여행 기간"
              options={["당일", "1박2일", "2박3일", "4일이상"]}
              value={form.duration}
              onChange={(v) => setForm((f) => ({ ...f, duration: v }))}
            />
            <OptionGroup
              label="동행자"
              options={["혼자", "커플", "친구들", "가족"]}
              value={form.companion}
              onChange={(v) => setForm((f) => ({ ...f, companion: v }))}
            />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">🎯 여행 테마</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: "자연", emoji: "🌿" },
                  { val: "문화역사", emoji: "🏛️" },
                  { val: "맛집", emoji: "🍽️" },
                  { val: "액티비티", emoji: "⚡" },
                  { val: "야경", emoji: "🌃" },
                  { val: "힐링/스파", emoji: "💆" },
                  { val: "드라이브", emoji: "🚗" },
                  { val: "캠핑", emoji: "⛺" },
                  { val: "감성/사진", emoji: "📷" },
                  { val: "쇼핑", emoji: "🛍️" },
                  { val: "축제/이벤트", emoji: "🎪" },
                  { val: "공연/문화", emoji: "🎭" },
                ].map(({ val, emoji }) => (
                  <button
                    key={val}
                    onClick={() => setForm((f) => ({ ...f, theme: val }))}
                    className={`py-2 px-1 rounded-xl text-xs font-medium transition flex items-center gap-1 justify-center ${
                      form.theme === val
                        ? "bg-indigo-600 text-white shadow"
                        : "bg-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    <span>{emoji}</span><span>{val}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full py-4 bg-indigo-600 text-white font-bold text-lg rounded-2xl hover:bg-indigo-700 transition shadow-lg"
          >
            🤖 AI에게 여행지 추천받기
          </button>
        </>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {form.mbti} · {form.duration} · {form.companion} · {form.theme}
            </div>
            <button onClick={() => { reset(); setSubmitted(false); }}
              className="text-sm text-indigo-500 hover:underline">다시 설정</button>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 min-h-[200px]">
            {loading && !text && (
              <div className="flex items-center gap-3 text-gray-400">
                <span className="text-2xl animate-spin">🤖</span>
                <span>AI가 여행지를 고르는 중...</span>
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            {text && (
              <div className="prose prose-sm max-w-none">
                <AiMarkdown text={text} />
                {loading && <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />}
              </div>
            )}
          </div>

          {text && !loading && (
            <div className="flex gap-3">
              {destination && (
                <button
                  onClick={() => router.push(`/trips/new?region=${encodeURIComponent(destination)}`)}
                  className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition"
                >
                  🗓️ {destination} 여행 만들기
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                🔄 다른 곳 추천
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 미션 추천 탭 ─────────────────────────────────────────────────────────────

const PRESET_MISSIONS = [
  { id: "budget_100k", title: "하루 10만원 여행", desc: "모든 지출을 10만원 이내로 맞추는 미션" },
  { id: "no_phone", title: "핸드폰 없이 여행", desc: "출발과 동시에 전원 OFF" },
  { id: "no_car", title: "뚜벅이 여행", desc: "대중교통+도보로만 이동" },
  { id: "no_map", title: "지도 없이 여행", desc: "오직 현지인에게 물어보기만" },
  { id: "local_food", title: "현지인 추천 맛집만", desc: "SNS 검색 금지, 물어보기만" },
  { id: "random_spin", title: "무작위 뽑기 여행", desc: "목적지·일정 모두 랜덤" },
];

function MissionTab() {
  const { text, loading, error, stream, reset } = useAiStream();
  const [selected, setSelected] = useState<string | null>(null);
  const [mode, setMode] = useState<"preset" | "random_ai">("preset");

  const handlePreset = async (mission: typeof PRESET_MISSIONS[0]) => {
    setSelected(mission.id);
    setMode("preset");
    await stream("/api/ai/mission-tip/stream", {
      mission_title: mission.title,
      mission_desc: mission.desc,
    });
  };

  const handleRandomAi = async () => {
    setSelected("random_ai");
    setMode("random_ai");
    await stream("/api/ai/mission/random-stream", {});
  };

  return (
    <div className="space-y-4">
      {/* AI 랜덤 미션 생성 */}
      <div
        onClick={handleRandomAi}
        className="cursor-pointer bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-5 hover:opacity-90 transition shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">🎲</span>
          <div>
            <p className="font-black text-lg">AI 랜덤 미션 생성</p>
            <p className="text-orange-100 text-sm">AI가 독창적인 미션을 즉석에서 만들어줘요</p>
          </div>
          {loading && selected === "random_ai" && (
            <span className="ml-auto text-2xl animate-spin">🤖</span>
          )}
        </div>
      </div>

      {/* AI 결과 */}
      {text && (
        <div className="bg-white rounded-2xl shadow p-5">
          <p className="text-xs font-bold text-indigo-500 mb-3">
            {mode === "random_ai" ? "🎲 AI가 만든 새 미션" : `🤖 ${PRESET_MISSIONS.find(m=>m.id===selected)?.title} AI 조언`}
          </p>
          <div className="prose prose-sm max-w-none">
            <AiMarkdown text={text} />
            {loading && <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />}
          </div>
          {!loading && (
            <button onClick={reset} className="mt-4 text-sm text-gray-400 hover:text-gray-600">
              × 닫기
            </button>
          )}
        </div>
      )}
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 프리셋 미션 목록 */}
      <p className="text-sm font-bold text-gray-500 mt-2">기존 미션 AI 조언 받기</p>
      <div className="grid grid-cols-1 gap-3">
        {PRESET_MISSIONS.map((m) => (
          <button
            key={m.id}
            onClick={() => handlePreset(m)}
            className={`text-left bg-white rounded-xl shadow-sm border p-4 hover:border-indigo-300 hover:shadow-md transition ${
              selected === m.id && !loading ? "border-indigo-400" : "border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">{m.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
              {selected === m.id && loading ? (
                <span className="text-indigo-400 animate-spin">🤖</span>
              ) : (
                <span className="text-gray-300">→</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── 자유 채팅 탭 ─────────────────────────────────────────────────────────────

function ChatTab() {
  const { text, loading, error, stream, reset } = useAiStream();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [currentAiMsg, setCurrentAiMsg] = useState("");

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, text]);

  const QUICK_QUESTIONS = [
    "혼자 여행하기 좋은 국내 여행지 추천해줘",
    "10만원으로 1박2일 여행 어떻게 짜?",
    "뚜벅이 여행자에게 좋은 도시는?",
    "숙박비 아끼는 팁 알려줘",
  ];

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || loading) return;
    const userMsg = msg.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    // 이전 대화를 context로 전달
    const context = messages.slice(-4).map((m) =>
      `${m.role === "user" ? "사용자" : "AI"}: ${m.content}`
    ).join("\n");

    await stream("/api/ai/chat/stream", { message: userMsg, context });
  };

  // 스트리밍 완료 시 messages에 추가
  useEffect(() => {
    if (!loading && text && text !== currentAiMsg) {
      setCurrentAiMsg(text);
    }
  }, [loading, text]);

  useEffect(() => {
    if (!loading && currentAiMsg) {
      setMessages((prev) => {
        // 마지막이 AI 메시지면 업데이트, 아니면 추가
        if (prev.length && prev[prev.length - 1].role === "ai") {
          return [...prev.slice(0, -1), { role: "ai", content: currentAiMsg }];
        }
        return [...prev, { role: "ai", content: currentAiMsg }];
      });
      reset();
      setCurrentAiMsg("");
    }
  }, [loading]);

  return (
    <div className="flex flex-col gap-4">
      {/* 대화 내역 */}
      <div className="bg-white rounded-2xl shadow min-h-[300px] max-h-[460px] overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="text-center text-gray-400 py-8">
            <span className="text-4xl block mb-2">🤖</span>
            <p className="text-sm">여행에 대해 무엇이든 물어보세요!</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "ai" && <span className="text-lg mr-2 shrink-0 mt-1">🤖</span>}
            <div
              className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              {msg.role === "ai" ? <AiMarkdown text={msg.content} /> : msg.content}
            </div>
          </div>
        ))}

        {/* 스트리밍 중 */}
        {loading && (
          <div className="flex justify-start">
            <span className="text-lg mr-2 shrink-0 mt-1">🤖</span>
            <div className="max-w-[80%] px-4 py-2.5 rounded-2xl bg-gray-100 text-sm text-gray-800 rounded-bl-md">
              {text ? (
                <>
                  <AiMarkdown text={text} />
                  <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
                </>
              ) : (
                <span className="text-gray-400 flex items-center gap-1">
                  생각하는 중
                  {[0,1,2].map(i=><span key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{animationDelay:`${i*0.15}s`}} />)}
                </span>
              )}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 빠른 질문 */}
      {messages.length === 0 && (
        <div className="grid grid-cols-2 gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="text-xs text-left bg-white border border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50 transition text-gray-600"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {/* 입력창 */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="여행 질문을 입력하세요... (Enter로 전송)"
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          전송
        </button>
      </div>
    </div>
  );
}

// ─── 마크다운 렌더러 (간단한 볼드 처리) ──────────────────────────────────────

function AiMarkdown({ text }: { text: string }) {
  // **bold** 처리
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**")
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>
      )}
    </>
  );
}

// ─── 공용 옵션 버튼 ───────────────────────────────────────────────────────────

function OptionGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              value === o ? "bg-indigo-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
