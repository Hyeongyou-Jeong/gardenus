import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const db = getFirestore();
const storage = getStorage();
const CLOVA_OCR_ENDPOINT = defineSecret("CLOVA_OCR_ENDPOINT");
const CLOVA_OCR_SECRET = defineSecret("CLOVA_OCR_SECRET");

const REWARD_FLOWER = 30;

interface VerifyStudentIdRequest {
  storagePath: string;
}

interface OcrResult {
  isStudentIdLike: boolean;
  detectedSchool: string | null;
  candidates: string[];
  matchedCandidate: string | null;
  method: string;
  likeScore: number;
  reason: string;
}

type VerifyStudentIdResponse =
  | {
      ok: true;
      status: "approved";
      rewarded: boolean;
      detectedSchool: string;
      ocr: OcrResult;
    }
  | {
      ok: false;
      status: "retry";
      reason: string;
      detectedSchool: string | null;
      ocr: OcrResult | null;
    };

export const verifyStudentId = onCall<VerifyStudentIdRequest>(
  {
    region: "asia-northeast3",
    secrets: [CLOVA_OCR_ENDPOINT, CLOVA_OCR_SECRET],
  },
  async (request): Promise<VerifyStudentIdResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const storagePath = request.data?.storagePath;
    if (typeof storagePath !== "string" || storagePath.trim() === "") {
      throw new HttpsError(
        "invalid-argument",
        "storagePath는 비어있지 않은 문자열이어야 합니다.",
      );
    }

    const uid = request.auth.uid;
    const phone = request.auth.token.phone_number as string | undefined;
    const normalizedPath = storagePath.trim();
    const userRef = await resolveUserRef(uid, phone);
    console.info("[verifyStudentId] 시작", {
      uid,
      phone: phone ?? null,
      userDocId: userRef.id,
      storagePath: normalizedPath,
    });
    try {
      const userSnap = await userRef.get();
      const userSchoolRaw = userSnap.data()?.school;
      const userSchool =
        typeof userSchoolRaw === "string" ? userSchoolRaw.trim() : "";
      console.info("[verifyStudentId] 사용자 학교 확인", {
        userDocId: userRef.id,
        hasSchool: !!userSchool,
      });

      if (!userSchool) {
        await setRetryStatus(userRef, "missing_user_school", null);
        console.info("[verifyStudentId] 재시도 처리", {
          userDocId: userRef.id,
          reason: "missing_user_school",
        });
        return {
          ok: false,
          status: "retry",
          reason: "missing_user_school",
          detectedSchool: null,
          ocr: null,
        };
      }

      const imageBase64 = await downloadImageAsBase64(normalizedPath);
      const ocr = await requestClovaOcr(imageBase64, userSchool);
      console.info("[verifyStudentId] OCR 판정", {
        isStudentIdLike: ocr.isStudentIdLike,
        detectedSchool: ocr.detectedSchool,
        candidates: ocr.candidates,
        matchedCandidate: ocr.matchedCandidate,
        method: ocr.method,
        likeScore: ocr.likeScore,
        reason: ocr.reason,
      });
      const reasonByRule = classifyRetryReason(ocr);
      const approved = reasonByRule == null;

      if (approved) {
        const detectedSchool = ocr.detectedSchool as string;
        const rewarded = await applyApproveAndReward(userRef, detectedSchool);
        console.info("[verifyStudentId] 승인 완료", {
          userDocId: userRef.id,
          detectedSchool,
          likeScore: ocr.likeScore,
          rewarded,
        });
        return {
          ok: true,
          status: "approved",
          detectedSchool,
          rewarded,
          ocr,
        };
      }

      const reason = reasonByRule ?? "school_mismatch";

      await setRetryStatus(userRef, reason, ocr.detectedSchool);
      console.info("[verifyStudentId] 재시도 처리", {
        userDocId: userRef.id,
        reason,
        detectedSchool: ocr.detectedSchool,
        likeScore: ocr.likeScore,
      });

      return {
        ok: false,
        status: "retry",
        detectedSchool: ocr.detectedSchool,
        reason,
        ocr,
      };
    } catch (error) {
      console.error("[verifyStudentId] 처리 실패:", error);
      const reason = mapUnhandledErrorToReason(error);
      await setRetryStatus(userRef, reason, null);
      console.info("[verifyStudentId] 예외 재시도 처리", {
        userDocId: userRef.id,
        reason,
      });
      return {
        ok: false,
        status: "retry",
        reason,
        detectedSchool: null,
        ocr: null,
      };
    } finally {
      await tryDeleteUploadedFile(normalizedPath);
      console.info("[verifyStudentId] 종료", {
        userDocId: userRef.id,
        storagePath: normalizedPath,
      });
    }
  },
);

async function resolveUserRef(
  uid: string,
  phone?: string,
): Promise<FirebaseFirestore.DocumentReference> {
  if (phone) {
    const phoneRef = db.collection("users").doc(phone);
    const phoneSnap = await phoneRef.get();
    if (phoneSnap.exists) return phoneRef;
  }
  return db.collection("users").doc(uid);
}

async function setRetryStatus(
  userRef: FirebaseFirestore.DocumentReference,
  reason: string,
  detectedSchool: string | null,
): Promise<void> {
  await userRef.set(
    {
      studentIdVerificationStatus: "retry",
      studentIdVerificationReason: reason,
      studentIdVerificationLastDetectedSchool: detectedSchool,
    },
    { merge: true },
  );
}

