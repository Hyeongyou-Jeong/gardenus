import {
  collection,
  query,
  where,
  limit as fbLimit,
  getDocs,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import type { UserDoc } from "@/domains/user/user.repo";

/* ================================================================
   후보 조회 — isProfileVisible & (선택적) 반대 성별 필터
   ================================================================ */

/**
 * 매칭 후보를 조건에 맞게 가져온다.
 *
 * - isProfileVisible == true
 * - myGender가 주어지면 반대 성별만, 없으면 성별 무관
 * - orderBy 없음 → 복합 인덱스 불필요
 * - 셔플은 호출 측(MatchHallPage)에서 처리
 */
export async function fetchCandidateBatch(params: {
  myGender?: boolean;
  limitN?: number;
}): Promise<UserDoc[]> {
  const { myGender, limitN = 50 } = params;

  const constraints: QueryConstraint[] = [
    where("isProfileVisible", "==", true),
  ];
  if (myGender != null) {
    constraints.push(where("gender", "==", !myGender));
  }
  constraints.push(fbLimit(limitN));

  const q = query(collection(db, "users"), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserDoc, "id">),
  }));
}
