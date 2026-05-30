"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "@/lib/api";

function NewTripForm() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    description: "",
    region: "",
    start_date: "",
    end_date: "",
    visibility: "private" as "private" | "link" | "public",
  });
  const [error, setError] = useState("");

  // 쿼리 파라미터로 지역·일정 자동 반영
  useEffect(() => {
    const region = params.get("region") || "";
    const start = params.get("start_date") || "";
    const end = params.get("end_date") || "";
    const mission = params.get("mission") || "";
    const titleParam = params.get("title") || "";

    // 제목 자동 생성
    let autoTitle = "";
    if (region && start && end) {
      const startFmt = start.replace(/-/g, ".").slice(2);
      const endFmt = end.replace(/-/g, ".").slice(2);
      autoTitle = `${region} 여행 (${startFmt} ~ ${endFmt})`;
    } else if (region) {
      autoTitle = `${region} 여행`;
    } else if (titleParam) {
      autoTitle = titleParam;
    }

    if (mission) {
      autoTitle = autoTitle
        ? `[${titleParam || mission}] ${autoTitle}`
        : titleParam || mission;
    }

    setForm((f) => ({
      ...f,
      region: region || f.region,
      start_date: start || f.start_date,
      end_date: end || f.end_date,
      title: autoTitle || f.title,
    }));
  }, [params]);

  const mutation = useMutation({
    mutationFn: (data: typeof form) => tripsApi.create(data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["trips"] });
      router.push(`/trips/${res.data.id}/plan`);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail || "오류가 발생했습니다");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const fromAI = !!(params.get("region") || params.get("start_date"));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
          ← 대시보드
        </Link>
        <h1 className="font-bold text-lg text-gray-800">새 여행 만들기</h1>
        {fromAI && (
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
            🤖 AI 추천 반영됨
          </span>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow p-8 space-y-6">

          {/* AI 반영 안내 배너 */}
          {fromAI && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-sm text-indigo-700 flex items-start gap-2">
              <span className="text-lg shrink-0">🤖</span>
              <p>AI 추천 정보가 자동으로 입력됐어요. 원하시면 수정 후 여행을 만드세요.</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여행 제목 *</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="예: 제주도 3박 4일 가족여행"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여행 지역</label>
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="예: 제주도"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">시작일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">종료일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                min={form.start_date}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">여행 설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="이번 여행에 대한 간단한 설명을 입력하세요"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">공개 여부</label>
            <div className="flex gap-3">
              {(["private", "link", "public"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setForm({ ...form, visibility: v })}
                  className={`flex-1 py-2 text-sm rounded-lg border transition ${
                    form.visibility === v
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "border-gray-300 text-gray-600 hover:border-indigo-400"
                  }`}
                >
                  {v === "private" ? "🔒 나만 보기" : v === "link" ? "🔗 링크 공유" : "🌍 전체 공개"}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link
              href="/dashboard"
              className="flex-1 py-3 text-center border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              취소
            </Link>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {mutation.isPending ? "생성 중..." : "여행 만들기 →"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NewTripPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-400">로딩 중...</div>
    }>
      <NewTripForm />
    </Suspense>
  );
}
