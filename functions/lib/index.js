"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAccount = exports.onMatchRequestUpdated = exports.onMatchRequestCreated = exports.generateProfileAvatar = exports.verifyStudentId = exports.verifyPayment = exports.pokeChatRoom = exports.leaveChatRoom = void 0;
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const POKE_WINDOW_MS = 48 * 60 * 60 * 1000;
const POKE_MAX_COUNT = 3;
function getCallerUid(request) {
    const email = request.auth?.token?.email;
    if (typeof email === "string") {
        const m = email.toLowerCase().match(/^([^@]+)@gardenus\.local$/);
        if (m)
            return m[1];
    }
    const phone = request.auth?.token?.phone_number;
    if (typeof phone === "string" && phone.trim() !== "")
        return phone;
    return request.auth?.uid ?? "";
}
exports.leaveChatRoom = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const roomId = request.data?.roomId?.trim();
    if (!roomId) {
        throw new https_1.HttpsError("invalid-argument", "roomId는 필수입니다.");
    }
    const meUid = getCallerUid(request);
    const roomRef = db.collection("chatRooms").doc(roomId);
    const roomSnap = await roomRef.get();
    if (!roomSnap.exists) {
        throw new https_1.HttpsError("not-found", "채팅방을 찾을 수 없습니다.");
    }
    const participants = roomSnap.data()?.participants;
    if (!Array.isArray(participants) || !participants.includes(meUid)) {
        throw new https_1.HttpsError("permission-denied", "채팅방 참여자가 아닙니다.");
    }
    await roomRef.set({
        status: "EXPIRED",
        expiredBy: meUid,
        expiredAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true };
});
exports.pokeChatRoom = (0, https_1.onCall)({ region: "asia-northeast3" }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const roomId = request.data?.roomId?.trim();
    if (!roomId) {
        throw new https_1.HttpsError("invalid-argument", "roomId는 필수입니다.");
    }
    const meUid = getCallerUid(request);
    const now = Date.now();
    const roomRef = db.collection("chatRooms").doc(roomId);
    const pokeRef = roomRef.collection("pokeStats").doc(meUid);
    const txResult = await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef);
        if (!roomSnap.exists) {
            throw new https_1.HttpsError("not-found", "채팅방을 찾을 수 없습니다.");
        }
        const participants = roomSnap.data()?.participants;
        if (!Array.isArray(participants) || !participants.includes(meUid)) {
            throw new https_1.HttpsError("permission-denied", "채팅방 참여자가 아닙니다.");
        }
        const roomStatus = roomSnap.data()?.status;
        if (roomStatus === "EXPIRED") {
            throw new https_1.HttpsError("failed-precondition", "종료된 채팅방입니다.");
        }
        const targetUid = participants.find((uid) => typeof uid === "string" && uid !== meUid);
        if (!targetUid) {
            throw new https_1.HttpsError("failed-precondition", "상대 사용자를 찾을 수 없습니다.");
        }
        const pokeSnap = await tx.get(pokeRef);
        const rawTimestamps = pokeSnap.data()?.timestamps;
        const timestamps = Array.isArray(rawTimestamps)
            ? rawTimestamps.filter((v) => typeof v === "number")
            : [];
        const validTimestamps = timestamps
            .filter((ts) => now - ts < POKE_WINDOW_MS)
            .sort((a, b) => a - b);
        if (validTimestamps.length >= POKE_MAX_COUNT) {
            const retryAt = validTimestamps[0] + POKE_WINDOW_MS;
            return {
                ok: false,
                remaining: 0,
                retryAt,
                targetUid,
            };
        }
        const next = [...validTimestamps, now].sort((a, b) => a - b);
        tx.set(pokeRef, {
            timestamps: next,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return {
            ok: true,
            remaining: POKE_MAX_COUNT - next.length,
            retryAt: undefined,
            targetUid,
        };
    });
    if (!txResult.ok) {
        return {
            ok: false,
            remaining: txResult.remaining,
            retryAt: txResult.retryAt,
        };
    }
    await db
        .collection("users")
        .doc(txResult.targetUid)
        .collection("notifications")
        .add({
        type: "SYSTEM",
        title: "콕 찌르기",
        body: `${meUid}님이 콕 찔렀어요.`,
        roomId,
        fromUid: meUid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return {
        ok: true,
        remaining: txResult.remaining,
    };
});
var verifyPayment_1 = require("./payment/verifyPayment");
Object.defineProperty(exports, "verifyPayment", { enumerable: true, get: function () { return verifyPayment_1.verifyPayment; } });
var verifyStudentId_1 = require("./verification/verifyStudentId");
Object.defineProperty(exports, "verifyStudentId", { enumerable: true, get: function () { return verifyStudentId_1.verifyStudentId; } });
var generateProfileAvatar_1 = require("./avatar/generateProfileAvatar");
Object.defineProperty(exports, "generateProfileAvatar", { enumerable: true, get: function () { return generateProfileAvatar_1.generateProfileAvatar; } });
var matchRequestTriggers_1 = require("./notifications/matchRequestTriggers");
Object.defineProperty(exports, "onMatchRequestCreated", { enumerable: true, get: function () { return matchRequestTriggers_1.onMatchRequestCreated; } });
Object.defineProperty(exports, "onMatchRequestUpdated", { enumerable: true, get: function () { return matchRequestTriggers_1.onMatchRequestUpdated; } });
var deleteMyAccount_1 = require("./account/deleteMyAccount");
Object.defineProperty(exports, "deleteAccount", { enumerable: true, get: function () { return deleteMyAccount_1.deleteAccount; } });
//# sourceMappingURL=index.js.map