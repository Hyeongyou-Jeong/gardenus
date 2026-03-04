import { randomUUID } from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import OpenAI from "openai";

const db = getFirestore();
const storage = getStorage();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

type AvatarStyle = "3d" | "illustration" | "photo";

interface GenerateProfileAvatarRequest {
  style?: AvatarStyle;
}

interface GenerateProfileAvatarResponse {
  photoURL: string;
}

export const generateProfileAvatar = onCall<GenerateProfileAvatarRequest>(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY],
  },
  async (request): Promise<GenerateProfileAvatarResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email as string | undefined;
    const phone = request.auth.token.phone_number as string | undefined;
    const style = normalizeStyle(request.data?.style);
    const userRef = await resolveUserRef(uid, email, phone);
    const userSnap = await userRef.get();
    const profile = (userSnap.data() ?? {}) as Record<string, unknown>;

    const prompt = buildAvatarPrompt(profile, style);
    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "OPENAI_API_KEY가 설정되지 않았습니다.");
    }

    try {
      const client = new OpenAI({ apiKey });
      const imageResponse = await client.images.generate({
        model: "gpt-image-1-mini",
        prompt,
        size: "1024x1024",
      });

      const base64 = imageResponse.data?.[0]?.b64_json;
      if (!base64) {
        throw new Error("이미지 생성 결과가 비어 있습니다.");
      }

      const buffer = Buffer.from(base64, "base64");
      const filePath = `users/${uid}/avatars/${Date.now()}.png`;
      const file = storage.bucket().file(filePath);
      const token = randomUUID();

      await file.save(buffer, {
        contentType: "image/png",
        resumable: false,
        metadata: {
          cacheControl: "public,max-age=31536000",
          metadata: {
            firebaseStorageDownloadTokens: token,
          },
        },
      });

      const bucketName = storage.bucket().name;
      const encodedPath = encodeURIComponent(filePath);
      const photoURL =
        `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}` +
        `?alt=media&token=${token}`;

      await userRef.set(
        {
          aiPhotoURL: photoURL,
          photoURL,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );

      return { photoURL };
    } catch (error) {
      console.error("[generateProfileAvatar] 실패:", error);
      throw new HttpsError(
        "internal",
        "AI 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  },
);

function normalizeStyle(value?: string): AvatarStyle {
  if (value === "illustration" || value === "photo" || value === "3d") {
    return value;
  }
  return "3d";
}

async function resolveUserRef(
  uid: string,
  email?: string,
  phone?: string,
): Promise<FirebaseFirestore.DocumentReference> {
  const loginId = extractLoginIdFromEmail(email);
  if (loginId) {
    const loginRef = db.collection("users").doc(loginId);
    const loginSnap = await loginRef.get();
    if (loginSnap.exists) return loginRef;
  }

  const uidRef = db.collection("users").doc(uid);
  const uidSnap = await uidRef.get();
  if (uidSnap.exists) return uidRef;

  if (phone) {
    const phoneRef = db.collection("users").doc(phone);
    const phoneSnap = await phoneRef.get();
    if (phoneSnap.exists) return phoneRef;
  }

  return uidRef;
}

function extractLoginIdFromEmail(email?: string): string | null {
  if (!email) return null;
  const m = email.toLowerCase().match(/^([^@]+)@gardenus\.local$/);
  return m?.[1] ?? null;
}

function buildAvatarPrompt(
  profile: Record<string, unknown>,
  style: AvatarStyle,
): string {
  const name = toSafeText(profile.name);
  const age = getAgeFromProfile(profile);
  const school = toSafeText(profile.school);
  const department = toSafeText(profile.department);
  const intro = toSafeText(profile.aboutme);
  const hobbies = toStringList(profile.interests).slice(0, 5);

  const stylePrompt = styleToPrompt(style);
  const safeIntroKeywords = intro
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");

  const profileText = [
    name ? `name: ${name}` : null,
    age ? `age: ${age}` : null,
    school ? `university: ${school}` : null,
    department ? `major: ${department}` : null,
    safeIntroKeywords ? `vibe keywords: ${safeIntroKeywords}` : null,
    hobbies.length ? `hobbies: ${hobbies.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  return [
    "Create a single square profile avatar.",
    "Safe, non-sexual.",
    "Do not depict real people or celebrities.",
    "No text, no watermark.",
    stylePrompt,
    "Pastel mint background, friendly smile, half-body centered, soft lighting.",
    profileText ? `Profile: ${profileText}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function styleToPrompt(style: AvatarStyle): string {
  if (style === "illustration") {
    return "Style: cute illustration avatar, clean line-art, soft shading.";
  }
  if (style === "photo") {
    return "Style: stylized photo-like avatar illustration, not a real human photo.";
  }
  return "Style: 3D cute avatar.";
}

function toSafeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, 80);
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
}

function getAgeFromProfile(profile: Record<string, unknown>): number | null {
  const directAge = profile.age;
  if (typeof directAge === "number" && Number.isFinite(directAge)) {
    return Math.max(0, Math.floor(directAge));
  }

  const bornRaw = profile.born;
  if (typeof bornRaw === "string" && /^\d{4}$/.test(bornRaw)) {
    const bornYear = Number.parseInt(bornRaw, 10);
    const currentYear = new Date().getFullYear();
    const age = currentYear - bornYear + 1;
    return age > 0 ? age : null;
  }

  return null;
}
