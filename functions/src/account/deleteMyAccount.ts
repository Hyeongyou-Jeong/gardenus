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

    const uid = request.auth.uid;
    const phone = request.auth.token.phone_number as string | undefined;
    const userKey = phone || uid;

    // 1) users/{userKey} 재귀 삭제 (문서 + 하위 서브컬렉션)
    const userRef = db.doc(`users/${userKey}`);
    await db.recursiveDelete(userRef);

    // 2) matchRequests 에서 관련 문서 삭제 (fromUid 또는 toUid가 userKey)
    await deleteMatchRequestsByField("fromUid", userKey);
    await deleteMatchRequestsByField("toUid", userKey);

    // 3) Firebase Auth 계정 삭제
    await getAuth().deleteUser(uid);

    return { ok: true };
  },
);

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
