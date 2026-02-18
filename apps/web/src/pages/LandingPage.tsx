import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/ui";
import { color, radius, shadow, typo } from "@gardenus/shared";

/* ── 공통 카드 래퍼 ──────────────────────────────────────────── */

const SectionCard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <div style={{ ...s.card, ...style }}>{children}</div>
);

/* ── 더미 데이터 ──────────────────────────────────────────────── */

const STATS = [
  { label: "누적 가입자", value: "1,234" },
  { label: "오늘 신규", value: "12" },
  { label: "누적 매칭", value: "345" },
];

const REVIEWS = [
  { name: "TestUser1", text: "진심으로 대화할 수 있는 사람을 만났어요!" },
  { name: "TestUser2", text: "프로필이 꼼꼼해서 신뢰가 갔습니다." },
  { name: "TestUser3", text: "플라워 시스템이 재밌어요 🌻" },
];

/* ================================================================
   LandingPage
   ================================================================ */

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* ── Hero ───────────────────────────────────── */}
        <SectionCard style={s.heroCard}>
          <p style={s.heroBadge}>🌿 가드너스</p>
          <h1 style={s.heroTitle}>가드너스에 오신 걸{"\n"}환영해요</h1>
          <p style={s.heroDesc}>
            진심을 담은 매칭으로, 소중한 인연을 만들어보세요.
          </p>
          <div style={s.heroBtns}>
            {isAuthed ? (
              <Button onClick={() => navigate("/match")}>매칭 시작</Button>
            ) : (
              <>
                <Button onClick={() => navigate("/login")}>로그인</Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate("/match")}
                  style={{ marginTop: 10 }}
                >
                  둘러보기
                </Button>
              </>
            )}
          </div>
        </SectionCard>

        {/* ── Stats ──────────────────────────────────── */}
        <SectionCard>
          <h2 style={s.sectionTitle}>데이터 숫자</h2>
          <div style={s.statsGrid}>
            {STATS.map((st) => (
              <div key={st.label} style={s.statChip}>
                <span style={s.statValue}>{st.value}</span>
                <span style={s.statLabel}>{st.label}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* ── Reviews ────────────────────────────────── */}
        <SectionCard>
          <h2 style={s.sectionTitle}>이용 후기</h2>
          <div style={s.reviewList}>
            {REVIEWS.map((r, i) => (
              <div key={i} style={s.reviewItem}>
                <span style={s.reviewName}>{r.name}</span>
                <span style={s.reviewText}>{r.text}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        
      {/* ---- 사업자 정보 ---- */}
      <div style={s.businessSection}>
        <p style={s.businessTitle}>사업자 정보</p>
        <div style={s.businessCard}>
          <p style={s.businessRow}>상호명: 더가든</p>
          <p style={s.businessRow}>대표자: 이정훈</p>
          <p style={s.businessRow}>사업자등록번호: 702-07-02549</p>
          <p style={s.businessRow}>통신판매업신고번호: 2023-서울성동-1168</p>
          <p style={s.businessRow}>주소: 서울특별시 성동구 왕십리로80(성수동1가, 동아아파트)</p>
          <p style={s.businessRow}>고객센터: 031-282-2449</p>
          <p style={s.businessRow}>이메일: jeonghun2410@gmail.com</p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LandingPage;

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: color.gray50,
  },
  container: {
    maxWidth: 430,
    margin: "0 auto",
    padding: "24px 16px 48px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  /* ── 카드 공통 ── */
  card: {
    background: color.white,
    borderRadius: radius.xl,
    border: `1px solid ${color.gray200}`,
    boxShadow: shadow.card,
    padding: "24px 20px",
  },

  /* ── Hero ── */
  heroCard: {
    background: `linear-gradient(135deg, ${color.mint50} 0%, #e8f5e9 100%)`,
    border: "none",
    textAlign: "center" as const,
    padding: "36px 20px 28px",
  },
  heroBadge: {
    ...typo.caption,
    color: color.mint700,
    fontWeight: 600,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: "34px",
    color: color.gray900,
    whiteSpace: "pre-line" as const,
    marginBottom: 10,
  },
  heroDesc: {
    ...typo.body,
    color: color.gray600,
    marginBottom: 24,
  },
  heroBtns: {
    maxWidth: 280,
    margin: "0 auto",
  },

  /* ── 섹션 제목 ── */
  sectionTitle: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 16,
  },

  /* ── Stats ── */
  statsGrid: {
    display: "flex",
    gap: 10,
  },
  statChip: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 4,
    padding: "14px 0",
    background: color.mint50,
    borderRadius: radius.lg,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 800,
    color: color.mint600,
  },
  statLabel: {
    ...typo.caption,
    color: color.gray600,
  },

  /* ── Reviews ── */
  reviewList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  reviewItem: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    padding: "12px 14px",
    background: color.gray50,
    borderRadius: radius.md,
  },
  reviewName: {
    ...typo.caption,
    fontWeight: 600,
    color: color.mint700,
  },
  reviewText: {
    ...typo.body,
    color: color.gray700,
  },

  /* ── 사업자 정보 ── */
  businessSection: {
    marginTop: 8,
  },
  businessTitle: {
    ...typo.subheading,
    color: color.gray700,
    marginBottom: 10,
  },
  businessCard: {
    background: color.gray50,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: "16px 18px",
  },
  businessRow: {
    ...typo.caption,
    color: color.gray500,
    lineHeight: "20px",
    marginBottom: 2,
  },
};
