import {
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";

const FLOWER_COST = 180;

export interface MatchRequestResult {
  success: boolean;
  error?: "already_pending" | "not_enough_flower" | "unknown";
  message: string;
}

/**
 * 매칭 요청을 생성하고 플라워를 차감한다.
 *
 * - 중복 pending 요청 방지
 * - runTransaction으로 플라워 확인 + 차감 + 문서 생성을 원자적으로 처리
 */
export async function createMatchRequest(
  fromUid: string,
  toUid: string
): Promise<MatchRequestResult> {
  /* ---- 1) 중복 pending 요청 확인 ---- */
  const pendingQuery = query(
    collection(db, "matchRequests"),
    where("fromUid", "==", fromUid),
    where("toUid", "==", toUid),
    where("status", "==", "pending")
  );

  const pendingSnap = await getDocs(pendingQuery);
  if (!pendingSnap.empty) {
    return {
      success: false,
      error: "already_pending",
      message: "이미 요청을 보냈습니다.",
    };
  }

  /* ---- 2) 트랜잭션: 플라워 확인 + 차감 + 문서 생성 ---- */
  try {
    const userRef = doc(db, "users", fromUid);
    const matchReqRef = doc(collection(db, "matchRequests"));

    await runTransaction(db, async (tx) => {
      const userSnap = await tx.get(userRef);
      const currentFlower = (userSnap.data()?.flower as number) ?? 0;

      if (currentFlower < FLOWER_COST) {
        throw new Error("NOT_ENOUGH_FLOWER");
      }

      // matchRequests 문서 생성
      tx.set(matchReqRef, {
        fromUid,
        toUid,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        flowerCost: FLOWER_COST,
        refundEligible: true,
      });

      // 플라워 차감
      tx.update(userRef, {
        flower: currentFlower - FLOWER_COST,
      });
    });

    return {
      success: true,
      message: "요청을 보냈습니다.",
    };
  } catch (err: any) {
    if (err?.message === "NOT_ENOUGH_FLOWER") {
      return {
        success: false,
        error: "not_enough_flower",
        message: "플라워가 부족합니다.",
      };
    }
    console.error("[matchRequest] createMatchRequest 실패:", err);
    return {
      success: false,
      error: "unknown",
      message: "요청에 실패했습니다. 다시 시도해주세요.",
    };
  }
}

export { FLOWER_COST };
