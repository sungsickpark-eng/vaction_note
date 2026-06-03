"use client";

import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { user, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗺️</span>
          <h1 className="text-xl font-bold text-indigo-700">여행 일지 다이어리</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
          >
            로그인
          </Link>
          {/* 로그인 없이 바로 앱으로 진입 */}
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            둘러보기
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <main className="flex flex-col items-center justify-center text-center py-20 px-4">
        <span className="text-6xl mb-6">✈️</span>
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          여행을 지도 위에 기록하세요
        </h2>
        <p className="text-xl text-gray-600 mb-6 max-w-2xl">
          구글 지도 위에서 여행 계획부터 실시간 메모, 사진 기록까지 한 번에 관리하는
          <br />
          타임라인 기반 여행 다이어리
        </p>

        {/* 요금제 안내 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 text-sm">
          <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full font-medium">✅ MBTI·AI 추천 무료</span>
          <span className="bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full font-medium">🔐 여행 계획 — 무료 (로그인)</span>
          <span className="bg-amber-100 text-amber-700 px-4 py-1.5 rounded-full font-medium">💳 메모·사진 — 1,000원/여행</span>
        </div>

        <div className="flex gap-4">
          {/* 비로그인 바로 시작 */}
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg"
          >
            로그인 없이 둘러보기 →
          </Link>
          <Link
            href="/login?tab=register"
            className="px-8 py-4 bg-white text-indigo-600 text-lg font-semibold rounded-xl border-2 border-indigo-600 hover:bg-indigo-50 transition shadow"
          >
            무료 회원가입
          </Link>
        </div>
      </main>

      {/* 기능 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-24 max-w-5xl mx-auto">
        {[
          { icon: "🧭", title: "MBTI 여행 추천", desc: "내 성향에 맞는 여행지를 즉시 추천받아요 — 로그인 불필요" },
          { icon: "🎯", title: "미션 여행", desc: "뚜벅이·핸드폰 없이·뽑기 여행 등 14가지 미션 도전" },
          { icon: "📺", title: "방송 여행 따라하기", desc: "삼시세끼·1박2일 등 TV 프로그램 일정 그대로 따라가기" },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
            <span className="text-4xl mb-3 block">{f.icon}</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
            <p className="text-gray-600 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
