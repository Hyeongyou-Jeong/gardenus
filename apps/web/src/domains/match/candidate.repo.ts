import {
  collection,
  query,
  where,
  limit as fbLimit,
  getDocs,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import type { UserDoc } from "@/domains/user/user.repo";

/* ================================================================
   후보 조회 — isProfileVisible & 반대 성별 필터
   ================================================================ */

/**
 * 매칭 후보를 조건에 맞게 가져온다.
 *
 * - isProfileVisible == true
 * - gender == !myGender (반대 성별)
 * - orderBy 없음 → 복합 인덱스 불필요 (2개 equality만)
 * - 셔플은 호출 측(MatchHallPage)에서 처리
 *
 * @note 만약 composite index 에러가 뜨면
 *   콘솔에 나오는 링크를 클릭하여 인덱스를 생성하면 됩니다.
 */
export async function fetchCandidateBatch(params: {
  myGender: boolean;
  limitN?: number;
}): Promise<UserDoc[]> {
  const { myGender, limitN = 50 } = params;

  const q = query(
    collection(db, "users"),
    where("isProfileVisible", "==", true),
    where("gender", "==", !myGender),
    fbLimit(limitN),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserDoc, "id">),
  }));
}
