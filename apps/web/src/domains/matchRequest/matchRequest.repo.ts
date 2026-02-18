import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import { makeMatchRequestId } from "@/lib/match.schema";
import type { MatchRequestStatus } from "@/lib/match.schema";

const FLOWER_COST = 180;

export interface MatchRequestResult {
  success: boolean;
  kind?: "created_forward" | "auto_accepted_reverse";
  error?:
    | "already_pending"
    | "already_handled"
    | "reverse_already_handled"
    | "not_enough_flower"
    | "unknown";
  message: string;
}

/**
 * 매칭 요청을 생성하거나, 역방향 PENDING이 있으면 자동 수락한다.
 *
 * fromUid/toUid는 모두 phoneNumber(E.164).
 * 전체 로직을 단일 runTransaction으로 처리해 원자성 보장.
 */
export async function createMatchRequest(
  fromUid: string,
  toUid: string,
): Promise<MatchRequestResult> {
  const forwardId = makeMatchRequestId(fromUid, toUid);
  const reverseId = makeMatchRequestId(toUid, fromUid);
  const forwardRef = doc(db, "matchRequests", forwardId);
  const reverseRef = doc(db, "matchRequests", reverseId);
  const userRef = doc(db, "users", fromUid);

  try {
    return await runTransaction(db, async (tx) => {
      const [reverseSnap, forwardSnap, userSnap] = await Promise.all([
        tx.get(reverseRef),
        tx.get(forwardRef),
        tx.get(userRef),
      ]);

      /* ── 1) 역방향(상대→나) PENDING 체크 ── */
      if (reverseSnap.exists()) {
        const st = reverseSnap.data()?.status as MatchRequestStatus | undefined;

        if (st === "PENDING") {
          tx.update(reverseRef, {
            status: "ACCEPTED",
            updatedAt: serverTimestamp(),
          });
          return {
            success: true,
            kind: "auto_accepted_reverse" as const,
            message: "상대의 요청을 수락하여 매칭되었습니다.",
          };
        }

        return {
          success: false,
          error: "reverse_already_handled" as const,
          message: "이미 처리된 요청이 존재합니다.",
        };
      }

      /* ── 2) 정방향(나→상대) 체크 ── */
      if (forwardSnap.exists()) {
        const st = forwardSnap.data()?.status as MatchRequestStatus | undefined;
        if (st === "PENDING") {
          return {
            success: false,
            error: "already_pending" as const,
            message: "이미 요청을 보냈습니다.",
          };
        }
        return {
          success: false,
          error: "already_handled" as const,
          message: "이미 처리된 요청입니다.",
        };
      }

      /* ── 3) 플라워 확인 + 차감 + 새 요청 생성 ── */
      const currentFlower = (userSnap.data()?.flower as number | undefined) ?? 0;
      if (currentFlower < FLOWER_COST) {
        throw new Error("NOT_ENOUGH_FLOWER");
      }

      tx.set(forwardRef, {
        fromUid,
        toUid,
        status: "PENDING",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        flowerCost: FLOWER_COST,
        refundEligible: true,
      });

      tx.update(userRef, {
        flower: currentFlower - FLOWER_COST,
      });

      return {
        success: true,
        kind: "created_forward" as const,
        message: "요청을 보냈습니다.",
      };
    });
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
