"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Waypoint } from "@/types";
import { loadKakaoMaps } from "@/lib/kakaoLoader";

declare global {
  interface Window { kakao: any; }
}

interface PlaceResult {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

interface Props {
  waypoints: Waypoint[];
  center: { lat: number; lng: number };
  onAddPlace?: (place: PlaceResult) => void;
}

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "";

export default function TripMap({ waypoints, center, onAddPlace }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const searchMarkersRef = useRef<any[]>([]);
  const searchOverlaysRef = useRef<any[]>([]);
  const waypointOverlaysRef = useRef<any[]>([]);

  const [kakaoReady, setKakaoReady] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);

  // ── SDK 로드 ──────────────────────────────────────────────────────────────
  useEffect(() => {
    loadKakaoMaps(APP_KEY, () => setKakaoReady(true));
  }, []);

  // ── 지도 초기화 ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!kakaoReady || !mapRef.current) return;

    const validWps = waypoints.filter((wp) => wp.lat != null && wp.lng != null);
    const initCenter =
      validWps.length > 0
        ? new window.kakao.maps.LatLng(validWps[0].lat!, validWps[0].lng!)
        : new window.kakao.maps.LatLng(center.lat, center.lng);

    mapRef.current.innerHTML = "";
    const map = new window.kakao.maps.Map(mapRef.current, {
      center: initCenter,
      level: 5,
    });
    mapInstanceRef.current = map;

    // 지도 클릭 시 인포창 닫기
    window.kakao.maps.event.addListener(map, "click", () => {
      clearSearchOverlays();
      setSelectedPlace(null);
    });

    drawWaypoints(map, validWps);

