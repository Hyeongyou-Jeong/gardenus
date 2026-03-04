import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import OpenAI from "openai";
import { buildAvatarPrompt, type AvatarPromptInput } from "./avatarPromptBuilder";

const db = getFirestore();
const storage = getStorage();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

const AVATAR_COUNT = 4;

interface GenerateProfileAvatarsResponse {
  ok: true;
  genId: string;
  candidates: Array<{ index: number; storagePath: string }>;
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

export const generateProfileAvatars = onCall<GenerateProfileAvatarsRequest | undefined>(
  {
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 300,
    memory: "1GiB",
  },
  async (request): Promise<GenerateProfileAvatarsResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "OPENAI_API_KEY가 설정되지 않았습니다.");
    }

    const uid = request.auth.uid;
    const email = request.auth.token.email as string | undefined;
    const phone = request.auth.token.phone_number as string | undefined;
    const genId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.info("[generateProfileAvatars] start", { uid, genId });

    try {
      const userRef = await resolveUserRef(uid, email, phone);
      const userSnap = await userRef.get();
      const profile = (userSnap.data() ?? {}) as Record<string, unknown>;
      const prompt = buildAvatarPrompt(
        toAvatarPromptInput(profile, request.data?.animal),
      );

      const client = new OpenAI({ apiKey });
      const imageResponse = await client.images.generate({
        model: "gpt-image-1.5",
        prompt,
        n: AVATAR_COUNT,
        size: "1024x1024",
        quality: "low",
      });

      const candidates: Array<{ index: number; storagePath: string }> = [];

      for (let index = 0; index < AVATAR_COUNT; index += 1) {
        const base64 = imageResponse.data?.[index]?.b64_json;
        if (!base64) {
          throw new Error(`이미지 생성 결과가 비어 있습니다. index=${index}`);
        }
        const buffer = Buffer.from(base64, "base64");
        const storagePath = `generatedAvatars/${uid}/${genId}/${index}.png`;
        const file = storage.bucket().file(storagePath);
        await file.save(buffer, {
          contentType: "image/png",
          resumable: false,
          metadata: {
            cacheControl: "private,max-age=3600",
          },
        });
        candidates.push({ index, storagePath });
      }

      console.info("[generateProfileAvatars] success", {
        uid,
        genId,
        count: candidates.length,
      });

      return {
        ok: true,
        genId,
        candidates,
      };
    } catch (error) {
      console.error("[generateProfileAvatars] 실패:", error);
      throw new HttpsError(
        "internal",
        "AI 프로필 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
    }
  },
);

export const applyProfileAvatar = onCall<ApplyProfileAvatarRequest>(
  { region: "asia-northeast3" },
  async (request): Promise<ApplyProfileAvatarResponse> => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const uid = request.auth.uid;
    const genId = sanitizeGenId(request.data?.genId);
    const selectedIndex = request.data?.selectedIndex;

    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
      throw new HttpsError("invalid-argument", "selectedIndex는 0~3 정수여야 합니다.");
    }

    if (!genId) {
      throw new HttpsError("invalid-argument", "genId가 올바르지 않습니다.");
    }

    const selectedPath = `generatedAvatars/${uid}/${genId}/${selectedIndex}.png`;
    const selectedFile = storage.bucket().file(selectedPath);
    const [exists] = await selectedFile.exists();
    if (!exists) {
      throw new HttpsError("invalid-argument", "선택한 이미지가 존재하지 않습니다.");
    }

    const email = request.auth.token.email as string | undefined;
    const phone = request.auth.token.phone_number as string | undefined;
    const userRef = await resolveUserRef(uid, email, phone);

    await userRef.set(
      {
        profileImagePath: selectedPath,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    let deletedCount = 0;
    const deleteTargets = [0, 1, 2, 3]
      .filter((index) => index !== selectedIndex)
      .map((index) => `generatedAvatars/${uid}/${genId}/${index}.png`);

    const deleteResults = await Promise.allSettled(
      deleteTargets.map(async (path) => {
        try {
          await storage.bucket().file(path).delete({ ignoreNotFound: true });
          return true;
        } catch (error) {
          console.warn("[applyProfileAvatar] 후보 이미지 삭제 실패:", { path, error });
          return false;
        }
      }),
    );

    for (const result of deleteResults) {
      if (result.status === "fulfilled" && result.value) {
        deletedCount += 1;
      }
    }

    return {
      ok: true,
      selectedPath,
      deletedCount,
    };
  },
);

function sanitizeGenId(genId?: string): string {
  if (typeof genId !== "string") return "";
  const trimmed = genId.trim();
  if (!/^[a-zA-Z0-9_-]{6,80}$/.test(trimmed)) return "";
  return trimmed;
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

function toAvatarPromptInput(
  profile: Record<string, unknown>,
  requestedAnimal?: string | null,
): AvatarPromptInput {
  const rawGender = profile.gender;
  const gender =
    rawGender === true
      ? "male"
      : rawGender === false
        ? "female"
        : rawGender === "male" || rawGender === "female" || rawGender === "other"
          ? rawGender
          : "other";

  const rawAnimal = requestedAnimal ?? profile.animal ?? profile.avatarAnimal;
  const animal = mapAnimalForPrompt(rawAnimal);

  const rawInterests = profile.interests;
  const interests = Array.isArray(rawInterests)
    ? rawInterests.filter((v): v is string => typeof v === "string")
    : null;

  const rawTraits = profile.traits ?? profile.features;
  const traits = Array.isArray(rawTraits)
    ? rawTraits.filter((v): v is string => typeof v === "string")
    : null;

  return {
    gender,
    animal,
    interests,
    traits,
  };
}

function mapAnimalForPrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;

  const lower = raw.toLowerCase();
  const mapped: Record<string, string | null> = {
    "ai recommand": null,
    cat: "cat",
    fox: "fox",
    doberman: "doberman dog",
    retreiver: "retriever dog",
    bichon: "bichon dog",
    maltipoo: "maltipoo dog",
    omit: "tiger",
    "brown bear": "brown bear",
    otter: "otter",
    "teddy bear": "teddy bear",
    hamster: "hamster",
    panda: "panda",
    rabbit: "rabbit",
    "fennec fox": "fennec fox",
    orca: "orca",
    hedgehog: "hedgehog",
    sheep: "sheep",
    marten: "marten",
  };

  if (Object.prototype.hasOwnProperty.call(mapped, lower)) {
    return mapped[lower];
  }
  return raw;
}
