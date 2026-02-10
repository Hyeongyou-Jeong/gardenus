import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Header, TabBar, Modal } from "@/ui";
import { fetchUser, type UserDoc } from "@/domains/user/user.repo";
import { useMyFlower } from "@/shared/hooks/useMyFlower";
import { color, radius, typo } from "@gardenus/shared";

/* ---------- Toggle Component ---------- */
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void }> = ({
  value,
  onChange,
}) => (
  <button
    onClick={() => onChange(!value)}
    style={{
      width: 48,
      height: 28,
      borderRadius: 14,
      background: value ? color.mint500 : color.gray300,
      position: "relative",
      transition: "background 0.2s",
      flexShrink: 0,
    }}
  >
    <span
      style={{
        position: "absolute",
        top: 3,
        left: value ? 23 : 3,
        width: 22,
        height: 22,
        borderRadius: "50%",
        background: color.white,
        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
        transition: "left 0.2s",
      }}
    />
  </button>
);

/* ---------- Chevron Icon ---------- */
const Chevron: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path
      d="M9 5l7 7-7 7"
      stroke={color.gray400}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ---------- Row ---------- */
const Row: React.FC<{
  label: string;
  right?: React.ReactNode;
  onClick?: () => void;
}> = ({ label, right, onClick }) => (
  <div style={styles.row} onClick={onClick}>
    <span style={styles.rowLabel}>{label}</span>
    {right}
  </div>
);

