export interface ShowDay {
  day: number;
  title: string;
  activities: string[];
}

export interface TravelShow {
  id: string;
  title: string;
  subtitle: string;
  channel: string;
  destination: string;
  region: string;
  emoji: string;
  gradient: string;
  tags: string[];
  duration: string;
  description: string;
  cast: string;
  days: ShowDay[];
  /** YouTube 영상 ID (있으면 썸네일 자동 사용) */
  youtubeId?: string;
}

export const TRAVEL_SHOWS: TravelShow[] = [
  {
    id: "samsisi-ocean3",
    title: "삼시세끼 어촌편3",
    subtitle: "만재도에서의 자급자족 섬 생활",
    channel: "tvN",
    destination: "만재도",
    region: "전남",
    emoji: "🐟",
    gradient: "from-blue-500 to-cyan-600",
    youtubeId: "qSgBxnmTHMs", // 삼시세끼 어촌편 공식 클립
    tags: ["섬여행", "자급자족", "낚시", "힐링"],
    duration: "2박3일",
    cast: "이서진·옥택연·윤균상",
    description: "전남 신안의 외딴 섬 만재도에서 자급자족 생활을 하며 낚시와 요리로 하루하루를 보내는 힐링 여행.",
    days: [
      {
        day: 1,
        title: "만재도 도착 & 첫 끼니",
        activities: [
          "• 오전: 목포항에서 배 타고 만재도 입도",
          "• 오후: 민박집 정리 및 갯바위 탐방",
          "• 저녁: 직접 잡은 우럭으로 매운탕 해먹기",
        ],
      },
      {
        day: 2,
        title: "낚시와 텃밭 가꾸기",
        activities: [
          "• 오전: 이른 새벽 갯바위 낚시 (돌돔·우럭)",
          "• 오후: 섬 뒷길 트레킹 & 텃밭 채소 수확",
          "• 저녁: 회 + 된장찌개 저녁 식사",
        ],
      },
      {
        day: 3,
        title: "마지막 아침과 귀환",
        activities: [
          "• 오전: 해안 산책 & 마을 어르신들과 담소",
          "• 낮: 섬에서 마지막 점심 (조개구이)",
          "• 오후: 배 타고 목포항 귀환",
        ],
      },
    ],
  },
  {
    id: "one-night-yangyang",
    title: "1박2일 - 양양편",
    subtitle: "서핑 성지 양양에서 하루 질리도록 놀기",
    channel: "KBS2",
    destination: "양양",
    region: "강원",
    emoji: "🏄",
    gradient: "from-orange-400 to-yellow-500",
    tags: ["서핑", "낙산사", "속초", "맛집"],
    duration: "1박2일",
    cast: "딘딘·김선호·라비·문세윤",
    description: "대한민국 서핑 1번지 양양에서 서핑 레슨, 낙산사 일출, 속초 시장까지 알차게 즐기는 1박2일.",
    days: [
      {
        day: 1,
        title: "서핑 레슨 & 해변 만끽",
        activities: [
          "• 오전: 서울 출발 → 양양 죽도해변 도착",
          "• 오후: 서핑 레슨 (초보 코스 2시간)",
          "• 저녁: 양양 장터 닭강정 & 맥주 한잔",
        ],
      },
      {
        day: 2,
        title: "낙산사 일출 & 속초 탐방",
        activities: [
          "• 새벽: 낙산사에서 일출 감상",
          "• 오전: 속초 중앙시장 닭강정·오징어순대 투어",
          "• 오후: 속초 해수욕장 마지막 산책 후 귀가",
        ],
      },
    ],
  },
  {
    id: "alssalsinji-gyeongju",
    title: "알쓸신잡3 - 경주편",
    subtitle: "지식여행자들의 천년 고도 탐방",
    channel: "tvN",
    destination: "경주",
    region: "경북",
    emoji: "🏛️",
    gradient: "from-amber-500 to-orange-600",
    tags: ["문화역사", "불국사", "황리단길", "야경"],
    duration: "2박3일",
    cast: "유희열·유현준·장동선·김영하",
    description: "각 분야 천재들이 경주의 역사와 문화를 깊이 있게 탐구하며 떠나는 알쓸신잡 스타일 여행.",
    days: [
      {
        day: 1,
        title: "불국사·석굴암 & 황리단길",
        activities: [
          "• 오전: 불국사 & 석굴암 탐방 (2시간)",
          "• 오후: 국립경주박물관 (천마총 유물 관람)",
          "• 저녁: 황리단길 골목 식당 & 카페 투어",
        ],
      },
      {
        day: 2,
        title: "첨성대 야경 & 보문호",
        activities: [
          "• 오전: 안압지(동궁과 월지) 아침 산책",
          "• 오후: 보문호 자전거 라이딩",
          "• 저녁: 첨성대 야간 조명 감상",
        ],
      },
      {
        day: 3,
        title: "양동마을 & 귀가",
        activities: [
          "• 오전: 양동마을 유네스코 세계유산 탐방",
          "• 오후: 경주 교동 법주 전통주 시음",
          "• 오후: 귀가",
        ],
      },
    ],
  },
  {
    id: "baegwi-jeju",
    title: "바퀴 달린 집2 - 제주편",
    subtitle: "캠핑카로 제주도 완전 일주",
    channel: "tvN",
    destination: "제주도",
    region: "제주",
    emoji: "🚐",
    gradient: "from-green-500 to-teal-600",
    tags: ["캠핑카", "제주", "드라이브", "자유여행"],
    duration: "3박4일",
    cast: "성동일·이동휘·여진구",
    description: "캠핑카 한 대로 제주도 구석구석을 자유롭게 일주하는 로드트립 여행.",
    days: [
      {
        day: 1,
        title: "제주 공항 → 동쪽 해안",
        activities: [
          "• 오전: 제주공항 도착 캠핑카 픽업",
          "• 오후: 성산일출봉 & 우도 배 관광",
          "• 저녁: 해안도로 주차 & 캠핑카 바베큐",
        ],
      },
      {
        day: 2,
        title: "한라산 & 서귀포",
        activities: [
          "• 오전: 한라산 어리목 코스 트레킹",
          "• 오후: 서귀포 매일올레시장 & 천지연폭포",
          "• 저녁: 서귀포 항구 해산물 저녁",
        ],
      },
      {
        day: 3,
        title: "서쪽 해안 드라이브",
        activities: [
          "• 오전: 협재해수욕장 에메랄드 바다",
          "• 오후: 오설록 녹차밭 & 카페 투어",
          "• 저녁: 중문관광단지 캠핑",
        ],
      },
      {
        day: 4,
        title: "북쪽 탐방 & 귀환",
        activities: [
          "• 오전: 제주 시내 동문시장 아침 투어",
          "• 오전: 제주 해안도로 드라이브",
          "• 오후: 캠핑카 반납 후 귀가",
        ],
      },
    ],
  },
  {
    id: "yoon-stay-hahoe",
    title: "윤스테이 - 하회마을편",
    subtitle: "한옥 민박집에서의 조용한 하루",
    channel: "tvN",
    destination: "안동 하회마을",
    region: "경북",
    emoji: "🏯",
    gradient: "from-stone-500 to-amber-700",
    tags: ["한옥", "문화역사", "전통", "힐링"],
    duration: "1박2일",
    cast: "윤여정·이서진·박서준·최우식",
    description: "유네스코 세계문화유산 안동 하회마을의 한옥 민박집에서 머물며 전통 문화를 체험하는 여행.",
    days: [
      {
        day: 1,
        title: "하회마을 도착 & 탈춤 공연",
        activities: [
          "• 오전: 안동역 도착 & 하회마을 입장",
          "• 오후: 마을 골목 탐방 & 만송정 숲 산책",
          "• 저녁: 하회별신굿탈놀이 관람 & 안동찜닭 저녁",
        ],
      },
      {
        day: 2,
        title: "부용대 & 병산서원",
        activities: [
          "• 오전: 부용대 전망대에서 하회마을 전경 감상",
          "• 오후: 병산서원 탐방 (유네스코 세계유산)",
          "• 오후: 안동 소주 시음 & 귀가",
        ],
      },
    ],
  },
  {
    id: "jangsam-bari",
    title: "장도 바리바리",
    subtitle: "전남 섬마을 바리바리 탐방기",
    channel: "KBS1",
    destination: "전남 섬 여행",
    region: "전남",
    emoji: "⛵",
    gradient: "from-sky-500 to-blue-700",
    tags: ["섬여행", "도보여행", "해산물", "힐링"],
    duration: "2박3일",
    cast: "박보검·유연석",
    description: "전남 신안·완도 일대의 작은 섬들을 바리바리 짐 싸서 걸어 다니며 탐방하는 여행.",
    days: [
      {
        day: 1,
        title: "목포 출발 & 첫 번째 섬",
        activities: [
          "• 오전: 목포항에서 배 탑승",
          "• 오후: 첫 번째 섬 도착 & 마을 어르신 인터뷰",
          "• 저녁: 민박집에서 자연산 해산물 저녁",
        ],
      },
      {
        day: 2,
        title: "섬 트레킹 & 해변",
        activities: [
          "• 오전: 섬 둘레길 트레킹 (4km)",
          "• 오후: 두 번째 섬으로 이동 & 갯벌 체험",
          "• 저녁: 낙조 감상 & 조개구이",
        ],
      },
      {
        day: 3,
        title: "마지막 섬 & 귀환",
        activities: [
          "• 오전: 섬 시장 탐방 & 특산물 구입",
          "• 오후: 배 타고 목포항 귀환",
          "• 저녁: 목포 낙지 요리 저녁",
        ],
      },
    ],
  },
  {
    id: "hyunji-yeosu",
    title: "현지에서 먹힌다 - 여수편",
    subtitle: "여수 밤바다와 해산물 완전 정복",
    channel: "tvN",
    destination: "여수",
    region: "전남",
    emoji: "🦞",
    gradient: "from-purple-500 to-pink-600",
    tags: ["맛집", "야경", "해산물", "나이트라이프"],
    duration: "1박2일",
    cast: "이수근·이승기",
    description: "여수 현지 음식을 탐방하며 돌산 낭만포차, 서시장 생선구이, 케이블카까지 즐기는 미식 여행.",
    days: [
      {
        day: 1,
        title: "여수 미식 투어 & 야경",
        activities: [
          "• 오전: 서울 출발 → KTX 여수엑스포역",
          "• 오후: 여수 해상 케이블카 탑승",
          "• 저녁: 돌산 낭만포차에서 굴구이 & 밤바다 감상",
        ],
      },
      {
        day: 2,
        title: "서시장 & 오동도 & 귀가",
        activities: [
          "• 오전: 여수 서시장 생선구이 아침",
          "• 오후: 오동도 동백꽃 산책 (시즌)",
          "• 오후: 이순신광장 탐방 후 귀가",
        ],
      },
    ],
  },
  {
    id: "battle-trip-jeonju",
    title: "배틀트립 - 전주편",
    subtitle: "국내파 vs 해외파의 전주 한옥마을 대결",
    channel: "MBC",
    destination: "전주",
    region: "전북",
    emoji: "🏯",
    gradient: "from-red-500 to-rose-600",
    tags: ["한옥마을", "맛집", "야시장", "문화"],
    duration: "1박2일",
    cast: "박수영·세연·박세리·장도연",
    description: "전주 한옥마을에서 비빔밥, 막걸리, 야시장까지 전주의 맛을 모두 섭렵하는 1박2일 배틀.",
    days: [
      {
        day: 1,
        title: "한옥마을 탐방 & 야시장",
        activities: [
          "• 오전: KTX 전주역 도착 & 한옥마을 입장",
          "• 오후: 경기전 탐방 & 한복 체험",
          "• 저녁: 남부시장 야시장 (비빔밥·막걸리)",
        ],
      },
      {
        day: 2,
        title: "전통 문화 & 귀가",
        activities: [
          "• 오전: 전주 전통 비빔밥 아침 식사",
          "• 오전: 전동성당 & 풍남문 탐방",
          "• 오후: 초코파이 특산물 쇼핑 후 귀가",
        ],
      },
    ],
  },
];
