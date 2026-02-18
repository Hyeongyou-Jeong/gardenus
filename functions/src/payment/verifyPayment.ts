import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getPayment } from "./portone";
import { findProduct } from "./products";

const db = getFirestore();

interface VerifyRequest {
  paymentId: string;
  productId: string;
}

export const verifyPayment = onCall<VerifyRequest>(
  { region: "asia-northeast3" },
  async (request) => {
    /* ---- 인증 확인 ---- */
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }
    const uid = request.auth.uid;
    const { paymentId, productId } = request.data;

    if (!paymentId || !productId) {
      throw new HttpsError(
        "invalid-argument",
        "paymentId와 productId가 필요합니다.",
      );
    }

    /* ---- 상품 확인 ---- */
    const product = findProduct(productId);
    if (!product) {
      throw new HttpsError("invalid-argument", "존재하지 않는 상품입니다.");
    }

    /* ---- 중복 결제 방지 ---- */
    const paymentRef = db.collection("payments").doc(paymentId);
    const existing = await paymentRef.get();
    if (existing.exists) {
      throw new HttpsError("already-exists", "이미 처리된 결제입니다.");
    }

    /* ---- PortOne API로 결제 검증 ---- */
    const apiSecret = process.env.PORTONE_API_SECRET;
    if (!apiSecret) {
      throw new HttpsError("internal", "결제 서비스 설정 오류");
    }

    const payment = await getPayment(paymentId, apiSecret);

    if (payment.status !== "PAID") {
      throw new HttpsError(
        "failed-precondition",
        `결제 상태가 PAID가 아닙니다: ${payment.status}`,
      );
    }

    if (payment.amount.total !== product.priceKRW) {
      throw new HttpsError(
        "failed-precondition",
        `결제 금액 불일치: expected ${product.priceKRW}, got ${payment.amount.total}`,
      );
    }

    /* ---- Firestore 트랜잭션: 결제 기록 + 플라워 지급 ---- */
    const userRef = db.collection("users").doc(uid);

    await db.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      const currentFlower =
        (userSnap.data()?.flower as number | undefined) ?? 0;

      tx.set(paymentRef, {
        uid,
        productId,
        flowerAmount: product.flowerAmount,
        amountKRW: product.priceKRW,
        portonePaymentId: paymentId,
        portoneStatus: payment.status,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        userRef,
        { flower: currentFlower + product.flowerAmount },
        { merge: true },
      );
    });

    return {
      success: true,
      flowerGranted: product.flowerAmount,
    };
  },
);