    if (validWps.length > 1) {
      const bounds = new window.kakao.maps.LatLngBounds();
      validWps.forEach((wp) => bounds.extend(new window.kakao.maps.LatLng(wp.lat!, wp.lng!)));
      map.setBounds(bounds, 60);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kakaoReady]);

  // ── 경유지 변경 시 재렌더 ─────────────────────────────────────────────────
  useEffect(() => {
    if (!kakaoReady || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // 기존 경유지 오버레이 제거
    waypointOverlaysRef.current.forEach((o) => o.setMap(null));
    waypointOverlaysRef.current = [];

    const validWps = waypoints.filter((wp) => wp.lat != null && wp.lng != null);
    drawWaypoints(map, validWps);
  }, [kakaoReady, waypoints]);

  // ── 경유지 마커 그리기 ────────────────────────────────────────────────────
  const drawWaypoints = (map: any, wps: Waypoint[]) => {
    const overlays: any[] = [];

    wps.forEach((wp, idx) => {
      const pos = new window.kakao.maps.LatLng(wp.lat!, wp.lng!);

      // 번호 마커
      const dot = document.createElement("div");
      dot.style.cssText =
        "width:26px;height:26px;display:flex;align-items:center;justify-content:center;" +
        "background:#4f46e5;color:#fff;font-size:11px;font-weight:700;" +
        "border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.35);";
      dot.textContent = String(idx + 1);

      const markerOv = new window.kakao.maps.CustomOverlay({
        content: dot, position: pos, xAnchor: 0.5, yAnchor: 0.5,
      });
      markerOv.setMap(map);
      overlays.push(markerOv);

      // 이름 라벨
      const label = document.createElement("div");
      label.style.cssText =
        "padding:3px 7px;background:#fff;border-radius:6px;font-size:11px;color:#374151;" +
        "box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;";
      label.textContent = wp.place_name;

      const labelOv = new window.kakao.maps.CustomOverlay({
        content: label, position: pos, xAnchor: 0.5, yAnchor: 2.5,
      });
      labelOv.setMap(map);
      overlays.push(labelOv);
    });

    if (wps.length > 1) {
      const poly = new window.kakao.maps.Polyline({
        path: wps.map((wp) => new window.kakao.maps.LatLng(wp.lat!, wp.lng!)),
        strokeWeight: 3, strokeColor: "#4f46e5", strokeOpacity: 0.75, strokeStyle: "solid",
      });
      poly.setMap(map);
      overlays.push(poly);
    }

    waypointOverlaysRef.current = overlays;
  };

  // ── 검색 결과 핀 정리 ─────────────────────────────────────────────────────
  const clearSearchOverlays = useCallback(() => {
    searchMarkersRef.current.forEach((m) => m.setMap(null));
    searchOverlaysRef.current.forEach((o) => o.setMap(null));
    searchMarkersRef.current = [];
    searchOverlaysRef.current = [];
  }, []);

  // ── 장소 검색 ─────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!query.trim() || !mapInstanceRef.current || !kakaoReady) return;
    setSearching(true);
    setSelectedPlace(null);
    clearSearchOverlays();

    const places = new window.kakao.services.Places();
    places.keywordSearch(
      query,
      (data: any[], status: string) => {
        setSearching(false);
        if (status !== window.kakao.services.Status.OK || !data.length) return;

        const map = mapInstanceRef.current;
        const bounds = new window.kakao.maps.LatLngBounds();
        const newMarkers: any[] = [];
        const newOverlays: any[] = [];

        data.slice(0, 8).forEach((place) => {
          const lat = parseFloat(place.y);
          const lng = parseFloat(place.x);
          const pos = new window.kakao.maps.LatLng(lat, lng);
          bounds.extend(pos);

          const placeResult: PlaceResult = {
            place_id: place.id,
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            lat, lng,
          };

          // 검색 결과 핀 (주황)
          const pin = document.createElement("div");
          pin.style.cssText =
            "width:22px;height:22px;display:flex;align-items:center;justify-content:center;" +
            "background:#f97316;color:#fff;font-size:10px;font-weight:700;" +
            "border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;" +
            "transition:transform .15s;";
          pin.textContent = "P";
          pin.onmouseenter = () => { pin.style.transform = "scale(1.2)"; };
          pin.onmouseleave = () => { pin.style.transform = "scale(1)"; };

          const pinOv = new window.kakao.maps.CustomOverlay({
            content: pin, position: pos, xAnchor: 0.5, yAnchor: 0.5, zIndex: 10,
          });
          pinOv.setMap(map);
          newOverlays.push(pinOv);

          // 클릭 → 인포창 표시
          pin.onclick = (e) => {
            e.stopPropagation();
            setSelectedPlace(placeResult);
            showInfoOverlay(map, placeResult, newOverlays);
            map.panTo(pos);
          };

          newMarkers.push({ pos });
        });

        searchMarkersRef.current = newMarkers;
        searchOverlaysRef.current = newOverlays;
        map.setBounds(bounds, 80);
      },
      { size: 8 }
    );
  }, [query, kakaoReady, clearSearchOverlays]);

  // ── 인포창 오버레이 ───────────────────────────────────────────────────────
  const infoOverlayRef = useRef<any>(null);

  const showInfoOverlay = (map: any, place: PlaceResult, overlayList: any[]) => {
    if (infoOverlayRef.current) infoOverlayRef.current.setMap(null);

    const container = document.createElement("div");
    container.style.cssText =
      "background:#fff;border-radius:10px;padding:10px 12px;min-width:160px;" +
      "box-shadow:0 4px 16px rgba(0,0,0,.18);position:relative;font-family:inherit;";

    const name = document.createElement("p");
    name.style.cssText = "font-size:13px;font-weight:700;color:#1f2937;margin:0 0 2px;";
    name.textContent = place.name;

    const addr = document.createElement("p");
    addr.style.cssText = "font-size:11px;color:#6b7280;margin:0 0 8px;";
    addr.textContent = place.address || "";

    const btn = document.createElement("button");
    btn.style.cssText =
      "width:100%;padding:5px 0;background:#4f46e5;color:#fff;border:none;" +
      "border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;";
    btn.textContent = "+ 일정에 추가";
    btn.onclick = (e) => {
      e.stopPropagation();
      onAddPlace?.(place);
      infoOverlayRef.current?.setMap(null);
      setSelectedPlace(null);
    };

    // 닫기 버튼
    const close = document.createElement("button");
    close.style.cssText =
      "position:absolute;top:6px;right:8px;background:none;border:none;" +
      "color:#9ca3af;font-size:14px;cursor:pointer;line-height:1;padding:0;";
    close.textContent = "×";
    close.onclick = (e) => {
      e.stopPropagation();
      infoOverlayRef.current?.setMap(null);
      setSelectedPlace(null);
    };

    container.appendChild(name);
    container.appendChild(addr);
    if (onAddPlace) container.appendChild(btn);
    container.appendChild(close);

    const ov = new window.kakao.maps.CustomOverlay({
      content: container,
      position: new window.kakao.maps.LatLng(place.lat, place.lng),
      xAnchor: 0.5,
      yAnchor: 2.0,
      zIndex: 20,
    });
    ov.setMap(map);
    infoOverlayRef.current = ov;
    overlayList.push(ov);
  };

  // ── 검색어 초기화 ─────────────────────────────────────────────────────────
  const handleClear = () => {
    setQuery("");
    clearSearchOverlays();
    setSelectedPlace(null);
    if (infoOverlayRef.current) infoOverlayRef.current.setMap(null);
  };

  // ── API 키 없을 때 폴백 ───────────────────────────────────────────────────
  if (!APP_KEY) {
    const validPoints = waypoints.filter((wp) => wp.lat != null && wp.lng != null);
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-500">
        <span className="text-4xl mb-4">🗺️</span>
        <p className="font-medium mb-1">카카오 맵 앱키를 설정해주세요</p>
        <p className="text-sm text-gray-400">frontend/.env.local 에서 설정</p>
        {validPoints.length > 0 && (
          <ol className="mt-4 space-y-1">
            {validPoints.map((wp, idx) => (
              <li key={wp.id} className="flex items-center gap-2 text-sm">
                <span className="w-5 h-5 flex items-center justify-center bg-indigo-600 text-white text-xs rounded-full">{idx + 1}</span>
                <span>{wp.place_name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* ── 지도 캔버스 ── */}
      <div ref={mapRef} className="w-full h-full" />

      {/* ── 검색바 (지도 위 플로팅) ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 w-[340px] max-w-[90%]">
        <div className="flex items-center bg-white rounded-full shadow-lg border border-gray-200 overflow-hidden px-1">
          <span className="pl-3 text-gray-400 text-sm">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="지도에서 장소 검색..."
            className="flex-1 py-2.5 px-2 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
          />
          {query && (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 px-2 text-base"
            >
              ✕
            </button>
          )}
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="m-1 px-4 py-1.5 bg-indigo-600 text-white text-sm rounded-full hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            {searching ? "…" : "검색"}
          </button>
        </div>
      </div>

      {/* ── 범례 ── */}
      <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow text-xs text-gray-600">
          <span className="w-3.5 h-3.5 bg-indigo-600 rounded-full inline-block" />
          경유지
        </div>
        {searchMarkersRef.current.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 shadow text-xs text-gray-600">
            <span className="w-3.5 h-3.5 bg-orange-500 rounded-full inline-block" />
            검색 결과
          </div>
        )}
      </div>
    </div>
  );
}
