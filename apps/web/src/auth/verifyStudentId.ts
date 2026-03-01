import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";

const functions = getFunctions(firebaseApp, "asia-northeast3");

export interface VerifyStudentIdOcrResult {
  isStudentIdLike: boolean;
  detectedSchool: string | null;
  candidates: string[];
  matchedCandidate: string | null;
  method: string;
  likeScore: number;
  reason: string;
}

export interface VerifyStudentIdSuccess {
  ok: true;
  status: "approved";
  detectedSchool: string;
  rewarded: boolean;
  ocr: VerifyStudentIdOcrResult;
}

export interface VerifyStudentIdRetry {
  ok: false;
  status: "retry";
  detectedSchool: string | null;
  reason:
    | "missing_user_school"
    | "school_mismatch"
    | "not_student_id_like"
    | "no_candidate"
    | "ocr_error"
    | "storage_error"
    | string;
  ocr: VerifyStudentIdOcrResult | null;
}

export type VerifyStudentIdResult =
  | VerifyStudentIdSuccess
  | VerifyStudentIdRetry;

export async function verifyStudentId(
  storagePath: string,
): Promise<VerifyStudentIdResult> {
  const callable = httpsCallable<{ storagePath: string }, VerifyStudentIdResult>(
    functions,
    "verifyStudentId",
  );
  const result = await callable({ storagePath });
  return result.data;
}
