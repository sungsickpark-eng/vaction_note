"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── 미션 데이터 ──────────────────────────────────────────────────────────────

type Difficulty = 1 | 2 | 3;
type Category = "전체" | "예산" | "이동수단" | "디지털디톡스" | "랜덤" | "도전";

interface Mission {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  category: Exclude<Category, "전체">;
  difficulty: Difficulty;
  description: string;
  rules: string[];
  tips: string[];
  clearCondition: string;
  color: string;       // tailwind gradient
  textColor: string;
  isRandom?: boolean;
}

const MISSIONS: Mission[] = [
  // 예산
  {
    id: "budget_100k",
    emoji: "🪙",
    title: "하루 10만원 여행",
    subtitle: "교통·숙박·식비 포함 10만원 이내",
    category: "예산",
    difficulty: 2,
    description: "모든 지출(교통+숙박+식비+입장료)을 하루 10만원 이내로 맞추는 미션. 알뜰하게 최고의 여행을 만들어보세요.",
    rules: [
      "출발지에서 목적지까지 왕복 교통비 포함",
      "숙박, 식비, 입장료 등 모든 지출 합산",
      "영수증을 모두 보관하고 기록할 것",
      "신용카드 포인트·마일리지 사용 금지",
    ],
    tips: [
      "무료 숙박: 지인 집, 카우치서핑, 캠핑",
      "무료 명소 우선 탐방",
      "편의점·마트 도시락으로 식비 절약",
      "조기 예매로 교통비 50% 절약 가능",
    ],
    clearCondition: "총 지출이 10만원 이하임을 영수증으로 증명",
    color: "from-yellow-400 to-orange-400",
    textColor: "text-yellow-600",
  },
  {
    id: "cash_only",
    emoji: "💵",
    title: "현금만 사용하기",
    subtitle: "카드·페이·앱 결제 완전 금지",
    category: "예산",
    difficulty: 2,
    description: "여행 내내 현금만 사용하는 미션. 지출에 더 민감해지고, 예산 감각을 완전히 새롭게 경험할 수 있어요.",
    rules: [
      "카드·카카오페이·네이버페이 등 일체 사용 금지",
      "출발 전 현금 인출 후 ATM 재사용 불가",
      "교통카드 대신 현금으로 버스·지하철 탑승",
    ],
    tips: [
      "출발 전 예산보다 20% 더 인출해두기",
      "동전 지갑 따로 챙기기",
      "현금 분실 대비 두 곳에 나눠 보관",
    ],
    clearCondition: "여행 종료까지 카드 결제 0건 유지",
    color: "from-green-400 to-teal-400",
    textColor: "text-green-600",
  },
  {
    id: "free_only",
    emoji: "🆓",
    title: "무료 명소만 여행",
    subtitle: "입장료가 있는 곳은 절대 들어가지 않기",
    category: "예산",
    difficulty: 3,
    description: "돈을 내고 들어가는 명소는 전부 패스! 무료 공원·해변·골목·재래시장·뷰포인트만으로 알찬 여행을 만드세요.",
    rules: [
      "입장료가 있는 박물관·테마파크·유료 전망대 출입 금지",
      "무료 관람일·무료 입장 행사는 허용",
      "식비·교통비·숙박비는 제한 없음",
    ],
    tips: [
      "국공립 공원, 해변, 강변 산책로 적극 활용",
      "재래시장·골목 탐방으로 현지 감성 체험",
      "무료 문화 행사·버스킹 찾아보기",
    ],
    clearCondition: "여행 중 유료 입장 0회",
    color: "from-emerald-400 to-cyan-400",
    textColor: "text-emerald-600",
  },

  // 이동수단
  {
    id: "no_car",
    emoji: "🚌",
    title: "뚜벅이 여행",
    subtitle: "택시·렌트카 없이 대중교통+도보만",
    category: "이동수단",
    difficulty: 2,
    description: "택시와 자가용 없이 오직 버스·지하철·도보로만 이동하는 미션. 느리게 걸을수록 더 많은 것을 발견하게 됩니다.",
    rules: [
      "택시·렌트카·카셰어링 이용 금지",
      "대중교통(버스, 지하철, 기차, 배) + 도보만 허용",
      "자전거 대여는 허용",
    ],
    tips: [
      "네이버지도·카카오맵 대중교통 모드 적극 활용",
      "1일 교통카드로 비용 절약",
      "걸을 수 있는 거리는 무조건 걷기 — 의외의 발견이 생겨요",
    ],
    clearCondition: "여행 중 택시·렌트카 이용 0회",
    color: "from-blue-400 to-indigo-400",
    textColor: "text-blue-600",
  },
  {
    id: "bicycle",
    emoji: "🚲",
    title: "자전거 여행",
    subtitle: "목적지까지의 모든 이동을 자전거로",
    category: "이동수단",
    difficulty: 3,
    description: "자전거 한 대로 여행지를 구석구석 누비는 미션. 속도와 바람을 직접 몸으로 느끼는 특별한 경험이에요.",
    rules: [
      "주요 이동 수단은 자전거여야 함",
      "공영자전거(따릉이 등) 또는 자전거 대여 허용",
      "장거리 이동(100km 이상)은 기차 허용, 단 자전거 탑재",
    ],
    tips: [
      "국토종주 자전거길, 한강 자전거길 추천",
      "헬멧·장갑 필수 착용",
      "스마트폰 거치대로 지도 보며 달리기",
      "중간 휴식지를 미리 파악해두기",
    ],
    clearCondition: "하루 최소 20km 이상 자전거로 이동",
    color: "from-lime-400 to-green-400",
    textColor: "text-lime-600",
  },
  {
    id: "no_map",
    emoji: "🗺️",
    title: "지도 없이 여행",
    subtitle: "길 잃어도 OK — 오직 물어보기만",
    category: "이동수단",
    difficulty: 3,
    description: "내비·지도 앱 사용 금지! 현지인에게 직접 길을 물어보며 여행하세요. 예상치 못한 만남과 장소를 발견하게 됩니다.",
    rules: [
      "여행 중 지도 앱·내비게이션 사용 금지",
      "출발 전 목적지 이름만 메모 허용",
      "길은 현지인·가게 직원에게 직접 물어볼 것",
    ],
    tips: [
      "\"이 동네에서 제일 맛있는 집이 어디예요?\" 한 마디가 최고의 가이드",
      "한국어로 길 묻는 연습 미리 해두기",
      "목적지 한자/영문명 메모해두면 외국인에게도 물어볼 수 있음",
    ],
    clearCondition: "지도 앱 없이 목적지 3곳 이상 찾아가기",
    color: "from-amber-400 to-yellow-400",
    textColor: "text-amber-600",
  },

  // 디지털 디톡스
  {
    id: "no_phone",
    emoji: "📵",
    title: "핸드폰 없이 여행",
    subtitle: "출발과 동시에 전원 OFF",
    category: "디지털디톡스",
    difficulty: 3,
    description: "스마트폰을 완전히 꺼두고 아날로그로만 여행하는 최강 디톡스 미션. 세상과 단절된 진짜 자유를 느껴보세요.",
    rules: [
      "여행 시작부터 끝까지 스마트폰 전원 OFF",
      "긴급 상황(부상·분실)에만 한시적 사용 허용",
      "종이 지도·여행 가이드북 사전 준비 필수",
      "숙소 체크인 등 필수 예약은 출발 전 완료",
    ],
    tips: [
      "여행 전날 숙소·교통 예약 및 지도 인쇄 필수",
      "비상 연락처는 종이에 적어 지갑에 보관",
      "필름 카메라로 사진 찍기",
      "여행 노트에 손으로 일기 쓰기",
    ],
    clearCondition: "여행 내내 스마트폰 미사용 — 동행자나 숙소 직원이 증언",
    color: "from-purple-400 to-violet-400",
    textColor: "text-purple-600",
  },
  {
    id: "no_photo",
    emoji: "👁️",
    title: "사진 없이 여행",
    subtitle: "카메라 없이 눈으로만 담기",
    category: "디지털디톡스",
    difficulty: 2,
    description: "사진 찍는 데 집중하지 말고, 오감으로 느끼는 여행. 사진 없이 돌아와도 기억이 훨씬 생생하게 남습니다.",
    rules: [
      "스마트폰·디지털카메라로 사진 촬영 금지",
      "타인이 찍어주는 것도 금지",
      "여행 중 느낀 것은 글·그림으로 기록",
    ],
    tips: [
      "작은 스케치북에 그림일기 그려보기",
      "엽서·스티커·영수증 등 실물 수집",
      "\"이 장면을 어떻게 글로 표현할까\" 생각하며 보기",
    ],
    clearCondition: "여행 후 스케치북 또는 손글씨 일기 1권 완성",
    color: "from-pink-400 to-rose-400",
    textColor: "text-pink-600",
  },
  {
    id: "no_sns",
    emoji: "🌐",
    title: "SNS 끊기 여행",
    subtitle: "인스타·유튜브·틱톡 삭제 후 출발",
    category: "디지털디톡스",
    difficulty: 1,
    description: "SNS 없이 나만의 여행을 즐기는 미션. 남들이 가는 핫플 말고, 내 본능이 끌리는 곳으로.",
    rules: [
      "출발 전 SNS 앱 전부 삭제 또는 로그아웃",
      "카카오톡 등 메신저는 허용",
      "여행 중 인스타·유튜브 검색 금지",
      "귀가 후 SNS 복구 가능",
    ],
    tips: [
      "\"핫플\" 대신 골목, 재래시장, 동네 카페 탐방",
      "SNS 없이 발견한 보석 같은 장소가 제일 오래 기억됨",
      "여행 후 SNS 하이라이트 영상 만들어보기",
    ],
    clearCondition: "여행 기간 동안 SNS 게시물 0개 업로드",
    color: "from-sky-400 to-blue-400",
    textColor: "text-sky-600",
  },

  // 랜덤
  {
    id: "random_spin",
    emoji: "🎲",
    title: "무작위 뽑기 여행",
    subtitle: "목적지·숙박·일정 모두 랜덤으로",
    category: "랜덤",
    difficulty: 2,
    description: "아무것도 정하지 마세요. 지금 뽑아드릴게요. 완전한 무작위로 결정된 여행지로 떠나는 진짜 즉흥 여행.",
    rules: [
      "이 앱이 뽑아주는 목적지를 반드시 따를 것",
      "마음에 안 든다고 다시 뽑기 금지",
      "숙소는 도착 후 현장에서 결정",
    ],
    tips: [
      "여행 가방은 항상 준비되어 있는 상태로",
      "현금과 충전기만 챙기면 OK",
      "예상 못 한 곳이 제일 기억에 남아요",
    ],
    clearCondition: "뽑힌 여행지로 실제 출발",
    color: "from-orange-400 to-red-400",
    textColor: "text-orange-600",
    isRandom: true,
  },
  {
    id: "last_stop",
    emoji: "🚌",
    title: "버스 종점 여행",
    subtitle: "무작위 버스를 타고 종점까지",
    category: "랜덤",
    difficulty: 2,
    description: "집 근처에서 처음 보이는 버스를 타고 종점까지 가는 미션. 종점에서 발견하는 동네가 오늘의 여행지.",
    rules: [
      "집 근처 정류장에서 먼저 오는 버스 탑승",
      "종점에서 하차 후 그 동네만 탐방",
      "중간에 내리거나 다른 버스로 환승 금지",
    ],
    tips: [
      "2~3시간 여유 갖기",
      "종점 도착 후 \"이 동네 뭐가 유명해요?\" 한 마디",
      "예상 못 한 발견이 진짜 여행의 묘미",
    ],
    clearCondition: "종점에서 2시간 이상 탐방 완료",
    color: "from-teal-400 to-cyan-400",
    textColor: "text-teal-600",
  },

  // 도전
  {
    id: "24h",
    emoji: "⏰",
    title: "24시간 여행",
    subtitle: "딱 24시간 안에 모든 것을 끝내기",
    category: "도전",
    difficulty: 3,
    description: "출발부터 귀가까지 정확히 24시간. 짧은 시간 안에 최대한 많이 경험하는 스피드 여행 미션.",
    rules: [
      "출발 시각부터 24시간 이내 귀가",
      "타임스탬프(사진·영수증)로 시간 기록",
      "출발·귀가 시각 스크린샷 필수",
    ],
    tips: [
      "이동이 짧은 근거리 여행 추천",
      "새벽 출발 — 새벽 귀가로 낮 시간 최대 활용",
      "맛집은 미리 리스트업해두기",
    ],
    clearCondition: "24시간 이내 여행 완주 + 타임라인 기록",
    color: "from-red-400 to-rose-400",
    textColor: "text-red-600",
  },
  {
    id: "local_food",
    emoji: "🍽️",
    title: "현지인 추천 맛집만",
    subtitle: "SNS·블로그 검색 금지, 물어보기만",
    category: "도전",
    difficulty: 2,
    description: "네이버·인스타 맛집 검색 금지! 현지 주민·숙소 주인·택시 기사에게 직접 물어봐서 찾은 곳만 먹는 미션.",
    rules: [
      "인터넷 맛집 검색 완전 금지",
      "현지인(주민·직원·기사)에게 최소 3번 이상 추천받아 식당 결정",
      "추천 받은 장소와 추천해준 사람 기록",
    ],
    tips: [
      "\"이 동네 오래 사셨어요? 단골 식당이 어디에요?\" 가 최고의 질문",
      "현지인들이 많은 재래시장 먼저 공략",
      "외진 골목의 허름한 곳일수록 진짜 맛집인 경우가 많아요",
    ],
    clearCondition: "모든 식사를 현지인 추천으로만 해결",
    color: "from-amber-400 to-orange-400",
    textColor: "text-amber-600",
  },
  {
    id: "diary",
    emoji: "✍️",
    title: "손글씨 여행 일기",
    subtitle: "모든 순간을 손으로 기록하기",
    category: "도전",
    difficulty: 1,
    description: "여행 중 본 것·느낀 것·먹은 것·만난 사람을 모두 손으로 적는 미션. 세상에서 가장 느리고 가장 아름다운 기록.",
    rules: [
      "노트와 펜 반드시 지참",
      "하루 최소 A5 1페이지 이상 손글씨로 기록",
      "메뉴판·영수증·티켓 등 실물 수집해 붙이기",
    ],
    tips: [
      "스티커·색연필로 꾸미면 더 재미있어요",
      "날씨·온도·냄새까지 메모",
      "만난 사람에게 한 마디씩 써달라고 부탁해보기",
    ],
    clearCondition: "여행 노트 1권 완성 후 SNS 공유",
    color: "from-violet-400 to-purple-400",
    textColor: "text-violet-600",
  },
];

