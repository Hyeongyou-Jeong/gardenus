import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";

const functions = getFunctions(firebaseApp, "asia-northeast3");

export interface AvatarCandidate {
  index: number;
  storagePath: string;
}

interface GenerateProfileAvatarsResponse {
  ok: true;
  genId: string;
  candidates: AvatarCandidate[];
}

interface GenerateProfileAvatarsRequest {
  animal?: string | null;
}

interface ApplyProfileAvatarRequest {
  genId: string;
  selectedIndex: number;
}

interface ApplyProfileAvatarResponse {
  ok: true;
  selectedPath: string;
  deletedCount: number;
}

export async function generateProfileAvatars(
  payload: GenerateProfileAvatarsRequest,
): Promise<GenerateProfileAvatarsResponse> {
  const callable = httpsCallable<GenerateProfileAvatarsRequest, GenerateProfileAvatarsResponse>(
    functions,
    "generateProfileAvatars",
  );
  const result = await callable(payload);
  return result.data;
}

export async function applyProfileAvatar(
  payload: ApplyProfileAvatarRequest,
): Promise<ApplyProfileAvatarResponse> {
  const callable = httpsCallable<ApplyProfileAvatarRequest, ApplyProfileAvatarResponse>(
    functions,
    "applyProfileAvatar",
  );
  const result = await callable(payload);
  return result.data;
}
