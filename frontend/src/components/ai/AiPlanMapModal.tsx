"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { loadKakaoMaps } from "@/lib/kakaoLoader";
import { AiDay } from "@/hooks/useAiStream";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface Place {
  activity: string;   // 원본 활동 텍스트
  name: string;       // 지도 검색용 장소명
  lat?: number;
  lng?: number;
  status: "pending" | "ok" | "fail";
}

interface GeoDay {
  day: number;
  title: string;
  places: Place[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  days: AiDay[];
  destination: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8003";
const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "";

// ─── 장소명 추출 ───────────────────────────────────────────────────────────────

function extractPlaceName(activity: string, destination: string): string {
  // 시간 접두사 제거 (오전: / 오후: / 저녁: 등)
  let text = activity.replace(/^(오전|오후|저녁|낮|밤)\s*[:：]\s*/i, "").trim();

  // 이동 관련 동사 이후 제거
  text = text.replace(/\s*(에서\s+)?이동.*/i, "");
  text = text.replace(/\s*(로|으로)\s+이동.*/i, "");
  text = text.replace(/\s*(에서|에)\s+출발.*/i, "");

  // 행동 동사 이전 명사구 추출
  const beforeVerb = text.match(
    /^(.+?)(?:\s+(?:방문|탐방|산책|관람|식사|투어|체험|쇼핑|도착|출발|탑승|체크인|구경|감상|경유|들러|에서|을|를))/
  );
  const name = beforeVerb ? beforeVerb[1].trim() : text.split(/\s+/).slice(0, 3).join(" ");

  // 출발지·목적지 맥락 포함
  return `${name} ${destination}`.trim();
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export default function AiPlanMapModal({ isOpen, onClose, days, destination }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  const [kakaoReady, setKakaoReady] = useState(false);
  const [geoDays, setGeoDays] = useState<GeoDay[]>([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [geocoding, setGeocoding] = useState(false);

  // ── Kakao SDK 로드 ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !APP_KEY) return;
    loadKakaoMaps(APP_KEY, () => setKakaoReady(true));
  }, [isOpen]);

  // ── 장소 지오코딩 ─────────────────────────────────────────────────────────
  const geocodeDays = useCallback(async () => {
    if (!days.length) return;
    setGeocoding(true);

    const token = localStorage.getItem("access_token");
    const headers = { Authorization: `Bearer ${token}` };

    // 초기 상태 설정
    const initial: GeoDay[] = days.map((d) => ({
      day: d.day,
      title: d.title,
      places: d.activities.map((act) => ({
        activity: act,
        name: extractPlaceName(act, destination),
        status: "pending" as const,
      })),
    }));
    setGeoDays(initial);

    // 장소별 순차 검색 (API rate limit 방지)
    const result: GeoDay[] = initial.map((d) => ({ ...d, places: [...d.places] }));

    for (let di = 0; di < result.length; di++) {
      for (let pi = 0; pi < result[di].places.length; pi++) {
        const place = result[di].places[pi];
        try {
          const res = await fetch(
            `${API_URL}/api/maps/search?q=${encodeURIComponent(place.name)}`,
            { headers }
          );
          const data = await res.json();
          const hit = data.results?.[0];
          result[di].places[pi] = hit
            ? { ...place, lat: hit.lat, lng: hit.lng, status: "ok" }
            : { ...place, status: "fail" };
        } catch {
          result[di].places[pi] = { ...place, status: "fail" };
        }
        // 상태 업데이트 (진행 중 표시)
        setGeoDays([...result]);
        await new Promise((r) => setTimeout(r, 150)); // 150ms 딜레이
      }
    }

    setGeocoding(false);
  }, [days, destination]);

  useEffect(() => {
    if (isOpen && days.length > 0) {
      setSelectedDay(0);
      geocodeDays();
    }
  }, [isOpen, days, geocodeDays]);

  // ── 지도 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!kakaoReady || !mapRef.current || !isOpen) return;

    mapRef.current.innerHTML = "";
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: new window.kakao.maps.LatLng(36.5, 127.5),
      level: 8,
    });
    mapInstanceRef.current = map;

    window.kakao.maps.event.addListener(map, "click", () => {
      // 클릭 시 오버레이 닫기 처리 (필요 시)
    });
  }, [kakaoReady, isOpen]);

  // ── 선택 Day 변경 시 지도 업데이트 ────────────────────────────────────────
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current || !geoDays.length) return;

    const map = mapInstanceRef.current;
    // 기존 오버레이 제거
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const currentDay = geoDays[selectedDay];
    if (!currentDay) return;

    const validPlaces = currentDay.places.filter((p) => p.status === "ok" && p.lat && p.lng);
    if (!validPlaces.length) return;

    const bounds = new window.kakao.maps.LatLngBounds();

    validPlaces.forEach((place, idx) => {
      const pos = new window.kakao.maps.LatLng(place.lat!, place.lng!);
      bounds.extend(pos);

      // 번호 마커
      const dot = document.createElement("div");
      dot.style.cssText =
        `width:28px;height:28px;display:flex;align-items:center;justify-content:center;` +
        `background:${getDayColor(currentDay.day)};color:#fff;font-size:12px;font-weight:700;` +
        `border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;`;
      dot.textContent = String(idx + 1);

      const markerOv = new window.kakao.maps.CustomOverlay({
        content: dot, position: pos, xAnchor: 0.5, yAnchor: 0.5, zIndex: 3,
      });
      markerOv.setMap(map);
      overlaysRef.current.push(markerOv);

      // 장소명 라벨
      const label = document.createElement("div");
      label.style.cssText =
        "padding:3px 8px;background:#fff;border-radius:8px;font-size:11px;color:#374151;" +
        "box-shadow:0 1px 4px rgba(0,0,0,0.2);white-space:nowrap;max-width:120px;overflow:hidden;text-overflow:ellipsis;";
      // 원래 활동 텍스트에서 장소명만 표시
      const shortName = place.name.replace(` ${destination}`, "").trim();
      label.textContent = shortName;

      const labelOv = new window.kakao.maps.CustomOverlay({
        content: label, position: pos, xAnchor: 0.5, yAnchor: 2.8, zIndex: 2,
      });
      labelOv.setMap(map);
      overlaysRef.current.push(labelOv);
    });

    // 이동 동선 Polyline
    if (validPlaces.length > 1) {
      const path = validPlaces.map((p) => new window.kakao.maps.LatLng(p.lat!, p.lng!));
      const poly = new window.kakao.maps.Polyline({
        path,
        strokeWeight: 3,
        strokeColor: getDayColor(currentDay.day),
        strokeOpacity: 0.75,
        strokeStyle: "solid",
      });
      poly.setMap(map);
      overlaysRef.current.push(poly);
    }

    // 지도 범위 맞춤
    if (validPlaces.length > 1) {
      map.setBounds(bounds, 80);
    } else if (validPlaces.length === 1) {
      map.setCenter(new window.kakao.maps.LatLng(validPlaces[0].lat!, validPlaces[0].lng!));
      map.setLevel(5);
    }
  }, [kakaoReady, geoDays, selectedDay, destination]);

  if (!isOpen) return null;

  const currentDay = geoDays[selectedDay];
  const validCount = currentDay?.places.filter((p) => p.status === "ok").length ?? 0;
  const totalCount = currentDay?.places.length ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl">

        {/* 헤더 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl">🗺️</span>
            <div>
              <h2 className="font-black text-white">AI 추천 여행 동선</h2>
              <p className="text-indigo-200 text-xs">{destination} · {days.length}일 일정</p>
            </div>
            {geocoding && (
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full animate-pulse">
                📍 장소 검색 중...
              </span>
            )}
          </div>
          <button onClick={onClose}
            className="text-white/70 hover:text-white text-2xl font-light leading-none">✕</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 일정 패널 */}
          <aside className="w-72 shrink-0 border-r flex flex-col overflow-hidden bg-white">
            {/* Day 탭 */}
            <div className="flex overflow-x-auto border-b px-2 py-2 gap-1 shrink-0">
              {geoDays.map((gd, idx) => (
                <button
                  key={gd.day}
                  onClick={() => setSelectedDay(idx)}
                  style={{
                    borderColor: selectedDay === idx ? getDayColor(gd.day) : undefined,
                    background: selectedDay === idx ? getDayColor(gd.day) : undefined,
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap border transition ${
                    selectedDay === idx ? "text-white" : "border-gray-200 text-gray-600 hover:border-indigo-300"
                  }`}
                >
                  Day {gd.day}
                </button>
              ))}
            </div>

            {/* Day 제목 */}
            {currentDay && (
              <div className="px-4 py-2.5 border-b bg-gray-50">
                <p className="font-bold text-gray-800 text-sm">{currentDay.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {validCount}/{totalCount}곳 지도 연결
                  {geocoding && " · 검색 중..."}
                </p>
              </div>
            )}

            {/* 활동 목록 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {currentDay?.places.map((place, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl p-3 border transition ${
                    place.status === "ok"
                      ? "border-indigo-100 bg-indigo-50"
                      : place.status === "fail"
                      ? "border-gray-100 bg-gray-50"
                      : "border-gray-100 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* 번호 배지 */}
                    <span
                      style={{ background: place.status === "ok" ? getDayColor(currentDay.day) : "#9ca3af" }}
                      className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                    >
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-snug">{place.activity}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {place.status === "ok" && (
                          <span className="text-xs text-indigo-500">📍 지도 연결됨</span>
                        )}
                        {place.status === "fail" && (
                          <span className="text-xs text-gray-400">📍 위치 미확인</span>
                        )}
                        {place.status === "pending" && (
                          <span className="text-xs text-gray-300 animate-pulse">검색 중...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!currentDay && (
                <p className="text-sm text-gray-400 text-center mt-8">Day를 선택하세요</p>
              )}
            </div>
          </aside>

          {/* 우측: 지도 */}
          <div className="flex-1 relative">
            {!APP_KEY ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                <span className="text-4xl mb-2">🗺️</span>
                <p className="font-medium">카카오맵 앱키를 설정해주세요</p>
                <p className="text-sm">NEXT_PUBLIC_KAKAO_MAP_APP_KEY</p>
              </div>
            ) : (
              <>
                <div ref={mapRef} className="w-full h-full" />
                {/* 범례 */}
                {currentDay && validCount > 0 && (
                  <div className="absolute bottom-4 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow text-xs space-y-1">
                    <p className="font-bold text-gray-600">Day {currentDay.day} 동선</p>
                    {currentDay.places
                      .filter((p) => p.status === "ok")
                      .map((p, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span
                            style={{ background: getDayColor(currentDay.day) }}
                            className="w-4 h-4 rounded-full text-white text-xs flex items-center justify-center font-bold"
                          >
                            {i + 1}
                          </span>
                          <span className="text-gray-600 max-w-[120px] truncate">
                            {p.name.replace(` ${destination}`, "")}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
                {/* 지오코딩 중 오버레이 */}
                {geocoding && validCount === 0 && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl animate-bounce mb-2">📍</div>
                      <p className="text-gray-600 font-medium">장소를 지도에 연결하는 중...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Day별 색상 (최대 7일)
function getDayColor(day: number): string {
  const colors = [
    "#4f46e5", "#0891b2", "#059669", "#d97706",
    "#dc2626", "#7c3aed", "#db2777",
  ];
  return colors[(day - 1) % colors.length];
}