const CATEGORIES: Category[] = ["전체", "예산", "이동수단", "디지털디톡스", "랜덤", "도전"];
const DIFF_LABELS: Record<Difficulty, string> = { 1: "쉬움", 2: "보통", 3: "어려움" };

// 무작위 뽑기용 여행지
const RANDOM_DESTINATIONS = [
  { name: "강릉", region: "강원", emoji: "🏄", vibe: "서핑과 커피" },
  { name: "경주", region: "경북", emoji: "🏛️", vibe: "천년 고도 탐방" },
  { name: "전주", region: "전북", emoji: "🏯", vibe: "한옥마을 맛집" },
  { name: "통영", region: "경남", emoji: "⛵", vibe: "한국의 나폴리" },
  { name: "담양", region: "전남", emoji: "🎋", vibe: "대나무숲 힐링" },
  { name: "속초", region: "강원", emoji: "🏔️", vibe: "산과 바다" },
  { name: "여수", region: "전남", emoji: "🌙", vibe: "밤바다 야경" },
  { name: "제천", region: "충북", emoji: "🌿", vibe: "청풍호 드라이브" },
  { name: "남해", region: "경남", emoji: "🏝️", vibe: "조용한 섬 힐링" },
  { name: "군산", region: "전북", emoji: "🕰️", vibe: "근대 역사 골목" },
  { name: "영월", region: "강원", emoji: "⭐", vibe: "별 관측 힐링" },
  { name: "보성", region: "전남", emoji: "🍵", vibe: "녹차밭 감성" },
  { name: "평창", region: "강원", emoji: "🐑", vibe: "고원 목장 드라이브" },
  { name: "춘천", region: "강원", emoji: "🦢", vibe: "닭갈비와 호수" },
  { name: "포항", region: "경북", emoji: "🦞", vibe: "대게와 일출" },
  { name: "울산", region: "울산", emoji: "🦢", vibe: "태화강 힐링" },
  { name: "인천", region: "인천", emoji: "🏮", vibe: "차이나타운 탐방" },
  { name: "대전", region: "대전", emoji: "🍰", vibe: "성심당과 과학공원" },
  { name: "합천", region: "경남", emoji: "📿", vibe: "해인사 고요함" },
  { name: "해남", region: "전남", emoji: "🌅", vibe: "땅끝마을 새 시작" },
  { name: "순천", region: "전남", emoji: "🌾", vibe: "갈대밭 국가정원" },
  { name: "부산", region: "부산", emoji: "🌊", vibe: "해운대와 나이트라이프" },
  { name: "제주", region: "제주", emoji: "🌋", vibe: "무한 액티비티의 섬" },
];

