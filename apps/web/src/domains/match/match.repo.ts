/**
 * Match Repository – mock 구현
 * 2차에서 Firestore 연동 예정
 */

export interface ProfileCard {
  id: string;
  name: string;
  age: number;
  location: string;
  imageUrl: string;
  tags: string[];
}

const mockProfiles: ProfileCard[] = [
  {
    id: "1",
    name: "지수",
    age: 27,
    location: "서울 강남구",
    imageUrl: "https://placehold.co/360x420/e6f9f1/009957?text=Profile+1",
    tags: ["카페 탐방", "요리", "산책"],
  },
  {
    id: "2",
    name: "민준",
    age: 29,
    location: "서울 마포구",
    imageUrl: "https://placehold.co/360x420/b3f0d6/005a32?text=Profile+2",
    tags: ["독서", "영화", "운동"],
  },
  {
    id: "3",
    name: "서연",
    age: 25,
    location: "서울 성동구",
    imageUrl: "https://placehold.co/360x420/80e6bb/008048?text=Profile+3",
    tags: ["여행", "사진", "음악"],
  },
  {
    id: "4",
    name: "도윤",
    age: 31,
    location: "서울 용산구",
    imageUrl: "https://placehold.co/360x420/4ddda0/00b368?text=Profile+4",
    tags: ["등산", "자전거", "코딩"],
  },
];

export async function fetchProfiles(): Promise<ProfileCard[]> {
  // mock: 0.3초 딜레이
  return new Promise((resolve) => setTimeout(() => resolve(mockProfiles), 300));
}

export async function requestMatch(profileId: string): Promise<{ ok: boolean }> {
  console.log("[mock] match requested for", profileId);
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 200));
}