/* ========== MePage ========== */
export const MePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed, phone, authLoading, logout } = useAuth();
  const { flower } = useMyFlower();

  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [toggleBenefit, setToggleBenefit] = useState(true);
  const [toggleMatch, setToggleMatch] = useState(true);
  const [toggleNotify, setToggleNotify] = useState(false);

  const [logoutModal, setLogoutModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);

  /* ---- 접근 제어 ---- */
  useEffect(() => {
    if (!authLoading && !isAuthed) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthed, navigate]);

  /* ---- 내 프로필 로드 ---- */
  useEffect(() => {
    if (!phone) return;
    let alive = true;

    setProfileLoading(true);
    fetchUser(phone)
      .then((p) => {
        if (alive) setProfile(p);
      })
      .catch((e) => console.error("[MePage] profile load failed", e))
      .finally(() => {
        if (alive) setProfileLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [phone]);

  const handleLogout = () => {
    setLogoutModal(false);
    logout();
    navigate("/");
  };

  const handleWithdraw = async () => {
    setWithdrawModal(false);
    try {
      const { auth } = await import("@/infra/firebase/client");
      if (auth?.currentUser) {
        await auth.currentUser.delete();
      }
    } catch (err) {
      console.error("[MePage] 회원탈퇴 실패:", err);
    }
    logout();
    navigate("/");
  };

  /* ---- 렌더링 ---- */
  if (authLoading) return null;
  if (!isAuthed) return null;

  const displayName = profile?.name ?? "이름 없음";
  const displayPhone = phone || "전화번호 없음";

  return (
    <div style={styles.page}>
      <Header title="마이 프로필" />

      <div style={styles.body}>
        {/* 프로필 섹션 */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill={color.gray400}>
              <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            {profileLoading ? (
              <p style={styles.profilePhone}>불러오는 중…</p>
            ) : (
              <>
                <p style={styles.profileName}>{displayName}</p>
                <p style={styles.profilePhone}>{displayPhone}</p>
              </>
            )}
          </div>
        </div>

        {/* 프로필 요약 정보 */}
        {!profileLoading && profile && (
          <div style={styles.infoCards}>
            {profile.residence && (
              <InfoChip label="거주지" value={profile.residence} />
            )}
            {profile.mbti && (
              <InfoChip label="MBTI" value={profile.mbti} />
            )}
            {profile.born != null && (
              <InfoChip label="출생" value={String(profile.born)} />
            )}
            {profile.aboutme && (
              <div style={styles.aboutmeCard}>
                <p style={styles.aboutmeLabel}>자기소개</p>
                <p style={styles.aboutmeText}>{profile.aboutme}</p>
              </div>
            )}
          </div>
        )}

        <button
          style={styles.editBtn}
          onClick={() => navigate("/me/edit")}
        >
          프로필 수정하기
        </button>

        {/* 서비스 이용 */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>서비스 이용</p>
          <Row
            label="가드너스의 다양한 혜택 받기"
            right={<Toggle value={toggleBenefit} onChange={setToggleBenefit} />}
          />
          <Row
            label="플라워 스토어"
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ ...typo.subheading, color: color.mint600 }}>
                  {flower.toLocaleString()}
                </span>
                <Chevron />
              </div>
            }
            onClick={() => navigate("/store/flowers")}
          />
          <Row
            label="매칭 받기"
            right={<Toggle value={toggleMatch} onChange={setToggleMatch} />}
          />
          <Row
            label="미응답 메시지 알림받기(오후 7시)"
            right={<Toggle value={toggleNotify} onChange={setToggleNotify} />}
          />
          <Row label="문의하기" right={<Chevron />} onClick={() => navigate("/inquiry")} />
          <Row label="개인정보 처리방침" right={<Chevron />} onClick={() => window.open("https://play-in.notion.site/1218855ab179804d9319d9b100d94630", "_blank")} />
          <Row label="이용약관" right={<Chevron />} onClick={() => window.open("https://play-in.notion.site/1218855ab179809b84d0e3d5040f88c1", "_blank")} />
          <Row label="환불정책" right={<Chevron />} onClick={() => window.open("https://play-in.notion.site/1368855ab17980aa98ade7be7feaa783", "_blank")} />
        </div>

        {/* 계정관련 */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>계정관련</p>
          <Row label="이용 제한 내역" right={<Chevron />} />
          <Row label="회원탈퇴" right={<Chevron />} onClick={() => setWithdrawModal(true)} />
          <Row label="로그아웃" right={<Chevron />} onClick={() => setLogoutModal(true)} />
        </div>
      </div>

      <TabBar />

      {/* ---- 로그아웃 모달 ---- */}
      <Modal
        open={logoutModal}
        title="로그아웃"
        description="정말 로그아웃 하시겠습니까?"
        cancelText="취소"
        confirmText="로그아웃"
        confirmDanger
        onCancel={() => setLogoutModal(false)}
        onConfirm={handleLogout}
      />

      {/* ---- 회원탈퇴 모달 ---- */}
      <Modal
        open={withdrawModal}
        title="회원 탈퇴"
        description={"정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며\n복구가 불가능합니다."}
        cancelText="취소"
        confirmText="탈퇴하기"
        confirmDanger
        onCancel={() => setWithdrawModal(false)}
        onConfirm={handleWithdraw}
      />
    </div>
  );
};

/* ---------- InfoChip ---------- */
const InfoChip: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div style={styles.infoChip}>
    <span style={styles.infoChipLabel}>{label}</span>
    <span style={styles.infoChipValue}>{value}</span>
  </div>
);

/* ================================================================
   스타일
   ================================================================ */

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 80,
    background: color.gray50,
  },
  body: {
    padding: "0 16px 24px",
  },
  profileCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "20px 0",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: color.gray200,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  profileName: {
    ...typo.heading,
    color: color.gray900,
  },
  profilePhone: {
    ...typo.body,
    color: color.gray500,
    marginTop: 2,
  },
  infoCards: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  infoChip: {
    display: "flex",
    flexDirection: "column",
    padding: "8px 14px",
    background: color.white,
    borderRadius: radius.md,
    border: `1px solid ${color.gray200}`,
  },
  infoChipLabel: {
    ...typo.caption,
    color: color.gray500,
    fontSize: 11,
  },
  infoChipValue: {
    ...typo.body,
    color: color.gray900,
    fontWeight: 600,
  },
  aboutmeCard: {
    width: "100%",
    padding: "10px 14px",
    background: color.white,
    borderRadius: radius.md,
    border: `1px solid ${color.gray200}`,
  },
  aboutmeLabel: {
    ...typo.caption,
    color: color.gray500,
    fontSize: 11,
    marginBottom: 2,
  },
  aboutmeText: {
    ...typo.body,
    color: color.gray800,
    whiteSpace: "pre-line" as const,
  },
  editBtn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: radius.lg,
    border: `1.5px solid ${color.mint500}`,
    background: color.white,
    color: color.mint600,
    ...typo.button,
    marginBottom: 24,
    cursor: "pointer",
  },
  section: {
    background: color.white,
    borderRadius: radius.xl,
    padding: "4px 0",
    marginBottom: 16,
  },
  sectionTitle: {
    ...typo.caption,
    color: color.gray500,
    padding: "12px 16px 4px",
    textTransform: "uppercase" as const,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    cursor: "pointer",
  },
  rowLabel: {
    ...typo.body,
    color: color.gray800,
    flex: 1,
  },
};
