"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onMatchRequestUpdated = exports.onMatchRequestCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const db = (0, firestore_2.getFirestore)();
/* ── 헬퍼: users/{uid}.name 조회 ────────────────────────────── */
async function getUserName(uid) {
    try {
        const snap = await db.collection("users").doc(uid).get();
        if (!snap.exists) {
            console.warn(`[getUserName] 문서 없음: users/${uid}`);
            return uid;
        }
        const name = snap.data()?.name?.trim();
        if (!name) {
            console.warn(`[getUserName] name 필드 없음 또는 빈 값: users/${uid}`);
            return uid;
        }
        return name;
    }
    catch (e) {
        console.error(`[getUserName] 조회 실패 users/${uid}:`, e);
        return uid;
    }
}
async function pushNotification(targetUid, payload) {
    await db
        .collection("users")
        .doc(targetUid)
        .collection("notifications")
        .add({
        ...payload,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
    });
}
/* ================================================================
   1) LIKE_RECEIVED — matchRequest 생성 시 (status=PENDING)
      알림 대상: toUid (좋아요를 받은 사람)
   ================================================================ */
exports.onMatchRequestCreated = (0, firestore_1.onDocumentCreated)({
    document: "matchRequests/{docId}",
    region: "asia-northeast3",
}, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { toUid, fromUid, status } = data;
    if (status !== "PENDING")
        return;
    const fromName = await getUserName(fromUid);
    await pushNotification(toUid, {
        type: "LIKE_RECEIVED",
        title: "새 좋아요 요청",
        body: `${fromName}님이 좋아요를 보냈어요. 확인해보세요!`,
    });
});
/* ================================================================
   2) MATCH_SUCCESS / REQUEST_DECLINED — matchRequest 상태 변경 시
   ================================================================ */
exports.onMatchRequestUpdated = (0, firestore_1.onDocumentUpdated)({
    document: "matchRequests/{docId}",
    region: "asia-northeast3",
}, async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    const prevStatus = before.status;
    const newStatus = after.status;
    if (prevStatus === newStatus)
        return;
    const fromUid = after.fromUid;
    const toUid = after.toUid;
    /* ---- ACCEPTED → 양쪽 모두에게 매칭 성공 알림 ---- */
    if (newStatus === "ACCEPTED") {
        const [fromName, toName] = await Promise.all([
            getUserName(fromUid),
            getUserName(toUid),
        ]);
        await Promise.all([
            pushNotification(fromUid, {
                type: "MATCH_SUCCESS",
                title: "매칭 성공! 🎉",
                body: `${toName}님과 매칭되었어요. 채팅을 시작해보세요!`,
                targetUid: toUid,
            }),
            pushNotification(toUid, {
                type: "MATCH_SUCCESS",
                title: "매칭 성공! 🎉",
                body: `${fromName}님과 매칭되었어요. 채팅을 시작해보세요!`,
                targetUid: fromUid,
            }),
        ]);
        return;
    }
    /* ---- DECLINED → 보낸 사람에게 거절 알림 ---- */
    if (newStatus === "DECLINED") {
        await pushNotification(fromUid, {
            type: "REQUEST_DECLINED",
            title: "요청이 거절되었어요",
            body: "상대가 요청을 거절했어요.",
        });
    }
});
//# sourceMappingURL=matchRequestTriggers.js.map