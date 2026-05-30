// Kakao Maps SDK 로드 공용 유틸
// - 이미 로드됐으면 즉시 콜백
// - 로딩 중이면 완료 후 콜백
// - 미로드면 새 script 삽입

const CALLBACKS: Array<() => void> = [];
let state: "idle" | "loading" | "done" = "idle";

export function loadKakaoMaps(appKey: string, onReady: () => void) {
  if (!appKey) return;

  // 이미 완전히 로드된 경우
  if (state === "done" || (window.kakao?.maps?.Map)) {
    state = "done";
    onReady();
    return;
  }

  // 콜백 등록
  CALLBACKS.push(onReady);

  if (state === "loading") return; // 이미 로딩 중 → 콜백만 등록

  state = "loading";

  // kakao 객체는 있지만 maps.load 미실행 상태
  if (window.kakao) {
    window.kakao.maps.load(() => {
      state = "done";
      CALLBACKS.forEach((cb) => cb());
      CALLBACKS.length = 0;
    });
    return;
  }

  // DOM에 이미 스크립트 태그가 있는 경우 (다른 컴포넌트가 삽입함)
  const existing = document.querySelector<HTMLScriptElement>(
    'script[src*="dapi.kakao.com"]'
  );
  if (existing) {
    existing.addEventListener("load", () => {
      window.kakao.maps.load(() => {
        state = "done";
        CALLBACKS.forEach((cb) => cb());
        CALLBACKS.length = 0;
      });
    });
    return;
  }

  // 새로 삽입
  const s = document.createElement("script");
  s.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`;
  s.onload = () => {
    window.kakao.maps.load(() => {
      state = "done";
      CALLBACKS.forEach((cb) => cb());
      CALLBACKS.length = 0;
    });
  };
  document.head.appendChild(s);
}
