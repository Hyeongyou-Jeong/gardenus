/** 관심사 옵션 (카테고리별) */

export interface InterestCategory {
  title: string;
  options: string[];
}

export const INTEREST_CATEGORIES: InterestCategory[] = [
  {
    title: "스포츠/운동",
    options: [
      "헬스",
      "러닝",
      "등산",
      "수영",
      "요가/필라테스",
      "구기 종목",
      "클라이밍",
      "자전거",
      "서핑",
      "스키,스노보드",
      "온라인 게임",
    ],
  },
  {
    title: "문화/예술",
    options: [
      "보드게임",
      "스포츠 관람",
      "e스포츠 관람",
      "영화 및 드라마 시청",
      "독서",
      "음악 감상",
      "공연 및 전시회 관람",
      "팬활동",
      "사진 촬영",
      "콘텐츠 제작",
      "악기 연주",
      "글쓰기",
      "웹툰",
    ],
  },
  {
    title: "일상",
    options: [
      "자기계발",
      "투자",
      "봉사활동",
      "여행",
      "드라이브",
      "산책",
      "맛집 탐방",
      "카페 탐방",
      "반려동물",
      "인테리어",
      "패션",
      "쇼핑",
      "요리/베이킹",
      "와인/위스키",
      "전통주",
    ],
  },
];

/** 전체 관심사 flat 배열 */
export const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap((c) => c.options);
