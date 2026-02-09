import {
  collection,
  query,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import type { UserProfile } from "./profile.types";

/**
 * Firestore `users` 컬렉션에서 프로필 목록을 가져온다.
 * doc.data()를 그대로 spread — 필드 매핑은 UI 쪽에서 fallback 처리.
 */
export async function fetchUserProfiles(
  limitN: number = 30
): Promise<UserProfile[]> {
  const q = query(collection(db, "users"), limit(limitN));
  const snapshot = await getDocs(q);

  if (snapshot.docs.length > 0) {
    const first = snapshot.docs[0].data();
    console.log("[users sample raw]", snapshot.docs[0].id, first);
    console.log("[users loaded first]", first?.name, first?.profile);
  } else {
    console.warn("[users] 컬렉션이 비어있습니다.");
  }

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserProfile, "id">),
  }));
}

/* ----------------------------------------------------------------
   내 프로필 (단일 문서)
   ---------------------------------------------------------------- */

/**
 * users/{uid} 단일 문서를 읽어온다.
 * 문서가 없으면 null 반환.
 */
export async function fetchMyProfile(
  uid: string
): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserProfile, "id">) };
}

/**
 * users/{uid} 문서를 생성하거나 병합 업데이트한다.
 * - 최초 생성 시 signupDate가 없으면 serverTimestamp()로 채움
 * - flower 기본값 0, reminderEnabled 기본값 false
 */
export async function upsertMyProfile(
  uid: string,
  data: Partial<Omit<UserProfile, "id">>
): Promise<void> {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);

  const defaults: Record<string, unknown> = {};
  if (!existing.exists()) {
    // 최초 생성 시 기본값
    defaults.signupDate = serverTimestamp();
    defaults.flower = data.flower ?? 0;
    defaults.reminderEnabled = data.reminderEnabled ?? false;
  }

  await setDoc(ref, { ...defaults, ...data }, { merge: true });
}
