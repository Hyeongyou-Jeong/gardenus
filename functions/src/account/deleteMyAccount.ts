import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const db = getFirestore();

/**
 * 회원 탈퇴 callable function.
 *
 * 1. users/{uid} 문서 + 하위 서브컬렉션 재귀 삭제
 * 2. matchRequests 중 fromUid==uid / toUid==uid 문서 삭제
 * 3. Firebase Auth 계정 삭제
 */
export const deleteAccount = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const authUid = request.auth.uid;
    const email = request.auth.token.email as string | undefined;
    const phone = request.auth.token.phone_number as string | undefined;

    const userKeys = new Set<string>();
    const loginId = extractLoginIdFromEmail(email);
    if (loginId) userKeys.add(loginId);
    if (phone) userKeys.add(phone);
    userKeys.add(authUid);
    const byAuthUid = await listUserDocIdsByAuthUid(authUid);
    for (const docId of byAuthUid) userKeys.add(docId);

    // 1) users/{key} 재귀 삭제 (문서 + 하위 서브컬렉션)
    for (const key of userKeys) {
      const userRef = db.doc(`users/${key}`);
      await db.recursiveDelete(userRef);
    }

    // 2) matchRequests 에서 관련 문서 삭제 (fromUid 또는 toUid가 key)
    for (const key of userKeys) {
      await deleteMatchRequestsByField("fromUid", key);
      await deleteMatchRequestsByField("toUid", key);
    }

    // 3) Firebase Auth 계정 삭제
    await getAuth().deleteUser(authUid);

    return { ok: true };
  },
);

function extractLoginIdFromEmail(email?: string): string | null {
  if (!email) return null;
  const m = email.toLowerCase().match(/^([^@]+)@gardenus\.local$/);
  return m?.[1] ?? null;
}

async function deleteMatchRequestsByField(
  field: string,
  uid: string,
): Promise<void> {
  const snap = await db
    .collection("matchRequests")
    .where(field, "==", uid)
    .get();

  if (snap.empty) return;

  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
}

async function listUserDocIdsByAuthUid(authUid: string): Promise<string[]> {
  const snap = await db
    .collection("users")
    .where("authUid", "==", authUid)
    .get();
  if (snap.empty) return [];
  return snap.docs.map((d) => d.id);
}
