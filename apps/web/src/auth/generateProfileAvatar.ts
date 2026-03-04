import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";

const functions = getFunctions(firebaseApp, "asia-northeast3");

export type AvatarStyle = "3d" | "illustration" | "photo";

interface GenerateProfileAvatarRequest {
  style?: AvatarStyle;
}

interface GenerateProfileAvatarResponse {
  photoURL: string;
}

export async function generateProfileAvatar(
  style: AvatarStyle = "3d",
): Promise<GenerateProfileAvatarResponse> {
  const callable = httpsCallable<
    GenerateProfileAvatarRequest,
    GenerateProfileAvatarResponse
  >(functions, "generateProfileAvatar");
  const result = await callable({ style });
  return result.data;
}
