"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tripsApi } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { Trip } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (authLoading || !user) return null;

  const trips = data ?? [];
  const ongoing = trips.filter(
    (t) => !t.end_date || new Date(t.end_date) >= new Date()
  );
  const past = trips.filter(
    (t) => t.end_date && new Date(t.end_date) < new Date()
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">🗺️</span>
          <span className="font-bold text-indigo-700">여행 일지 다이어리</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.name}님</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-800"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">내 여행 목록</h2>
          <Link
            href="/trips/new"
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <span>+</span> 새 여행 만들기
          </Link>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-gray-400">불러오는 중...</div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">✈️</span>
            <p className="text-gray-500 mb-4">아직 여행이 없습니다</p>
            <Link
              href="/trips/new"
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              첫 여행 만들기
            </Link>
          </div>
        ) : (
          <>
            {ongoing.length > 0 && (
              <TripSection
                title="진행 중 / 예정"
                trips={ongoing}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            )}
            {past.length > 0 && (
              <TripSection
                title="완료된 여행"
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

function TripSection({
  title,
  trips,
  onDelete,
}: {
  title: string;
  trips: Trip[];
  onDelete: (id: string) => void;
}) {
  return (
    <section className="mb-10">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">{title}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}

function TripCard({ trip, onDelete }: { trip: Trip; onDelete: (id: string) => void }) {
  const router = useRouter();

  const visibilityLabel = {
    private: "🔒 나만 보기",
    link: "🔗 링크 공유",
    public: "🌍 전체 공개",
  }[trip.visibility];

  const dateRange =
    trip.start_date && trip.end_date
      ? `${format(new Date(trip.start_date), "yy.MM.dd", { locale: ko })} ~ ${format(new Date(trip.end_date), "yy.MM.dd", { locale: ko })}`
      : "날짜 미정";

  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition overflow-hidden">
      <div
        className="h-32 bg-gradient-to-br from-indigo-400 to-purple-500 cursor-pointer flex items-center justify-center"
        onClick={() => router.push(`/trips/${trip.id}`)}
      >
        {trip.cover_photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={trip.cover_photo} alt="cover" className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🗺️</span>
        )}
      </div>
      <div className="p-4">
        <h4
          className="font-bold text-gray-800 cursor-pointer hover:text-indigo-600 mb-1"
          onClick={() => router.push(`/trips/${trip.id}`)}
        >
          {trip.title}
        </h4>
        <p className="text-sm text-gray-500">{trip.region || "지역 미정"}</p>
        <p className="text-sm text-gray-400">{dateRange}</p>
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{visibilityLabel}</span>
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/trips/${trip.id}/plan`)}
              className="text-xs px-2 py-1 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
            >
              계획
            </button>
            <button
              onClick={() => {
                if (confirm("이 여행을 삭제하시겠습니까?")) onDelete(trip.id);
              }}
              className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded hover:bg-red-100"
            >
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
