import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { color, radius, typo } from "@gardenus/shared";

/* ================================================================
   FAQ 데이터
   ================================================================ */

const FAQ_ITEMS = [
  {
    q: "Q1. 가드너스는 어떤 소개팅인가요?",
    a: "사진 없이 자기소개 글만으로 연결되는 진지한 소개팅입니다.\n외모보다 성향, 가치관을 중시하는 분들에게 적합해요.",
  },
  {
    q: "Q2. 매칭 방식은 어떻게 되나요?",
    a: "매칭을 요청하려면 먼저 플라워가 필요해요. \n상대방은 요청 수락 시에도 결제가 발생합니다. \n양쪽이 수락하면 대화방 생성, 자유롭게 대화 시작 가능!",
  },
  {
    q: "Q3. 상대가 응답이 없거나 거절하면 어떻게 되나요?",
    a: "다음과 같은 경우엔 서비스 내 재화(플러워)로 환급됩니다:\n-24시간 이상 매칭요청에 대한 응답 없음\n-수락 거절한 경우\n-매칭은 성사되었지만 대화가 단 한번도 오가지 않은 경우\n시스템적으로 환급이 가능합니다!\n(단, 무제한 매칭요청권의 경우 환급이 불가능합니다.)",
  },
  {
    q: "Q4. 얼굴은 언제 보이나요?",
    a: "가드너스는 얼굴 없이 시작하는 소개팅이에요.\n서로 대화를 통해 신뢰가 쌓이면 사진을 상호 개인적으로 공유하실 수 있어요.",
  },
  {
    q: "Q5. 리뷰나 건의는 어디서 하나요?",
    a: "앱 내 리뷰 작성 또는 고객센터 카카오톡으로 문의를 통해 남겨주세요!",
  },
];

/* ================================================================
   InquiryPage
   ================================================================ */

export const InquiryPage: React.FC = () => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText("gardenus1").then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleFaq = (idx: number) => {
    setOpenIdx((prev) => (prev === idx ? null : idx));
  };

  return (
    <div style={s.page}>
      {/* ---- 헤더 ---- */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke={color.gray900}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 style={s.headerTitle}>문의하기</h1>
        <div style={{ width: 40 }} />
      </header>

      <div style={s.body}>
        {/* ---- 상단 안내 ---- */}
        <div style={s.heroSection}>
          <h2 style={s.heroTitle}>문제가 발생하였나요?</h2>
          <p style={s.heroSub}>
            불편을 드려 죄송합니다.
            {"\n"}하단의 카카오톡으로 문의주세요.
          </p>
        </div>

        {/* ---- 카카오톡 ID ---- */}
        <div style={s.card}>
          <p style={s.cardLabel}>카카오톡 ID</p>
          <div style={s.kakaoRow}>
            <span style={s.kakaoId}>gardenus1</span>
            <button style={s.copyBtn} onClick={handleCopy}>
              {copied ? "✓ 복사됨" : "📋복사"}
            </button>
          </div>
        </div>

        {/* ---- 응답시간 ---- */}
        <div style={s.card}>
          <p style={s.timeTitle}>카카오톡 문의 집중 응답시간</p>
          <p style={s.timeText}>
            화, 목 20시~22시
            {"\n"}토, 일 13시~15시
          </p>
          <p style={s.timeNotice}>
            **집중 응답시간 이외 시간에는
            {"\n"}응답이 느린 점 양해부탁드립니다.
          </p>
        </div>

        {/* ---- FAQ ---- */}
        <div style={s.card}>
          <p style={s.faqTitle}>자주 묻는 질문 (FAQ)</p>

          {FAQ_ITEMS.map((item, idx) => (
            <div key={idx}>
              <button
                style={s.faqRow}
                onClick={() => toggleFaq(idx)}
              >
                <span style={s.faqQuestion}>{item.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{
                    flexShrink: 0,
                    transform: openIdx === idx ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                  }}
                >
                  <path
                    d="M6 9l6 6 6-6"
                    stroke={color.gray400}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              {openIdx === idx && (
                <div style={s.faqAnswer}>
                  <p style={s.faqAnswerText}>{item.a}</p>
                </div>
              )}
              {idx < FAQ_ITEMS.length - 1 && <div style={s.divider} />}
            </div>
          ))}
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
    background: color.gray50,
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
    cursor: "pointer",
    border: "none",
  },
  headerTitle: {
    ...typo.subheading,
    color: color.gray900,
    textAlign: "center",
    flex: 1,
  },

  /* 본문 */
  body: {
    padding: "0 16px 40px",
  },

  /* 상단 안내 */
  heroSection: {
    textAlign: "center",
    padding: "32px 0 24px",
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: color.mint500,
    marginBottom: 12,
  },
  heroSub: {
    ...typo.body,
    color: color.gray500,
    whiteSpace: "pre-line" as const,
    lineHeight: "22px",
  },

  /* 카드 */
  card: {
    background: color.white,
    borderRadius: radius.xl,
    padding: "20px 20px",
    marginBottom: 14,
  },

  /* 카카오톡 ID */
  cardLabel: {
    ...typo.caption,
    color: color.gray500,
    marginBottom: 8,
  },
  kakaoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  kakaoId: {
    ...typo.heading,
    color: color.gray900,
  },
  copyBtn: {
    padding: "8px 16px",
    borderRadius: radius.lg,
    background: color.mint500,
    color: color.white,
    fontSize: 14,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
  },

  /* 응답시간 */
  timeTitle: {
    ...typo.subheading,
    color: color.gray900,
    textAlign: "center",
    marginBottom: 12,
  },
  timeText: {
    ...typo.body,
    color: color.gray700,
    textAlign: "center",
    whiteSpace: "pre-line" as const,
    lineHeight: "22px",
    marginBottom: 12,
  },
  timeNotice: {
    ...typo.caption,
    color: color.gray500,
    textAlign: "center",
    whiteSpace: "pre-line" as const,
    lineHeight: "18px",
  },

  /* FAQ */
  faqTitle: {
    ...typo.subheading,
    color: color.gray900,
    textAlign: "center",
    marginBottom: 16,
  },
  faqRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "14px 0",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
  },
  faqQuestion: {
    ...typo.body,
    color: color.gray800,
    flex: 1,
  },
  faqAnswer: {
    paddingBottom: 14,
  },
  faqAnswerText: {
    ...typo.body,
    color: color.gray600,
    lineHeight: "20px",
    whiteSpace: "pre-line" as const,
  },
  divider: {
    height: 1,
    background: color.gray100,
  },
};
