import {
  collection,
  doc,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";

/* ── 타입 ─────────────────────────────────────────────────────── */

export type NotifType =
  | "LIKE_RECEIVED"
  | "MATCH_SUCCESS"
  | "REQUEST_DECLINED"
  | "REFUND_DONE"
  | "SYSTEM";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  createdAt: Date | null;
  readAt?: Date | null;
  targetUid?: string; // MATCH_SUCCESS: 상대 uid, LIKE_RECEIVED: 없음
}

/* ── 구독 ─────────────────────────────────────────────────────── */

export function subscribeMyNotifications(opts: {
  myUid: string;
  limitN?: number;
  onChange: (items: AppNotification[]) => void;
  onError?: (e: unknown) => void;
}): () => void {
  const { myUid, limitN = 30, onChange, onError } = opts;

  const q = query(
    collection(db, "users", myUid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(limitN),
  );

  return onSnapshot(
    q,
    (snap) => {
      const items: AppNotification[] = snap.docs.map((d) => {
        const data = d.data();
        const toDate = (v: unknown): Date | null =>
          v instanceof Timestamp ? v.toDate() : null;
        return {
          id: d.id,
          type: (data.type as NotifType) ?? "SYSTEM",
          title: (data.title as string) ?? "",
          body: (data.body as string) ?? "",
          createdAt: toDate(data.createdAt),
          readAt: toDate(data.readAt),
          targetUid: (data.targetUid as string | undefined) ?? undefined,
        };
      });
      onChange(items);
    },
    (err) => onError?.(err),
  );
}

/* ── 읽음 처리 ────────────────────────────────────────────────── */

export async function markNotificationRead(
  myUid: string,
  notifId: string,
): Promise<void> {
  const ref = doc(db, "users", myUid, "notifications", notifId);
  await updateDoc(ref, { readAt: serverTimestamp() });
}

export async function markAllNotificationsRead(
  myUid: string,
  notifs: AppNotification[],
): Promise<void> {
  const unread = notifs.filter((n) => !n.readAt);
  await Promise.all(
    unread.map((n) => markNotificationRead(myUid, n.id)),
  );
}
