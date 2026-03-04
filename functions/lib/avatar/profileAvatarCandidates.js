"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyProfileAvatar = exports.generateProfileAvatars = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const openai_1 = __importDefault(require("openai"));
const db = (0, firestore_1.getFirestore)();
const storage = (0, storage_1.getStorage)();
const OPENAI_API_KEY = (0, params_1.defineSecret)("OPENAI_API_KEY");
const AVATAR_COUNT = 4;
const FIXED_AVATAR_PROMPT = `Create a single square 1:1 profile avatar.

Style: stylized 3D cartoon character, simple clean shapes, soft pastel black and white color palette.
NOT photorealistic. NOT realistic. NOT human-like proportions.
More like a character illustration than a real animal.

Subject:
Adorable anthropomorphic hamster character.
total body view, 1:1 ratio torso and head, centered but with breathing room.
Body proportions cartoonish (rounded shapes, simplified limbs).

Face:
Moderately large expressive eyes,
small nose,
soft rounded cheeks,
friendly confident smile.
Cute but not childish.

Action:
playing a videa game
Keep the pose elegant and relaxed (not exaggerated, not dramatic).

Background:
Clean pastel black and white background with ONE subtle soft music-note silhouette or faint light glow behind the character.
Minimal and uncluttered.

Outfit:
Simple sporty hoodie, no complex patterns.

Avoid:
realistic fur texture, realistic lighting, excessive detail, complex background,
dramatic rockstar pose, exaggerated motion, ugly, creepy, scary, grotesque, meme,
deformed, extra limbs, blurry.

No text, no watermark, no logo.`;
exports.generateProfileAvatars = (0, https_1.onCall)({
    region: "asia-northeast3",
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 300,
    memory: "1GiB",
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
        throw new https_1.HttpsError("failed-precondition", "OPENAI_API_KEY가 설정되지 않았습니다.");
    }
    const uid = request.auth.uid;
    const genId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    console.info("[generateProfileAvatars] start", { uid, genId });
    try {
        const client = new openai_1.default({ apiKey });
        const imageResponse = await client.images.generate({
            model: "gpt-image-1.5",
            prompt: FIXED_AVATAR_PROMPT,
            n: AVATAR_COUNT,
            size: "1024x1024",
            quality: "low",
        });
        const candidates = [];
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
    }
    catch (error) {
        console.error("[generateProfileAvatars] 실패:", error);
        throw new https_1.HttpsError("internal", "AI 프로필 이미지 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
    }
});
exports.applyProfileAvatar = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const genId = sanitizeGenId(request.data?.genId);
    const selectedIndex = request.data?.selectedIndex;
    if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
        throw new https_1.HttpsError("invalid-argument", "selectedIndex는 0~3 정수여야 합니다.");
    }
    if (!genId) {
        throw new https_1.HttpsError("invalid-argument", "genId가 올바르지 않습니다.");
    }
    const selectedPath = `generatedAvatars/${uid}/${genId}/${selectedIndex}.png`;
    const selectedFile = storage.bucket().file(selectedPath);
    const [exists] = await selectedFile.exists();
    if (!exists) {
        throw new https_1.HttpsError("invalid-argument", "선택한 이미지가 존재하지 않습니다.");
    }
    const email = request.auth.token.email;
    const phone = request.auth.token.phone_number;
    const userRef = await resolveUserRef(uid, email, phone);
    await userRef.set({
        profileImagePath: selectedPath,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    let deletedCount = 0;
    const deleteTargets = [0, 1, 2, 3]
        .filter((index) => index !== selectedIndex)
        .map((index) => `generatedAvatars/${uid}/${genId}/${index}.png`);
    const deleteResults = await Promise.allSettled(deleteTargets.map(async (path) => {
        try {
            await storage.bucket().file(path).delete({ ignoreNotFound: true });
            return true;
        }
        catch (error) {
            console.warn("[applyProfileAvatar] 후보 이미지 삭제 실패:", { path, error });
            return false;
        }
    }));
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
});
function sanitizeGenId(genId) {
    if (typeof genId !== "string")
        return "";
    const trimmed = genId.trim();
    if (!/^[a-zA-Z0-9_-]{6,80}$/.test(trimmed))
        return "";
    return trimmed;
}
async function resolveUserRef(uid, email, phone) {
    const loginId = extractLoginIdFromEmail(email);
    if (loginId) {
        const loginRef = db.collection("users").doc(loginId);
        const loginSnap = await loginRef.get();
        if (loginSnap.exists)
            return loginRef;
    }
    const uidRef = db.collection("users").doc(uid);
    const uidSnap = await uidRef.get();
    if (uidSnap.exists)
        return uidRef;
    if (phone) {
        const phoneRef = db.collection("users").doc(phone);
        const phoneSnap = await phoneRef.get();
        if (phoneSnap.exists)
            return phoneRef;
    }
    return uidRef;
}
function extractLoginIdFromEmail(email) {
    if (!email)
        return null;
    const m = email.toLowerCase().match(/^([^@]+)@gardenus\.local$/);
    return m?.[1] ?? null;
}
//# sourceMappingURL=profileAvatarCandidates.js.map