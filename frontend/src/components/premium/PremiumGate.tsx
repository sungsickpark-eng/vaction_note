"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";

interface Props {
  tripId: string;
  onActivated: () => void;
}

export default function PremiumGate({ tripId, onActivated }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/api/trips/${tripId}/premium`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        onActivated();
      } else {
        setError(data.detail || "결제 처리 중 오류가 발생했습니다");
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center space-y-5">
      {/* 잠금 아이콘 */}
      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
        <span className="text-3xl">🔐</span>
      </div>

      {/* 안내 문구 */}
      <div>
        <h3 className="font-black text-gray-800 text-lg mb-1">프리미엄 기능</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          메모·사진 기록 기능은 이 여행에 대해<br />
          <span className="font-bold text-amber-600">1,000원</span>을 결제하면 이용할 수 있어요.
        </p>
      </div>

      {/* 기능 목록 */}
      <div className="bg-amber-50 rounded-xl p-4 text-left space-y-2 w-full max-w-xs">
        {[
          "📝 여행 메모 무제한 작성",
          "📍 위치 태그된 메모 저장",
          "🏷️ 감정 태그 (😊 😴 🍽️ 등)",
          "📸 사진 업로드 및 앨범",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm text-gray-700">
            <span className="text-amber-500">✓</span>
            {item}
          </div>
        ))}
      </div>

      {/* 결제 버튼 */}
      <button
        onClick={handlePayment}
        disabled={loading}
        className="w-full max-w-xs py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg rounded-2xl hover:opacity-90 disabled:opacity-50 transition shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> 처리 중...
          </span>
        ) : (
          "💳 1,000원 결제하고 시작하기"
        )}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <p className="text-xs text-gray-400">
        결제는 이 여행에만 적용됩니다.<br />
        다른 여행은 별도 결제가 필요해요.
      </p>
    </div>
  );
}
