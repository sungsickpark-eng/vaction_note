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
          <Link
            href="/login?tab=register"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            시작하기
          </Link>
        </div>
      </header>

      {/* 히어로 */}
      <main className="flex flex-col items-center justify-center text-center py-24 px-4">
        <span className="text-6xl mb-6">✈️</span>
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          여행을 지도 위에 기록하세요
        </h2>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl">
          구글 지도 위에서 여행 계획부터 실시간 메모, 사진 기록까지 한 번에 관리하는
          <br />
          타임라인 기반 여행 다이어리
        </p>
        <Link
          href="/login?tab=register"
          className="px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-xl hover:bg-indigo-700 transition shadow-lg"
        >
          무료로 시작하기
        </Link>
      </main>

      {/* 기능 카드 */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 px-8 pb-24 max-w-5xl mx-auto">
        {[
          { icon: "📍", title: "지도 기반 계획", desc: "Google Maps에서 장소를 검색하고 이동 경로를 시각화하세요" },
          { icon: "📝", title: "실시간 메모", desc: "이동 중에도 위치 태그와 함께 메모를 빠르게 기록하세요" },
          { icon: "📸", title: "사진 기록", desc: "EXIF GPS 데이터로 사진을 지도에 자동으로 핀 고정하세요" },
        ].map((f) => (
          <div key={f.title} className="bg-white rounded-2xl p-6 shadow-md hover:shadow-lg transition">
            <span className="text-4xl mb-3 block">{f.icon}</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">{f.title}</h3>
            <p className="text-gray-600">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