// ─── 메인 ────────────────────────────────────────────────────────────────────

export default function MissionPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<Category>("전체");
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showRandom, setShowRandom] = useState(false);

  const filtered = activeCategory === "전체"
    ? MISSIONS
    : MISSIONS.filter((m) => m.category === activeCategory);

  const handleMissionClick = (mission: Mission) => {
    if (mission.isRandom) {
      setShowRandom(true);
    } else {
      setSelectedMission(mission);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 text-sm">← 대시보드</Link>
        <h1 className="font-bold text-lg text-gray-800">🎯 미션 여행</h1>
      </header>

      {/* 히어로 */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-700 text-white px-6 py-12 text-center">
        <span className="text-5xl block mb-3">🎯</span>
        <h2 className="text-3xl font-black mb-2">미션과 함께하는 여행</h2>
        <p className="text-gray-300 text-base max-w-md mx-auto">
          평범한 여행은 이제 그만.<br />
          미션을 수락하고, 전혀 다른 여행을 경험해보세요.
        </p>
      </div>

      {/* 카테고리 필터 */}
      <div className="sticky top-[61px] bg-white border-b z-10 px-4 py-3 flex gap-2 overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition ${
              activeCategory === cat
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 미션 카드 그리드 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onClick={() => handleMissionClick(mission)}
            />
          ))}
        </div>
      </div>

      {/* 미션 상세 모달 */}
      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          onClose={() => setSelectedMission(null)}
          onStart={(mission) => {
            router.push(`/trips/new?mission=${mission.id}&title=${encodeURIComponent(mission.title)}`);
          }}
        />
      )}

      {/* 무작위 뽑기 모달 */}
      {showRandom && (
        <RandomSpinModal
          onClose={() => setShowRandom(false)}
          onStart={(dest) => {
            router.push(`/trips/new?region=${dest.name}&mission=random_spin`);
          }}
        />
      )}
    </div>
  );
}

