/**
 * User Repository – mock 구현
 * 2차에서 Firestore 연동 예정
 */

export interface UserProfile {
  name: string;
  phone: string;
  flowerBalance: number;
}

export async function fetchMyProfile(): Promise<UserProfile> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          name: "홍길동",
          phone: "010-1234-5678",
          flowerBalance: 9640,
        }),
      200
    )
  );
}
