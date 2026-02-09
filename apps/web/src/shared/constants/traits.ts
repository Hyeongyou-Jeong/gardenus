/** 내특징 / 이상형 옵션 (카테고리별) */

export interface TraitCategory {
  title: string;
  options: string[];
}

export const TRAIT_CATEGORIES: TraitCategory[] = [
  {
    title: "외모",
    options: [
      "쌍커풀 있는",
      "쌍커풀 없는",
      "동안",
      "노안",
      "작은 얼굴",
      "뚜렷한 이목구비",
      "귀여운 상",
      "호감형",
      "안경 착용",
      "보조개",
    ],
  },
  {
    title: "체형",
    options: [
      "마른 체형",
      "보통 체형",
      "슬림 탄탄",
      "근육질",
      "통통한",
      "건장한",
      "모델 체형",
      "어깨 넓은",
      "키가 큰",
    ],
  },
  {
    title: "성격",
    options: [
      "활발한",
      "차분한",
      "유머 있는",
      "다정한",
      "배려심 깊은",
      "솔직한",
      "감성적인",
      "이성적인",
      "외향적인",
      "내향적인",
      "낙천적인",
      "꼼꼼한",
      "자신감 있는",
      "리더십 있는",
      "인내심 있는",
      "책임감 있는",
    ],
  },
  {
    title: "기타",
    options: [
      "목소리 좋은",
      "패션 감각 있는",
      "운동 좋아하는",
      "요리 잘하는",
      "동물 좋아하는",
      "집순이/집돌이",
      "여행 좋아하는",
      "음악 좋아하는",
      "독서 좋아하는",
      "게임 좋아하는",
    ],
  },
];

/** 전체 옵션 flat 배열 */
export const ALL_TRAITS = TRAIT_CATEGORIES.flatMap((c) => c.options);