// ─── 미션 카드 ────────────────────────────────────────────────────────────────

function MissionCard({ mission, onClick }: { mission: Mission; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left bg-white rounded-2xl shadow-sm border hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden group"
    >
      <div className={`bg-gradient-to-br ${mission.color} p-6 text-white`}>
        <span className="text-4xl block mb-2">{mission.emoji}</span>
        <h3 className="font-black text-lg leading-tight">{mission.title}</h3>
        <p className="text-white/80 text-xs mt-1">{mission.subtitle}</p>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {mission.category}
          </span>
          <DifficultyBadge difficulty={mission.difficulty} />
        </div>
        <p className="text-sm text-gray-600 line-clamp-2">{mission.description}</p>
        <p className={`text-xs font-bold mt-3 group-hover:underline ${mission.textColor}`}>
          미션 자세히 보기 →
        </p>
      </div>
    </button>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const colors = { 1: "text-green-500", 2: "text-yellow-500", 3: "text-red-500" };
  return (
    <span className={`text-xs font-bold flex items-center gap-0.5 ${colors[difficulty]}`}>
      {"★".repeat(difficulty)}{"☆".repeat(3 - difficulty)} {DIFF_LABELS[difficulty]}
    </span>
  );
}

// ─── 미션 상세 모달 ───────────────────────────────────────────────────────────

function MissionDetailModal({
  mission, onClose, onStart,
}: {
  mission: Mission;
  onClose: () => void;
  onStart: (m: Mission) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto">
        {/* 상단 그라디언트 헤더 */}
        <div className={`bg-gradient-to-br ${mission.color} p-8 text-white relative`}>
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl">✕</button>
          <span className="text-6xl block mb-3">{mission.emoji}</span>
          <h2 className="text-3xl font-black">{mission.title}</h2>
          <p className="text-white/80 mt-1">{mission.subtitle}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{mission.category}</span>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
              난이도: {"★".repeat(mission.difficulty)}{"☆".repeat(3 - mission.difficulty)} {DIFF_LABELS[mission.difficulty]}
            </span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* 설명 */}
          <p className="text-gray-700 leading-relaxed">{mission.description}</p>

          {/* 미션 규칙 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-lg">📋</span> 미션 규칙
            </h3>
            <ul className="space-y-2">
              {mission.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 font-bold shrink-0 mt-0.5">{i + 1}.</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* 팁 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <span className="text-lg">💡</span> 성공 팁
            </h3>
            <ul className="space-y-2">
              {mission.tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 bg-yellow-50 rounded-lg px-3 py-2">
                  <span className="shrink-0">✦</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {/* 클리어 조건 */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span>🏆</span> 미션 클리어 조건
            </h3>
            <p className="text-sm text-gray-700">{mission.clearCondition}</p>
          </div>

          {/* 버튼 */}
          <button
            onClick={() => onStart(mission)}
            className={`w-full py-4 bg-gradient-to-r ${mission.color} text-white font-black text-lg rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg`}
          >
            🚀 이 미션으로 여행 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 무작위 뽑기 모달 ─────────────────────────────────────────────────────────

function RandomSpinModal({
  onClose, onStart,
}: {
  onClose: () => void;
  onStart: (dest: (typeof RANDOM_DESTINATIONS)[0]) => void;
}) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<(typeof RANDOM_DESTINATIONS)[0] | null>(null);
  const [displayIdx, setDisplayIdx] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleSpin = () => {
    if (spinning) return;
    setResult(null);
    setSpinning(true);

    let count = 0;
    const total = 25;
    intervalRef.current = setInterval(() => {
      setDisplayIdx(Math.floor(Math.random() * RANDOM_DESTINATIONS.length));
      count++;
      if (count >= total) {
        clearInterval(intervalRef.current!);
        const picked = RANDOM_DESTINATIONS[Math.floor(Math.random() * RANDOM_DESTINATIONS.length)];
        setResult(picked);
        setDisplayIdx(RANDOM_DESTINATIONS.indexOf(picked));
        setSpinning(false);
      }
    }, 80);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const current = RANDOM_DESTINATIONS[displayIdx];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-orange-400 to-red-500 p-6 text-white text-center">
          <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white text-xl">✕</button>
          <span className="text-5xl block mb-2">🎲</span>
          <h2 className="text-2xl font-black">무작위 뽑기</h2>
          <p className="text-orange-100 text-sm mt-1">운명에 맡겨보세요!</p>
        </div>

        <div className="p-6 text-center space-y-6">
          {/* 슬롯 */}
          <div
            className={`bg-orange-50 rounded-2xl py-8 px-4 border-2 transition-all ${
              spinning ? "border-orange-300 animate-pulse" : result ? "border-green-400" : "border-orange-200"
            }`}
          >
            <span className={`text-6xl block mb-2 transition-all ${spinning ? "animate-spin" : ""}`}>
              {current.emoji}
            </span>
            <p className={`text-3xl font-black transition-all ${spinning ? "text-orange-300" : "text-gray-800"}`}>
              {current.name}
            </p>
            <p className="text-gray-500 text-sm mt-1">{current.region} · {current.vibe}</p>
          </div>

          {!result && !spinning && (
            <button
              onClick={handleSpin}
              className="w-full py-4 bg-gradient-to-r from-orange-400 to-red-500 text-white font-black text-xl rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
            >
              🎲 뽑기 시작!
            </button>
          )}

          {spinning && (
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-green-600 font-bold text-sm mb-1">🎉 당신의 여행지가 결정됐습니다!</p>
                <p className="text-2xl font-black text-gray-800">{result.name}</p>
                <p className="text-gray-500 text-sm">{result.vibe}</p>
              </div>
              <button
                onClick={() => onStart(result)}
                className="w-full py-3 bg-green-500 text-white font-black rounded-xl hover:bg-green-600 transition"
              >
                🚀 {result.name} 여행 바로 시작!
              </button>
              <button
                onClick={handleSpin}
                className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition"
              >
                🔄 다시 뽑기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
