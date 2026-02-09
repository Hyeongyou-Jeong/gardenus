export type UserProfile = {
  id: string;
  name?: string;
  born?: number;
  residence?: string;
  school?: string;
  department?: string;
  mbti?: string;
  aboutme?: string;
  profileImageId?: string;
  /** Firebase Storage downloadURL (Firestore 필드명: profile) */
  profile?: string;
  /** 대체 이미지 URL 키 */
  profileImageUrl?: string;
  flower?: number;
  gender?: boolean;
  height?: number;
  job?: string;

  /** MBTI 축별 퍼센트 (0 = 왼쪽 극단, 100 = 오른쪽 극단) — 레거시 */
  mbtiEI?: number;
  mbtiSN?: number;
  mbtiTF?: number;
  mbtiJP?: number;

  /** MBTI 스크롤 선택 (letter + 강도 퍼센트) */
  mbtiEILetter?: "E" | "I";
  mbtiEIPercent?: number;

  /** 선호도 */
  contactPref?: string;
  cigar?: string;
  drinking?: string;
  affectionLevel?: string;
  jealousyLevel?: string;
  meetingPref?: string;

  /** 선택 태그 (배열) */
  myTraits?: string[];
  interests?: string[];
  idealTraits?: string[];

  reminderEnabled?: boolean;
  kakaoid?: string;
  signupDate?: any;

  /** Firestore에 추가 필드가 있을 수 있으므로 여유 */
  [key: string]: any;
};