async function applyApproveAndReward(
  userRef: FirebaseFirestore.DocumentReference,
  detectedSchool: string | null,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.data() ?? {};
    const flower = typeof data.flower === "number" ? data.flower : 0;
    const alreadyRewarded = data.schoolVerifyRewardedAt != null;
    const payload: Record<string, unknown> = {
      schoolVerified: true,
      schoolVerifiedAt: FieldValue.serverTimestamp(),
      schoolVerifiedDetectedSchool: detectedSchool,
      studentIdVerificationStatus: "approved",
      studentIdVerificationReason: FieldValue.delete(),
      studentIdVerificationLastDetectedSchool: FieldValue.delete(),
    };

    if (!alreadyRewarded) {
      payload.flower = flower + REWARD_FLOWER;
      payload.schoolVerifyRewardedAt = FieldValue.serverTimestamp();
    }

    tx.set(userRef, payload, { merge: true });
    return !alreadyRewarded;
  });
}

async function downloadImageAsBase64(storagePath: string): Promise<string> {
  const file = storage.bucket().file(storagePath);
  const [buffer] = await file.download();
  if (!buffer || buffer.length === 0) {
    throw new Error("빈 파일입니다.");
  }
  return buffer.toString("base64");
}

async function requestClovaOcr(
  imageBase64: string,
  userSchool: string,
): Promise<OcrResult> {
  const endpoint = CLOVA_OCR_ENDPOINT.value();
  const secret = CLOVA_OCR_SECRET.value();
  if (!endpoint || !secret) {
    throw new Error("CLOVA_OCR secret이 설정되지 않았습니다.");
  }

  const body = {
    version: "V2",
    requestId: `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    images: [
      {
        format: "jpg",
        name: "studentId",
        data: imageBase64,
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "X-OCR-SECRET": secret,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CLOVA_OCR 요청 실패: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return parseOcrResult(payload, userSchool);
}

function parseOcrResult(
  payload: Record<string, unknown>,
  userSchool: string,
): OcrResult {
  const lines = extractLinesFromClova(payload);
  const fullText = lines.join(" ").trim();
  const candidates = extractSchoolCandidates(lines);
  const match = matchAnyCandidate(userSchool, candidates);
  const isStudentIdLike =
    candidates.length >= 1 && normalize(fullText).length >= 15;
  const detectedSchool = match.matchedCandidate;
  const likeScore = isStudentIdLike ? 1 : 0;
  const reason = match.reason;

  return {
    isStudentIdLike,
    detectedSchool,
    candidates,
    matchedCandidate: match.matchedCandidate,
    method: match.method,
    likeScore,
    reason,
  };
}

function extractLinesFromClova(payload: Record<string, unknown>): string[] {
  const images = payload.images;
  if (!Array.isArray(images) || images.length === 0) return [];
  const firstImage = images[0];
  if (typeof firstImage !== "object" || firstImage == null) return [];
  const fields = (firstImage as { fields?: unknown }).fields;
  if (!Array.isArray(fields)) return [];

  const lines: string[] = [];
  for (const field of fields) {
    if (typeof field !== "object" || field == null) continue;
    const inferText = (field as { inferText?: unknown }).inferText;
    if (typeof inferText !== "string") continue;
    const normalized = inferText.trim();
    if (normalized) lines.push(normalized);
  }
  return lines;
}

function normalize(value: string): string {
  return value
    .trim()
    .replace(/\(.*?\)/g, "")
    .replace(/[·\-_:\/\.,]/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

function extractSchoolCandidates(lines: string[]): string[] {
  const unique = new Map<string, string>();
  for (const line of lines) {
    if (!/(대학|대학교|UNIVERSITY)/i.test(line)) continue;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const normalized = normalize(trimmed);
    if (!normalized || normalized.length > 60) continue;
    const candidate = trimmed.slice(0, 120);
    if (!unique.has(normalized)) unique.set(normalized, candidate);
    if (unique.size >= 10) break;
  }
  return Array.from(unique.values());
}

function matchAnyCandidate(
  userSchool: string,
  candidates: string[],
): { matched: boolean; matchedCandidate: string | null; method: string; reason: string } {
  const userNorm = normalize(userSchool);
  const allowContains = userNorm.length >= 4;

  for (const candidate of candidates) {
    const candNorm = normalize(candidate);
    if (candNorm === userNorm) {
      return {
        matched: true,
        matchedCandidate: candidate,
        method: "candidate_match",
        reason: "matched_by_strict",
      };
    }
  }

  if (allowContains) {
    for (const candidate of candidates) {
      const candNorm = normalize(candidate);
      if (candNorm.includes(userNorm) || userNorm.includes(candNorm)) {
        return {
          matched: true,
          matchedCandidate: candidate,
          method: "candidate_match",
          reason: "matched_by_contains",
        };
      }
    }
  }

  return {
    matched: false,
    matchedCandidate: null,
    method: "candidate_match",
    reason: allowContains ? "no_match" : "no_match_strict_only",
  };
}

function classifyRetryReason(ocr: OcrResult): string | null {
  if (!ocr.isStudentIdLike) return "not_student_id_like";
  if (ocr.candidates.length === 0) return "no_candidate";
  if (!ocr.matchedCandidate) return "school_mismatch";
  return null;
}

function mapUnhandledErrorToReason(error: unknown): string {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (message.includes("storage")) return "storage_error";
  if (message.includes("clova_ocr")) return "ocr_error";
  if (message.includes("ocr")) return "ocr_error";
  return "ocr_error";
}

async function tryDeleteUploadedFile(storagePath: string): Promise<void> {
  try {
    await storage.bucket().file(storagePath).delete({ ignoreNotFound: true });
  } catch (error) {
    console.warn("[verifyStudentId] 업로드 파일 삭제 실패:", storagePath, error);
  }
}

