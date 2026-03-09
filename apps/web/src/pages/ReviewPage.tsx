import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/auth/AuthContext";
import { db } from "@/infra/firebase/client";

/* ================================================================
   ReviewPage
   ================================================================ */

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();
  const [text, setText] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const MAX_TEXT = 300;
  const textOk = text.trim().length >= 10;
  const canSubmit = textOk && rating > 0 && !!userId && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || !userId) return;
    setSubmitting(true);
    setError("");
    try {
      await setDoc(
        doc(db, "review", userId),
        {
          score: rating,
          review: text.trim(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
      setSubmitted(true);
    } catch (e) {
      console.error("[ReviewPage] submit failed", e);
      setError("제출 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── 비로그인 안내 ── */
  if (!isAuthed) {
    return (
      <div style={s.page}>
        <header style={s.header}>
          <button style={s.backBtn} onClick={() => navigate(-1)} aria-label="뒤로가기">
            <ChevronLeft />
          </button>
          <span style={s.headerTitle}>후기 작성</span>
          <span style={s.headerRight} />
        </header>
        <div style={s.successWrap}>
          <div style={{ ...s.successIcon, background: "#eee", color: "#888", fontSize: 22 }}>!</div>
          <h2 style={{ ...s.successTitle, fontSize: 17 }}>로그인이 필요해요</h2>
          <p style={s.successDesc}>후기를 작성하려면{"\n"}먼저 로그인해주세요.</p>
          <button style={s.primaryBtn} onClick={() => navigate("/login")}>
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  /* ── 제출 완료 화면 ── */
  if (submitted) {
    return (
      <div style={s.page}>
        <header style={s.header}>
          <button style={s.backBtn} onClick={() => navigate(-1)} aria-label="뒤로가기">
            <ChevronLeft />
          </button>
          <span style={s.headerTitle}>후기 작성</span>
          <span style={s.headerRight} />
        </header>

        <div style={s.successWrap}>
          <div style={s.successIcon}>✓</div>
          <h2 style={s.successTitle}>후기가 등록되었어요</h2>
          <p style={s.successDesc}>
            소중한 후기 감사해요.{"\n"}더 나은 가드너스가 될게요.
          </p>
          <button style={s.primaryBtn} onClick={() => navigate(-1)}>
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  /* ── 작성 폼 화면 ── */
  return (
    <div style={s.page}>
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)} aria-label="뒤로가기">
          <ChevronLeft />
        </button>
        <span style={s.headerTitle}>후기 작성</span>
        <span style={s.headerRight} />
      </header>

      <div style={s.container}>
        {/* 안내 배너 */}
        <div style={s.banner}>
          <p style={s.bannerTitle}>가드너스 이용 후기를 남겨주세요</p>
          <p style={s.bannerDesc}>
            실제 이용 경험을 솔직하게 작성해주시면{"\n"}
            더 많은 분들에게 도움이 돼요.
          </p>
        </div>

        {/* 별점 */}
        <section style={s.section}>
          <label style={s.label}>별점</label>
          <div style={s.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                style={s.starBtn}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                aria-label={`${star}점`}
              >
                <Star filled={(hoverRating || rating) >= star} />
              </button>
            ))}
            {rating > 0 && (
              <span style={s.ratingLabel}>{RATING_LABELS[rating - 1]}</span>
            )}
          </div>
        </section>

        {/* 본문 */}
        <section style={s.section}>
          <div style={s.labelRow}>
            <label style={s.label}>
              후기 본문 <span style={s.required}>*</span>
            </label>
            <span style={{ ...s.counter, color: text.length > MAX_TEXT * 0.9 ? "#555" : "#aaa" }}>
              {text.length}/{MAX_TEXT}
            </span>
          </div>
          <textarea
            style={{
              ...s.textarea,
              ...(text && !textOk ? s.inputError : {}),
            }}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
            placeholder="실제 이용 경험을 솔직하게 써주세요. (최소 10자)"
            rows={5}
          />
          {text.length > 0 && !textOk && (
            <p style={s.hint}>최소 10자 이상 작성해주세요.</p>
          )}
        </section>

        {/* 유의사항 */}
        <div style={s.notice}>
          <p style={s.noticeItem}>• 허위·광고성 후기는 삭제될 수 있어요.</p>
          <p style={s.noticeItem}>• 개인정보(연락처 등)는 포함하지 마세요.</p>
          <p style={s.noticeItem}>• 후기는 랜딩 페이지에 노출될 수 있어요.</p>
        </div>

        {error && <p style={s.errorMsg}>{error}</p>}

        <button
          style={{ ...s.primaryBtn, ...(canSubmit ? {} : s.primaryBtnDisabled) }}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? "제출 중…" : "후기 등록하기"}
        </button>
      </div>
    </div>
  );
};

export default ReviewPage;

/* ================================================================
   상수
   ================================================================ */

const RATING_LABELS = ["별로예요", "아쉬워요", "보통이에요", "좋아요", "최고예요"];

/* ================================================================
   아이콘
   ================================================================ */

const ChevronLeft: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 19l-7-7 7-7" stroke="#111" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Star: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill={filled ? "#111" : "none"}>
    <path
      d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
      stroke="#111"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#fff",
    fontFamily: "inherit",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    height: 56,
    borderBottom: "1px solid #f0f0f0",
    background: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111",
    letterSpacing: "-0.3px",
  },
  headerRight: {
    width: 32,
  },
  container: {
    maxWidth: 430,
    margin: "0 auto",
    padding: "20px 20px 60px",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  banner: {
    background: "#f7f7f7",
    borderRadius: 12,
    padding: "16px 18px",
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111",
    marginBottom: 6,
  },
  bannerDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: "20px",
    whiteSpace: "pre-line",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  row: {
    display: "flex",
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
  },
  required: {
    color: "#111",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counter: {
    fontSize: 12,
    transition: "color 0.2s",
  },
  input: {
    width: "100%",
    padding: "11px 14px",
    fontSize: 15,
    color: "#111",
    background: "#fafafa",
    border: "1.5px solid #e0e0e0",
    borderRadius: 10,
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  inputError: {
    borderColor: "#aaa",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    fontSize: 14,
    color: "#111",
    background: "#fafafa",
    border: "1.5px solid #e0e0e0",
    borderRadius: 10,
    outline: "none",
    resize: "none",
    lineHeight: "22px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    wordBreak: "keep-all",
  },
  hint: {
    fontSize: 12,
    color: "#888",
    marginTop: -4,
  },
  starRow: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  starBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
  },
  ratingLabel: {
    fontSize: 13,
    color: "#444",
    marginLeft: 6,
    fontWeight: 500,
  },
  genderRow: {
    display: "flex",
    gap: 8,
  },
  genderBtn: {
    flex: 1,
    padding: "10px 0",
    fontSize: 14,
    fontWeight: 500,
    color: "#888",
    background: "#fafafa",
    border: "1.5px solid #e0e0e0",
    borderRadius: 10,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  genderBtnActive: {
    color: "#111",
    background: "#f0f0f0",
    border: "1.5px solid #111",
    fontWeight: 700,
  },
  notice: {
    background: "#f7f7f7",
    borderRadius: 10,
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  noticeItem: {
    fontSize: 12,
    color: "#888",
    lineHeight: "18px",
  },
  errorMsg: {
    fontSize: 13,
    color: "#555",
    textAlign: "center",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 0",
    fontSize: 15,
    fontWeight: 700,
    color: "#fff",
    background: "#111",
    border: "none",
    borderRadius: 12,
    cursor: "pointer",
    letterSpacing: "-0.2px",
    transition: "opacity 0.15s",
  },
  primaryBtnDisabled: {
    background: "#ccc",
    cursor: "not-allowed",
  },
  successWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 56px)",
    padding: "0 32px",
    textAlign: "center",
    gap: 16,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#111",
    color: "#fff",
    fontSize: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: "#111",
  },
  successDesc: {
    fontSize: 14,
    color: "#666",
    lineHeight: "22px",
    whiteSpace: "pre-line",
    marginBottom: 8,
  },
};
