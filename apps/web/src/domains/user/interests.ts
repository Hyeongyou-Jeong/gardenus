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
      "테니스",
      "골프",
      "축구",
      "농구",
      "볼링",
      "클라이밍",
      "자전거",
    ],
  },
  {
    title: "문화/예술",
    options: [
      "영화",
      "드라마",
      "뮤지컬/연극",
      "전시회",
      "독서",
      "음악 감상",
      "악기 연주",
      "사진/영상",
      "그림/일러스트",
      "웹툰/만화",
    ],
  },
  {
    title: "음식/카페",
    options: [
      "맛집 탐방",
      "카페 투어",
      "홈 쿠킹",
      "베이킹",
      "와인/위스키",
      "커피 덕후",
    ],
  },
  {
    title: "라이프스타일",
    options: [
      "여행",
      "캠핑",
      "드라이브",
      "반려동물",
      "인테리어",
      "패션",
      "쇼핑",
      "게임",
      "덕질/팬활동",
      "자기계발",
      "재테크/투자",
      "봉사활동",
    ],
  },
];

/** 전체 관심사 flat 배열 */
export const ALL_INTERESTS = INTEREST_CATEGORIES.flatMap((c) => c.options);
