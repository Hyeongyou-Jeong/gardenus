import { Timestamp } from "firebase/firestore";

/* ── 매칭 요청 ──────────────────────────────────────────────── */

export type MatchRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "CANCELED";

export interface MatchRequestDoc {
  fromUid: string;
  toUid: string;
  status: MatchRequestStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function makeMatchRequestId(
  fromUid: string,
  toUid: string,
): string {
  return `${fromUid}_${toUid}`;
}

/* ── 매칭(성사) ─────────────────────────────────────────────── */

export interface MatchDoc {
  userA: string;
  userB: string;
  createdAt: Timestamp;
  sourceRequestId: string;
}

export function makeMatchId(
  uid1: string,
  uid2: string,
): { matchId: string; userA: string; userB: string } {
  const [userA, userB] = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
  return { matchId: `${userA}_${userB}`, userA, userB };
}
