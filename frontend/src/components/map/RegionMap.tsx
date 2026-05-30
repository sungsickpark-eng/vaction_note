"use client";

import { useEffect, useRef, useState } from "react";
import { Waypoint } from "@/types";
import { loadKakaoMaps } from "@/lib/kakaoLoader";

declare global {
  interface Window {
    kakao: any;
  }
}

interface Props {
  region?: string;
  waypoints: Waypoint[];
  height?: string;
}

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || "";

export default function RegionMap({ region, waypoints, height = "320px" }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  // Kakao SDK 로드
  useEffect(() => {
    loadKakaoMaps(APP_KEY, () => setReady(true));
  }, []);

  // 지도 그리기
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    const validWps = waypoints.filter((wp) => wp.lat != null && wp.lng != null);

    const initMap = (lat: number, lng: number, level = 7) => {
      if (!mapRef.current) return;
      mapRef.current.innerHTML = "";

      const map = new window.kakao.maps.Map(mapRef.current, {
        center: new window.kakao.maps.LatLng(lat, lng),
        level,
      });

      // 경유지 마커 + 폴리라인
      if (validWps.length > 0) {
        const bounds = new window.kakao.maps.LatLngBounds();

        validWps.forEach((wp, idx) => {
          const pos = new window.kakao.maps.LatLng(wp.lat!, wp.lng!);
          bounds.extend(pos);

          // 번호 마커
          const el = document.createElement("div");
          el.style.cssText =
            "width:26px;height:26px;display:flex;align-items:center;justify-content:center;" +
            "background:#4f46e5;color:#fff;font-size:11px;font-weight:700;" +
            "border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,.3);";
          el.textContent = String(idx + 1);

          new window.kakao.maps.CustomOverlay({
            content: el,
            position: pos,
            xAnchor: 0.5,
            yAnchor: 0.5,
          }).setMap(map);

          // 장소명 말풍선
          const label = document.createElement("div");
          label.style.cssText =
            "padding:3px 7px;background:#fff;border-radius:6px;font-size:11px;color:#374151;" +
            "box-shadow:0 1px 4px rgba(0,0,0,.2);white-space:nowrap;margin-bottom:2px;";
          label.textContent = wp.place_name;

          new window.kakao.maps.CustomOverlay({
            content: label,
            position: pos,
            xAnchor: 0.5,
            yAnchor: 2.6,
          }).setMap(map);
        });

        if (validWps.length > 1) {
          new window.kakao.maps.Polyline({
            path: validWps.map((wp) => new window.kakao.maps.LatLng(wp.lat!, wp.lng!)),
            strokeWeight: 3,
            strokeColor: "#4f46e5",
            strokeOpacity: 0.75,
            strokeStyle: "solid",
          }).setMap(map);
        }

        map.setBounds(bounds, 60);
      }
    };

    if (validWps.length > 0) {
      // 경유지가 있으면 첫 번째 경유지 중심으로 그린 뒤 bounds 맞춤
      initMap(validWps[0].lat!, validWps[0].lng!, 8);
    } else if (region) {
      // 경유지 없으면 지역명 geocoding
      const geocoder = new window.kakao.services.Geocoder();
      geocoder.addressSearch(region, (result: any[], status: string) => {
        if (status === window.kakao.services.Status.OK && result.length > 0) {
          initMap(parseFloat(result[0].y), parseFloat(result[0].x), 8);
        } else {
          // addressSearch 실패 시 keywordSearch로 재시도
          const places = new window.kakao.services.Places();
          places.keywordSearch(region, (data: any[], s: string) => {
            if (s === window.kakao.services.Status.OK && data.length > 0) {
              initMap(parseFloat(data[0].y), parseFloat(data[0].x), 8);
            } else {
              // 최후 fallback: 서울
              initMap(37.5665, 126.978, 8);
            }
          });
        }
      });
    }
  }, [ready, region, waypoints]);

  if (!APP_KEY) return null;

  return (
    <div
      ref={mapRef}
      style={{ height }}
      className="w-full rounded-2xl overflow-hidden shadow-md bg-gray-100"
    />
  );
}
