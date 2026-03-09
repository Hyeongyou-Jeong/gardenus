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
      "성숙한",
      "작은 얼굴",
      "뚜렷한 이목구비",
      "귀여운 상",
      "호감형",
      "안경",
      "보조개",
    ],
  },
  {
    title: "체형",
    options: [
      "마른",
      "보통",
      "통통한",
      "듬직한",
      "잔근육",
      "피지크",
      "모델",
    ],
  },
  {
    title: "성격",
    options: [
      "활발한",
      "차분한",
      "외향적인",
      "내향적인",
      "유머있는",
      "감성적인",
      "이성적인",
      "즉흥적인",
      "계획적인",
      "안정적인",
      "도전적인",
      "밝은 성격",
      "조용한 성격",
      "긍정적인",
      "현실적인",
      "다정한",
      "여유로운",
      "센스있는",
      "솔직한",
      "지적인"
    ],
  },
  {
    title: "분위기",
    options: [
      "청량한",
      "세련된",
      "단정한",
      "청순한",
      "힙한",
      "감성적인",
      "도시적인",
      "캐주얼한",
    ],
  },
];

/** 전체 옵션 flat 배열 */
export const ALL_TRAITS = TRAIT_CATEGORIES.flatMap((c) => c.options);
