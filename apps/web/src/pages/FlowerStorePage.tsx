import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as PortOne from "@portone/browser-sdk/v2";
import { httpsCallable } from "firebase/functions";
import { getFunctions } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";
import { useAuth } from "@/auth/AuthContext";
import { useMyFlower } from "@/domains/user/useMyFlower";
import { color, radius, typo } from "@gardenus/shared";

/* ================================================================
   상품 데이터
   ================================================================ */

interface FlowerProduct {
  productId: string;
  amount: number;
  priceKRW: number;
  discount: string;
  priceLabel: string;
  icon: string;
}

const PRODUCTS: FlowerProduct[] = [
  { productId: "flower_6400", amount: 6400, priceKRW: 199000, discount: "60% 할인", priceLabel: "199,000원", icon: "🏆" },
  { productId: "flower_3200", amount: 3200, priceKRW: 119000, discount: "40% 할인", priceLabel: "119,000원", icon: "🥇" },
  { productId: "flower_1600", amount: 1600, priceKRW: 63900,  discount: "40% 할인", priceLabel: "63,900원",  icon: "🥈" },
  { productId: "flower_800",  amount: 800,  priceKRW: 34900,  discount: "40% 할인", priceLabel: "34,900원",  icon: "🥉" },
  { productId: "flower_400",  amount: 400,  priceKRW: 18900,  discount: "20% 할인", priceLabel: "18,900원",  icon: "🌸" },
  { productId: "flower_200",  amount: 200,  priceKRW: 10000,  discount: "6% 할인",  priceLabel: "10,000원",  icon: "🌼" },
  { productId: "flower_100",  amount: 100,  priceKRW: 6000,   discount: "",          priceLabel: "6,000원",   icon: "🌱" },
];

const functions = getFunctions(firebaseApp, "asia-northeast3");
const verifyPaymentFn = httpsCallable<
  { paymentId: string; productId: string },
  { success: boolean; flowerGranted: number }
>(functions, "verifyPayment");

/* ================================================================
   FlowerStorePage
   ================================================================ */

