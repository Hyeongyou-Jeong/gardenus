import {
  collection,
  query,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";

/* ================================================================
   타입 정의 — Firestore users/{uid} 문서 구조
   ================================================================ */

export interface MbtiPercentages {
  EI: number; // -100 ~ 100
  SN: number;
  TF: number;
  JP: number;
}

export interface UserDoc {
  /** Firestore 문서 ID (= Firebase Auth uid) */
  id: string;

  /* ---- 기본 프로필 ---- */
  name?: string;
  born?: string;
  gender?: boolean; // true = 남, false = 여
  height?: number;
  residence?: string;
  job?: string;
  school?: string;
  department?: string;
  aboutme?: string;
  profileImageId?: string;

  /* ---- MBTI ---- */
  mbti?: string; // e.g. "ENTP"
  mbtiPercentages?: MbtiPercentages;

  /* ---- 성향/선호 ---- */
  cigar?: string;
  call?: number;
  cute?: number;
  jealousy?: number;
  date?: number;
  forDate?: number;

  /* ---- 태그 배열 ---- */
  features?: string[];
  interests?: string[];
  idealType?: string[];

  /* ---- 플라워 & 설정 ---- */
  flower?: number;
  ad?: boolean;
  isProfileVisible?: boolean;
  reminderEnabled?: boolean;

  /* ---- 메타 데이터 ---- */
  signupDate?: Timestamp | null;

  /** Firestore에 추가 필드가 있을 수 있으므로 여유 */
  [key: string]: any;
}

/* ================================================================
   단건 조회
   ================================================================ */

/**
 * users/{uid} 문서 1건을 읽어온다.
 * 문서가 없으면 null.
 */
export async function fetchUser(uid: string): Promise<UserDoc | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) };
}

/* user info 불러오기 예시
import { fetchUser } from "@/domains/user/user.repo";

// 예시: 특정 uid의 학교 가져오기
const user = await fetchUser("6LiCf14ykRWbDsZvAdzo2sFw1O73");
const school = user?.school ?? "정보 없음";
console.log(school); // "한양대학교 서울캠퍼스"*/

/* ================================================================
   목록 조회
   ================================================================ */
/**
 * users 컬렉션에서 최대 limitN건을 가져온다.
 */
export async function fetchUsers(limitN: number = 30): Promise<UserDoc[]> {
  const q = query(collection(db, "users"), limit(limitN));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<UserDoc, "id">),
  }));
}

/* ================================================================
   생성 / 수정 (merge)
   ================================================================ */
/**
 * users/{uid} 문서를 생성하거나 병합 업데이트한다.
 * - 최초 생성 시 signupDate, flower, reminderEnabled 기본값 세팅
 */
export async function upsertUser(
  uid: string,
  data: Partial<Omit<UserDoc, "id">>,
): Promise<void> {
  const ref = doc(db, "users", uid);
  const existing = await getDoc(ref);

  const defaults: Record<string, unknown> = {};
  if (!existing.exists()) {
    defaults.signupDate = serverTimestamp();
    defaults.flower = data.flower ?? 0;
    defaults.reminderEnabled = data.reminderEnabled ?? false;
    defaults.ad = data.ad ?? false;
    defaults.isProfileVisible = data.isProfileVisible ?? false;
  }

  await setDoc(ref, { ...defaults, ...data }, { merge: true });
}

/* ================================================================
   프로필 전용 안전 저장
   ================================================================ */

/** 클라이언트에서 절대 수정하면 안 되는 민감 필드 */
const PROTECTED_FIELDS = [
  "flower", "signupDate", "id",
] as const;

/**
 * 프로필 편집 전용 저장.
 * - PROTECTED_FIELDS를 자동 제거하여 flower 등을 절대 덮어쓰지 않음
 * - updatedAt을 serverTimestamp()로 자동 추가
 * - height를 숫자로 변환
 */
export async function upsertMyProfile(
  uid: string,
  draft: Record<string, any>,
): Promise<void> {
  // 민감 필드 제거
  const safe: Record<string, any> = { ...draft };
  for (const key of PROTECTED_FIELDS) {
    delete safe[key];
  }

  // height 숫자 변환
  if (safe.height != null) {
    const h = parseInt(String(safe.height), 10);
    safe.height = Number.isNaN(h) ? undefined : h;
  }

  // name trim
  if (typeof safe.name === "string") {
    safe.name = safe.name.trim() || undefined;
  }

  // updatedAt 자동 추가
  safe.updatedAt = serverTimestamp();

  const ref = doc(db, "users", uid);
  await setDoc(ref, safe, { merge: true });
}

/**
 * users/{uid} 문서에서 특정 필드만 업데이트한다.
 * 문서가 반드시 존재해야 한다. (없으면 에러)
 *
 * @example
 *   await updateUserFields("abc123", { school: "서울대학교", height: 180 });
 */
export async function updateUserFields(
  uid: string,
  fields: Partial<Omit<UserDoc, "id">>,
): Promise<void> {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, fields);
}

/**
 * users/{uid} 문서에서 특정 필드를 삭제한다.
 *
 * @example
 *   await removeUserFields("abc123", ["job", "aboutme"]);
 */
export async function removeUserFields(
  uid: string,
  fieldNames: string[],
): Promise<void> {
  const ref = doc(db, "users", uid);
  const updates: Record<string, any> = {};
  for (const name of fieldNames) {
    updates[name] = deleteField();
  }
  await updateDoc(ref, updates);
}

/**
 * users/{uid} 문서를 통째로 삭제한다. (회원탈퇴 등)
 */
export async function deleteUser(uid: string): Promise<void> {
  const ref = doc(db, "users", uid);
  await deleteDoc(ref);
}

/* ================================================================
   실시간 구독
   ================================================================ */

/**
 * users/{uid} 문서 전체를 실시간 구독한다.
 * @returns unsubscribe 함수
 */
export function subscribeUser(
  uid: string,
  onChange: (user: UserDoc | null) => void,
): () => void {
  const ref = doc(db, "users", uid);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange({ id: snap.id, ...(snap.data() as Omit<UserDoc, "id">) });
    },
    (err) => {
      console.error("[user.repo] subscribeUser error:", err);
    },
  );
}

/**
 * users/{uid}.flower 필드만 실시간 구독한다. (가벼운 버전)
 * @returns unsubscribe 함수
 */
export function subscribeFlower(
  uid: string,
  onChange: (flower: number) => void,
): () => void {
  const ref = doc(db, "users", uid);

  return onSnapshot(
    ref,
    (snap) => {
      const flower = typeof snap.data()?.flower === "number" ? snap.data()!.flower : 0;
      onChange(flower as number);
    },
    (err) => {
      console.error("[user.repo] subscribeFlower error:", err);
    },
  );
}

/* ================================================================
   플라워 충전 (테스트용)
   ================================================================ */

/**
 * 문서가 없으면 생성(merge), 있으면 기존 flower에 amount를 더한다.
 */
export async function addFlower(uid: string, amount: number): Promise<void> {
  const ref = doc(db, "users", uid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data()?.flower as number) ?? 0;
    tx.set(ref, { flower: current + amount }, { merge: true });
  });
}
