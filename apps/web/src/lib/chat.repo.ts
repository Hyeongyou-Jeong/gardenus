import {
  doc,
  collection,
  setDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";

/* ── Room ID ──────────────────────────────────────────────────── */

export function makeRoomId(
  uid1: string,
  uid2: string,
): { roomId: string; a: string; b: string } {
  const [a, b] = uid1 < uid2 ? [uid1, uid2] : [uid2, uid1];
  return { roomId: `${a}__${b}`, a, b };
}

/* ── Room 생성/보장 ───────────────────────────────────────────── */

export async function ensureRoom(
  roomId: string,
  participants: [string, string],
): Promise<void> {
  await setDoc(
    doc(db, "chatRooms", roomId),
    { participants, createdAt: serverTimestamp() },
    { merge: true },
  );
}

/* ── 메시지 구독 ──────────────────────────────────────────────── */

export interface ChatMessage {
  id: string;
  senderUid: string;
  text: string;
  createdAt: Date | null;
}

export function subscribeMessages(opts: {
  roomId: string;
  limitN?: number;
  onChange: (msgs: ChatMessage[]) => void;
  onError?: (e: unknown) => void;
}): () => void {
  const { roomId, limitN = 100, onChange, onError } = opts;

  const q = query(
    collection(db, "chatRooms", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(limitN),
  );

  return onSnapshot(
    q,
    (snap) => {
      const msgs: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data();
        const ts = data.createdAt;
        return {
          id: d.id,
          senderUid: data.senderUid as string,
          text: data.text as string,
          createdAt: ts instanceof Timestamp ? ts.toDate() : null,
        };
      });
      onChange(msgs);
    },
    (err) => onError?.(err),
  );
}

/* ── 메시지 전송 ──────────────────────────────────────────────── */

export async function sendMessage(opts: {
  roomId: string;
  senderUid: string;
  text: string;
}): Promise<void> {
  const { roomId, senderUid, text } = opts;
  const roomRef = doc(db, "chatRooms", roomId);
  const msgRef = doc(collection(db, "chatRooms", roomId, "messages"));

  await setDoc(msgRef, {
    senderUid,
    text,
    createdAt: serverTimestamp(),
  });

  await updateDoc(roomRef, {
    lastMessageText: text,
    lastMessageAt: serverTimestamp(),
  });
}