export const FlowerStorePage: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const { flower: myFlower } = useMyFlower();
  const [buying, setBuying] = useState(false);

  const handleBuy = async (product: FlowerProduct) => {
    if (!userId) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (buying) return;

    const storeId = import.meta.env.VITE_PORTONE_STORE_ID;
    const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

    if (!storeId || !channelKey) {
      alert("결제 설정이 완료되지 않았습니다. 관리자에게 문의하세요.");
      return;
    }

    setBuying(true);
    try {
      const paymentId = `payment_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const response = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName: `플라워 ${product.amount.toLocaleString()}개`,
        totalAmount: product.priceKRW,
        currency: "CURRENCY_KRW",
        payMethod: "CARD",
      });

      if (!response || response.code != null) {
        const msg = response?.message ?? "결제가 취소되었습니다.";
        console.warn("[FlowerStore] payment cancelled/failed:", msg);
        alert(msg);
        return;
      }

      const result = await verifyPaymentFn({
        paymentId,
        productId: product.productId,
      });

      if (result.data.success) {
        alert(`${result.data.flowerGranted.toLocaleString()} 플라워가 충전되었습니다!`);
      }
    } catch (err: unknown) {
      console.error("[FlowerStore] payment error:", err);
      const message = err instanceof Error ? err.message : "결제 처리 중 오류가 발생했습니다.";
      alert(message);
    } finally {
      setBuying(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ---- 헤더 ---- */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke={color.gray900} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 style={s.headerTitle}>플라워 스토어</h1>
        <div style={s.headerFlower}>
          <span style={{ fontSize: 18 }}>🌻</span>
          <span style={s.headerFlowerNum}>{myFlower.toLocaleString()}</span>
        </div>
      </header>

      <div style={s.body}>
        {/* ---- 일러스트 영역 ---- */}
        <div style={s.banner}>
          <div style={s.bannerContent}>
            <div style={s.bannerLogo}>
              <span style={{ fontSize: 16, color: color.mint600, fontWeight: 700 }}>🌿 가드너스</span>
              <p style={{ fontSize: 11, color: color.gray500, marginTop: 2 }}>
                사랑의 <strong style={{ color: color.mint600 }}>새싹</strong>에 <strong style={{ color: color.mint600 }}>꽃</strong>을 피워보세요
              </p>
            </div>
            <div style={s.bannerFlowers}>
              <span style={{ fontSize: 48 }}>🌻🌻🌻</span>
            </div>
            <div style={s.bannerArrow}>
              <span style={{ fontSize: 36 }}>🌸</span>
              <span style={{ fontSize: 18, margin: "0 8px" }}>→</span>
              <span style={{ fontSize: 36 }}>🌺</span>
            </div>
          </div>
        </div>

        {/* ---- 상품 리스트 ---- */}
        <div style={s.productList}>
          {PRODUCTS.map((p) => (
            <button key={p.productId} style={s.productRow} onClick={() => handleBuy(p)} disabled={buying}>
              <div style={s.productLeft}>
                <span style={s.productIcon}>{p.icon}</span>
                <span style={s.productAmount}>{p.amount.toLocaleString()} 플라워</span>
                {p.discount && <span style={s.productDiscount}>{p.discount}</span>}
              </div>
              <div style={s.productRight}>
                <span style={s.productPrice}>{p.priceLabel}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <path d="M9 5l7 7-7 7" stroke={color.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* ---- 무제한 매칭요청권 ---- */}
        <button style={s.unlimitedBtn} onClick={() => alert("결제 기능 준비중입니다.")}>
          <div style={s.unlimitedLeft}>
            <span style={{ fontSize: 20 }}>♾️</span>
            <span style={s.unlimitedText}>무제한 24시간 매칭요청권</span>
          </div>
          <span style={s.unlimitedPrice}>24,900원</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M9 5l7 7-7 7" stroke={color.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* ---- 하단 안내문 ---- */}
        <div style={s.notices}>
          <p style={s.notice}>매칭 요청 1회 : 180 플라워</p>
          <p style={s.notice}>요청 수락 1회 : 100 플라워</p>
          <p style={s.notice}>무제한 매칭은 구입후 24시간 동안 사용 가능합니다!</p>
          <p style={s.notice}>무제한 매칭요청은 매칭 실패시 환급되지 않습니다.</p>
          <p style={{ ...s.notice, marginTop: 12 }}>
            <a
              href="https://play-in.notion.site/1368855ab17980aa98ade7be7feaa783"
              target="_blank"
              rel="noopener noreferrer"
              style={s.refundLink}
            >
              가드너스 환불정책
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: color.white,
  },

  /* 헤더 */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    padding: "0 12px",
    position: "sticky",
    top: 0,
    background: color.white,
    zIndex: 800,
    borderBottom: `1px solid ${color.gray100}`,
  },
  backBtn: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },
  headerTitle: {
    ...typo.subheading,
    color: color.gray900,
    textAlign: "center",
    flex: 1,
  },
  headerFlower: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  headerFlowerNum: {
    fontSize: 16,
    fontWeight: 800,
    color: color.gray900,
  },

  /* 본문 */
  body: {
    padding: "0 0 40px",
  },

  /* 배너 */
  banner: {
    background: `linear-gradient(135deg, ${color.mint50} 0%, #e8f5e9 100%)`,
    padding: "24px 20px",
    marginBottom: 0,
  },
  bannerContent: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  bannerLogo: {
    textAlign: "center",
  },
  bannerFlowers: {
    display: "flex",
    justifyContent: "center",
  },
  bannerArrow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  /* 상품 리스트 */
  productList: {
    padding: "0",
  },
  productRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "16px 20px",
    background: "transparent",
    border: "none",
    borderBottom: `1px solid ${color.gray100}`,
    cursor: "pointer",
    textAlign: "left",
  },
  productLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  productIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
  },
  productAmount: {
    fontSize: 16,
    fontWeight: 700,
    color: color.gray900,
  },
  productDiscount: {
    fontSize: 12,
    fontWeight: 600,
    color: color.mint600,
  },
  productRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 700,
    color: color.mint600,
  },

  /* 무제한 매칭요청권 */
  unlimitedBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "calc(100% - 32px)",
    margin: "20px 16px 0",
    padding: "16px 20px",
    borderRadius: radius.xl,
    background: color.mint500,
    border: "none",
    cursor: "pointer",
  },
  unlimitedLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  unlimitedText: {
    fontSize: 15,
    fontWeight: 700,
    color: color.white,
  },
  unlimitedPrice: {
    fontSize: 16,
    fontWeight: 800,
    color: color.white,
    marginRight: 8,
  },

  /* 안내문 */
  notices: {
    padding: "20px 20px 0",
  },
  notice: {
    fontSize: 13,
    color: color.gray500,
    lineHeight: "22px",
  },
  refundLink: {
    color: color.gray700,
    fontWeight: 600,
    textDecoration: "underline",
    textUnderlineOffset: 3,
  },
};
