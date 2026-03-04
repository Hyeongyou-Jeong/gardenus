"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyStudentId = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const firestore_1 = require("firebase-admin/firestore");
const storage_1 = require("firebase-admin/storage");
const db = (0, firestore_1.getFirestore)();
const storage = (0, storage_1.getStorage)();
const CLOVA_OCR_ENDPOINT = (0, params_1.defineSecret)("CLOVA_OCR_ENDPOINT");
const CLOVA_OCR_SECRET = (0, params_1.defineSecret)("CLOVA_OCR_SECRET");
const REWARD_FLOWER = 30;
exports.verifyStudentId = (0, https_1.onCall)({
    region: "asia-northeast3",
    secrets: [CLOVA_OCR_ENDPOINT, CLOVA_OCR_SECRET],
}, async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const storagePath = request.data?.storagePath;
    if (typeof storagePath !== "string" || storagePath.trim() === "") {
        throw new https_1.HttpsError("invalid-argument", "storagePath는 비어있지 않은 문자열이어야 합니다.");
    }
    const uid = request.auth.uid;
    const email = request.auth.token.email;
    const phone = request.auth.token.phone_number;
    const normalizedPath = storagePath.trim();
    const userRef = await resolveUserRef(uid, email, phone);
    console.info("[verifyStudentId] 시작", {
        uid,
        email: email ?? null,
        phone: phone ?? null,
        userDocId: userRef.id,
        storagePath: normalizedPath,
    });
    try {
        const userSnap = await userRef.get();
        const userSchoolRaw = userSnap.data()?.school;
        const userSchool = typeof userSchoolRaw === "string" ? userSchoolRaw.trim() : "";
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
            const detectedSchool = ocr.detectedSchool;
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
    }
    catch (error) {
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
    }
    finally {
        await tryDeleteUploadedFile(normalizedPath);
        console.info("[verifyStudentId] 종료", {
            userDocId: userRef.id,
            storagePath: normalizedPath,
        });
    }
});
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
async function setRetryStatus(userRef, reason, detectedSchool) {
    await userRef.set({
        studentIdVerificationStatus: "retry",
        studentIdVerificationReason: reason,
        studentIdVerificationLastDetectedSchool: detectedSchool,
    }, { merge: true });
}
async function applyApproveAndReward(userRef, detectedSchool) {
    return db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const data = snap.data() ?? {};
        const flower = typeof data.flower === "number" ? data.flower : 0;
        const alreadyRewarded = data.schoolVerifyRewardedAt != null;
        const payload = {
            schoolVerified: true,
            schoolVerifiedAt: firestore_1.FieldValue.serverTimestamp(),
            schoolVerifiedDetectedSchool: detectedSchool,
            studentIdVerificationStatus: "approved",
            studentIdVerificationReason: firestore_1.FieldValue.delete(),
            studentIdVerificationLastDetectedSchool: firestore_1.FieldValue.delete(),
        };
        if (!alreadyRewarded) {
            payload.flower = flower + REWARD_FLOWER;
            payload.schoolVerifyRewardedAt = firestore_1.FieldValue.serverTimestamp();
        }
        tx.set(userRef, payload, { merge: true });
        return !alreadyRewarded;
    });
}
async function downloadImageAsBase64(storagePath) {
    const file = storage.bucket().file(storagePath);
    const [buffer] = await file.download();
    if (!buffer || buffer.length === 0) {
        throw new Error("빈 파일입니다.");
    }
    return buffer.toString("base64");
}
async function requestClovaOcr(imageBase64, userSchool) {
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
    const payload = (await response.json());
    return parseOcrResult(payload, userSchool);
}
function parseOcrResult(payload, userSchool) {
    const lines = extractLinesFromClova(payload);
    const fullText = lines.join(" ").trim();
    const candidates = extractSchoolCandidates(lines);
    const match = matchAnyCandidate(userSchool, candidates);
    const isStudentIdLike = candidates.length >= 1 && normalize(fullText).length >= 15;
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
function extractLinesFromClova(payload) {
    const images = payload.images;
    if (!Array.isArray(images) || images.length === 0)
        return [];
    const firstImage = images[0];
    if (typeof firstImage !== "object" || firstImage == null)
        return [];
    const fields = firstImage.fields;
    if (!Array.isArray(fields))
        return [];
    const lines = [];
    for (const field of fields) {
        if (typeof field !== "object" || field == null)
            continue;
        const inferText = field.inferText;
        if (typeof inferText !== "string")
            continue;
        const normalized = inferText.trim();
        if (normalized)
            lines.push(normalized);
    }
    return lines;
}
function normalize(value) {
    return value
        .trim()
        .replace(/\(.*?\)/g, "")
        .replace(/[·\-_:\/\.,]/g, "")
        .replace(/\s+/g, "")
        .toUpperCase();
}
function extractSchoolCandidates(lines) {
    const unique = new Map();
    for (const line of lines) {
        if (!/(대학|대학교|UNIVERSITY)/i.test(line))
            continue;
        const trimmed = line.trim();
        if (!trimmed)
            continue;
        const normalized = normalize(trimmed);
        if (!normalized || normalized.length > 60)
            continue;
        const candidate = trimmed.slice(0, 120);
        if (!unique.has(normalized))
            unique.set(normalized, candidate);
        if (unique.size >= 10)
            break;
    }
    return Array.from(unique.values());
}
function matchAnyCandidate(userSchool, candidates) {
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
function classifyRetryReason(ocr) {
    if (!ocr.isStudentIdLike)
        return "not_student_id_like";
    if (ocr.candidates.length === 0)
        return "no_candidate";
    if (!ocr.matchedCandidate)
        return "school_mismatch";
    return null;
}
function mapUnhandledErrorToReason(error) {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    if (message.includes("storage"))
        return "storage_error";
    if (message.includes("clova_ocr"))
        return "ocr_error";
    if (message.includes("ocr"))
        return "ocr_error";
    return "ocr_error";
}
async function tryDeleteUploadedFile(storagePath) {
    try {
        await storage.bucket().file(storagePath).delete({ ignoreNotFound: true });
    }
    catch (error) {
        console.warn("[verifyStudentId] 업로드 파일 삭제 실패:", storagePath, error);
    }
}
//# sourceMappingURL=verifyStudentId.js.map