import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

initializeApp();
const db = getFirestore();

const POKE_WINDOW_MS = 48 * 60 * 60 * 1000;
const POKE_MAX_COUNT = 3;

function getCallerUid(request: { auth?: { uid: string; token: Record<string, unknown> } }) {
  const email = request.auth?.token?.email;
  if (typeof email === "string") {
    const m = email.toLowerCase().match(/^([^@]+)@gardenus\.local$/);
    if (m) return m[1];
  }
  const phone = request.auth?.token?.phone_number;
  if (typeof phone === "string" && phone.trim() !== "") return phone;
  return request.auth?.uid ?? "";
}

export const leaveChatRoom = onCall<{ roomId: string }>(
  { region: "asia-northeast3" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const roomId = request.data?.roomId?.trim();
    if (!roomId) {
      throw new HttpsError("invalid-argument", "roomId는 필수입니다.");
    }

    const meUid = getCallerUid(request);
    const roomRef = db.collection("chatRooms").doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
      throw new HttpsError("not-found", "채팅방을 찾을 수 없습니다.");
    }

    const participants = roomSnap.data()?.participants;
    if (!Array.isArray(participants) || !participants.includes(meUid)) {
      throw new HttpsError("permission-denied", "채팅방 참여자가 아닙니다.");
    }

    await roomRef.set(
      {
        status: "EXPIRED",
        expiredBy: meUid,
        expiredAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true };
  },
);

export const pokeChatRoom = onCall<{ roomId: string }>(
  { region: "asia-northeast3" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const roomId = request.data?.roomId?.trim();
    if (!roomId) {
      throw new HttpsError("invalid-argument", "roomId는 필수입니다.");
    }

    const meUid = getCallerUid(request);
    const now = Date.now();
    const roomRef = db.collection("chatRooms").doc(roomId);
    const pokeRef = roomRef.collection("pokeStats").doc(meUid);

    const txResult = await db.runTransaction(async (tx) => {
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists) {
        throw new HttpsError("not-found", "채팅방을 찾을 수 없습니다.");
      }
      const participants = roomSnap.data()?.participants;
      if (!Array.isArray(participants) || !participants.includes(meUid)) {
        throw new HttpsError("permission-denied", "채팅방 참여자가 아닙니다.");
      }
      const roomStatus = roomSnap.data()?.status;
      if (roomStatus === "EXPIRED") {
        throw new HttpsError("failed-precondition", "종료된 채팅방입니다.");
      }
      const targetUid = participants.find(
        (uid): uid is string => typeof uid === "string" && uid !== meUid,
      );
      if (!targetUid) {
        throw new HttpsError("failed-precondition", "상대 사용자를 찾을 수 없습니다.");
      }

      const pokeSnap = await tx.get(pokeRef);
      const rawTimestamps = pokeSnap.data()?.timestamps;
      const timestamps = Array.isArray(rawTimestamps)
        ? rawTimestamps.filter((v): v is number => typeof v === "number")
        : [];
      const validTimestamps = timestamps
        .filter((ts) => now - ts < POKE_WINDOW_MS)
        .sort((a, b) => a - b);

      if (validTimestamps.length >= POKE_MAX_COUNT) {
        const retryAt = validTimestamps[0] + POKE_WINDOW_MS;
        return {
          ok: false as const,
          remaining: 0,
          retryAt,
          targetUid,
        };
      }

      const next = [...validTimestamps, now].sort((a, b) => a - b);
      tx.set(
        pokeRef,
        {
          timestamps: next,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return {
        ok: true as const,
        remaining: POKE_MAX_COUNT - next.length,
        retryAt: undefined,
        targetUid,
      };
    });

    if (!txResult.ok) {
      return {
        ok: false,
        remaining: txResult.remaining,
        retryAt: txResult.retryAt,
      };
    }

    await db
      .collection("users")
      .doc(txResult.targetUid)
      .collection("notifications")
      .add({
        type: "SYSTEM",
        title: "콕 찌르기",
        body: `${meUid}님이 콕 찔렀어요.`,
        roomId,
        fromUid: meUid,
        createdAt: FieldValue.serverTimestamp(),
      });

    return {
      ok: true,
      remaining: txResult.remaining,
    };
  },
);

export { verifyPayment } from "./payment/verifyPayment";
export { verifyStudentId } from "./verification/verifyStudentId";
export { generateProfileAvatar } from "./avatar/generateProfileAvatar";
export {
  onMatchRequestCreated,
  onMatchRequestUpdated,
} from "./notifications/matchRequestTriggers";
export { deleteAccount } from "./account/deleteMyAccount";
