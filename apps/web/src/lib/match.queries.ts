import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  setDoc,
  addDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import type { MatchRequestDoc, MatchRequestStatus } from "./match.schema";

/* ── 실시간 구독용 타입 ─────────────────────────────────────── */

export type { MatchRequestStatus };

export interface SentRequestItem {
  id: string;
  toUid: string;
  status: MatchRequestStatus;
  createdAt: Date | null;
}

/**
 * 내가 보낸 매칭 요청을 실시간으로 구독한다 (최신순).
 * 인덱스 필요 시 Firestore 에러 콘솔 링크로 생성하면 됨.
 */
export function subscribeSentRequests(params: {
  myUid: string;
  limitN?: number;
  onChange: (items: SentRequestItem[]) => void;
  onError?: (e: unknown) => void;
}): () => void {
  const { myUid, limitN = 50, onChange, onError } = params;

  const q = query(
    collection(db, "matchRequests"),
    where("fromUid", "==", myUid),
    orderBy("createdAt", "desc"),
    limit(limitN),
  );
  return onSnapshot(
    q,
    (snap) => {
      const items: SentRequestItem[] = snap.docs.map((d) => {
        const data = d.data() as MatchRequestDoc;
        const ts = data.createdAt;
        return {
          id: d.id,
          toUid: data.toUid,
          status: data.status,
          createdAt: ts instanceof Timestamp ? ts.toDate() : null,
        };
      });
      onChange(items);
    },
    (err) => onError?.(err),
  );
}

/* ── 상태 업데이트 ────────────────────────────────────────────── */

export async function updateMatchRequestStatus(
  requestId: string,
  status: "ACCEPTED" | "DECLINED",
): Promise<void> {
  await updateDoc(doc(db, "matchRequests", requestId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/* ── ACCEPTED 매칭 목록 (채팅 진입용) ─────────────────────────── */

export interface AcceptedMatchItem {
  id: string;
  fromUid: string;
  toUid: string;
  otherUid: string;
  createdAt: Date | null;
}

/**
 * 내가 관여한 ACCEPTED matchRequests를 모두 가져온다.
 * OR 쿼리 대신 쿼리 2개(fromUid/toUid) 실행 후 클라이언트 병합.
 * 복합 인덱스 필요: (fromUid+status+createdAt), (toUid+status+createdAt)
 */
export async function fetchAcceptedMatchesForMe(
  myUid: string,
  limitN = 100,
): Promise<AcceptedMatchItem[]> {
  const ref = collection(db, "matchRequests");

  const q1 = query(
    ref,
    where("fromUid", "==", myUid),
    where("status", "==", "ACCEPTED"),
    limit(limitN),
  );
  const q2 = query(
    ref,
    where("toUid", "==", myUid),
    where("status", "==", "ACCEPTED"),
    limit(limitN),
  );

  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

  const map = new Map<string, AcceptedMatchItem>();

  for (const d of [...snap1.docs, ...snap2.docs]) {
    if (map.has(d.id)) continue;
    const data = d.data() as MatchRequestDoc;
    const ts = data.createdAt;
    map.set(d.id, {
      id: d.id,
      fromUid: data.fromUid,
      toUid: data.toUid,
      otherUid: data.fromUid === myUid ? data.toUid : data.fromUid,
      createdAt: ts instanceof Timestamp ? ts.toDate() : null,
    });
  }

  return [...map.values()].sort((a, b) => {
    if (!a.createdAt) return 1;
    if (!b.createdAt) return -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/* ── 요청 삭제 + 플라워 환급 ─────────────────────────────────── */

export async function deleteMatchRequestAndRefund(
  requestId: string,
): Promise<void> {
  console.log("[refund] start", { requestId });

  const reqRef = doc(db, "matchRequests", requestId);

  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) {
    console.warn("[refund] matchRequest 문서 없음 — 이미 삭제됐을 수 있음");
    return;
  }

  const data = reqSnap.data();
  const fromUid = data.fromUid as string;
  const flowerCost = (data.flowerCost as number | undefined) ?? 180;
  const userRef = doc(db, "users", fromUid);

  console.log("[refund] fromUid =", fromUid, "| flowerCost =", flowerCost, "| userRef =", userRef.path);

  await deleteDoc(reqRef);
  console.log("[refund] matchRequest 삭제 완료");

  if (flowerCost > 0) {
    try {
      await setDoc(userRef, { flower: increment(flowerCost) }, { merge: true });
      console.log("[refund] 플라워 환급 완료 +", flowerCost);
    } catch (e) {
      console.error("[refund] 플라워 환급 실패:", e);
      throw e;
    }
  }

  try {
    await addDoc(collection(db, "users", fromUid, "notifications"), {
      type: "REFUND_DONE",
      title: "환불 완료",
      body: `환불이 완료되었어요. (+${flowerCost} 꽃)`,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[refund] 알림 생성 실패 (무시):", e);
  }
}

/* ── 일회성 조회 함수 ────────────────────────────────────────── */

const matchRequestsRef = collection(db, "matchRequests");

export async function querySentRequests(
  myUid: string,
  limitN = 20,
): Promise<(MatchRequestDoc & { id: string })[]> {
  const q = query(
    matchRequestsRef,
    where("fromUid", "==", myUid),
    orderBy("createdAt", "desc"),
    limit(limitN),
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchRequestDoc) }));
}

export async function queryReceivedPendingRequests(
  myUid: string,
  limitN = 20,
): Promise<(MatchRequestDoc & { id: string })[]> {
  const q = query(
    matchRequestsRef,
    where("toUid", "==", myUid),
    where("status", "==", "PENDING"),
    orderBy("createdAt", "desc"),
    limit(limitN),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchRequestDoc) }));
}

export async function queryRequestsByCreatedAtRange(params: {
  start: Date;
  end: Date;
  direction?: "asc" | "desc";
  limitN?: number;
}): Promise<(MatchRequestDoc & { id: string })[]> {
  const { start, end, direction = "asc", limitN = 200 } = params;

  const q = query(
    matchRequestsRef,
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<", Timestamp.fromDate(end)),
    orderBy("createdAt", direction),
    limit(limitN),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as MatchRequestDoc) }));
}
