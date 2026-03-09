import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useProfile } from "@/auth/ProfileContext";
import { Header, TabBar, Modal } from "@/ui";
import { updateUserFields, type UserDoc } from "@/domains/user/user.repo";
import { deleteAccount } from "@/auth/deleteAccount";
import {
  verifyStudentId,
  type VerifyStudentIdResult,
} from "@/auth/verifyStudentId";
import { useMyFlower } from "@/domains/user/useMyFlower";
import { storage } from "@/infra/firebase/storage";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
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
  const SHOW_VERIFY_DEBUG = import.meta.env.DEV;
  const navigate = useNavigate();
  const { isAuthed, phone, userId, authLoading, logout } = useAuth();
  const { myProfile: profile, profileLoading, patchProfile, refreshProfile } = useProfile();
  const { flower } = useMyFlower();
  const schoolVerified = !!(
    profile as { schoolVerified?: boolean } | null
  )?.schoolVerified;
  const schoolVerifyButtonDisabled = profileLoading || schoolVerified;
  const schoolVerifyButtonText = profileLoading
    ? "불러오는 중..."
    : schoolVerified
      ? "학교 인증 완료"
      : "학생증 인증하고 포인트 받기";

  const [logoutModal, setLogoutModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [schoolVerifyModal, setSchoolVerifyModal] = useState(false);
  const [schoolVerifyStep, setSchoolVerifyStep] = useState<
    "idle" | "uploading" | "verifying" | "done" | "retry" | "error"
  >("idle");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [schoolVerifyResult, setSchoolVerifyResult] = useState("");
  const [schoolVerifyResponse, setSchoolVerifyResponse] =
    useState<VerifyStudentIdResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFailed, setAvatarFailed] = useState(false);

  /* ---- 접근 제어 ---- */
  useEffect(() => {
    if (!authLoading && !isAuthed) {
      navigate("/login", { replace: true });
    }
  }, [authLoading, isAuthed, navigate]);

  /* ---- 토글 변경 → 전역 프로필 + 서버 반영 ---- */
  const handleToggleBenefit = (v: boolean) => {
    patchProfile({ ad: v });
    if (userId) {
      updateUserFields(userId, { ad: v }).catch((e) =>
        console.error("[MePage] ad 토글 저장 실패", e),
      );
    }
  };

  const handleToggleMatch = (v: boolean) => {
    patchProfile({ isProfileVisible: v });
    if (userId) {
      updateUserFields(userId, { isProfileVisible: v }).catch((e) =>
        console.error("[MePage] isProfileVisible 토글 저장 실패", e),
      );
    }
  };

  const handleToggleNotify = (v: boolean) => {
    patchProfile({ reminderEnabled: v });
    if (userId) {
      updateUserFields(userId, { reminderEnabled: v }).catch((e) =>
        console.error("[MePage] reminderEnabled 토글 저장 실패", e),
      );
    }
  };
  const handleLogout = () => {
    setLogoutModal(false);
    logout();
    navigate("/");
  };

  const handleWithdraw = async () => {
    setWithdrawModal(false);
    setWithdrawing(true);
    try {
      await deleteAccount();
      logout();
      navigate("/");
    } catch (err) {
      console.error("[MePage] 회원탈퇴 실패:", err);
      alert("탈퇴 처리 중 오류가 발생했습니다.");
      setWithdrawing(false);
    }
  };

  const resetSchoolVerifyModal = () => {
    setSchoolVerifyStep("idle");
    setSelectedFile(null);
    setSchoolVerifyResult("");
    setSchoolVerifyResponse(null);
  };

  const handleOpenSchoolVerifyModal = () => {
    resetSchoolVerifyModal();
    setSchoolVerifyModal(true);
  };

  const handleCloseSchoolVerifyModal = () => {
    if (schoolVerifyStep === "uploading" || schoolVerifyStep === "verifying") {
      return;
    }
    setSchoolVerifyModal(false);
    resetSchoolVerifyModal();
  };

  const handlePickSchoolIdImage = () => {
    if (schoolVerifyStep === "uploading" || schoolVerifyStep === "verifying") {
      return;
    }
    fileInputRef.current?.click();
  };

  const handleSchoolImageSelected = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file) {
      setSchoolVerifyResult(`${file.name} 선택됨`);
      if (
        schoolVerifyStep === "retry" ||
        schoolVerifyStep === "error" ||
        schoolVerifyStep === "done"
      ) {
        setSchoolVerifyStep("idle");
      }
    }
  };

  const handleStartSchoolVerification = async () => {
    if (!selectedFile) {
      setSchoolVerifyStep("error");
      setSchoolVerifyResult("파일을 선택해 주세요.");
      return;
    }
    if (!userId) {
      setSchoolVerifyStep("error");
      setSchoolVerifyResult("로그인 정보를 확인할 수 없습니다. 다시 로그인해 주세요.");
      return;
    }

    try {
      setSchoolVerifyStep("uploading");
      setSchoolVerifyResult("이미지 업로드 중…");
      const uploadBlob = await compressImage(selectedFile);
      const requestId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const storagePath = `studentIds/${userId}/${requestId}.jpg`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, uploadBlob, {
        contentType: "image/jpeg",
      });

      setSchoolVerifyStep("verifying");
      setSchoolVerifyResult("학교 인증 확인 중…");
      const result = await verifyStudentId(storagePath);
      setSchoolVerifyResponse(result);

      if (result.ok) {
        patchProfile({ schoolVerified: true } as Partial<UserDoc>);
        void refreshProfile();
        setSchoolVerifyStep("done");
        setSchoolVerifyResult(
          result.rewarded
            ? "학교 인증 완료! 포인트가 지급됐어요."
            : "학교 인증 완료! (포인트는 이미 지급됨)",
        );
        return;
      }

      setSchoolVerifyStep("retry");
      setSchoolVerifyResult("학교명이 잘 보이게 다시 촬영해 주세요.");
    } catch (error) {
      console.error("[MePage] 학교 인증 실패:", error);
      setSchoolVerifyStep("error");
      setSchoolVerifyResult("오류가 발생했어요. 다시 시도해 주세요.");
      setSchoolVerifyResponse(null);
    }
  };

  const handleSchoolVerifyConfirm = () => {
    if (schoolVerifyStep === "uploading" || schoolVerifyStep === "verifying") {
      return;
    }
    if (
      schoolVerifyStep === "done" ||
      schoolVerifyStep === "retry" ||
      schoolVerifyStep === "error"
    ) {
      handleCloseSchoolVerifyModal();
      return;
    }
    void handleStartSchoolVerification();
  };

  /* ---- 렌더링 ---- */
  if (authLoading) return null;
  if (!isAuthed) return null;

  const displayName = profile?.name ?? "이름 없음";
  const displayPhone = phone || "전화번호 없음";
  const profileImagePath = profile?.profileImagePath?.trim();
  const profileDirectUrl = (profile?.photoURL ?? profile?.aiPhotoURL)?.trim();

  useEffect(() => {
    let alive = true;
    setAvatarFailed(false);

    const resolveAvatar = async () => {
      if (profileImagePath) {
        try {
          const url = await getDownloadURL(ref(storage, profileImagePath));
          if (!alive) return;
          setAvatarUrl(url);
          return;
        } catch {
          // profileImagePath URL 변환 실패 시 direct URL로 폴백
        }
      }

      if (profileDirectUrl) {
        if (!alive) return;
        setAvatarUrl(profileDirectUrl);
        return;
      }

      if (!alive) return;
      setAvatarUrl(null);
    };

    void resolveAvatar();
    return () => {
      alive = false;
    };
  }, [profileImagePath, profileDirectUrl]);

  return (
    <div style={styles.page}>
      <Header title="마이 프로필" />

      <div style={styles.body}>
        {/* 프로필 섹션 */}
        <div style={styles.profileCard}>
          <div style={styles.avatar}>
            {avatarUrl && !avatarFailed ? (
              <img
                src={avatarUrl}
                alt="내 프로필 이미지"
                style={styles.avatarImage}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <svg width="48" height="48" viewBox="0 0 24 24" fill={color.gray400}>
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            )}
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
        <button
          style={schoolVerifyButtonDisabled ? styles.verifyBtnDisabled : styles.verifyBtn}
          disabled={schoolVerifyButtonDisabled}
          onClick={schoolVerifyButtonDisabled ? undefined : handleOpenSchoolVerifyModal}
        >
          {schoolVerifyButtonText}
        </button>

        {/* 서비스 이용 */}
        <div style={styles.section}>
          <p style={styles.sectionTitle}>서비스 이용</p>
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
            label="가드너스의 다양한 혜택 받기"
            right={<Toggle value={!!profile?.ad} onChange={handleToggleBenefit} />}
          />
          <Row
            label="매칭 받기"
            right={<Toggle value={!!profile?.isProfileVisible} onChange={handleToggleMatch} />}
          />
          <Row
            label="미응답 메시지 알림받기(오후 7시)"
            right={<Toggle value={!!profile?.reminderEnabled} onChange={handleToggleNotify} />}
          />
          <Row label="추천인 등록하기" right={<Chevron />} onClick={() => navigate("/inquiry")} />
          <Row label="리뷰 작성하기" right={<Chevron />} onClick={() => navigate("/review")} />
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
        open={withdrawModal || withdrawing}
        title="회원 탈퇴"
        description={
          withdrawing
            ? "탈퇴 처리 중입니다…"
            : "정말로 탈퇴하시겠습니까?\n탈퇴 시 모든 데이터가 삭제되며\n복구가 불가능합니다."
        }
        cancelText={withdrawing ? " " : "취소"}
        confirmText={withdrawing ? "처리 중…" : "탈퇴하기"}
        confirmDanger
        onCancel={() => { if (!withdrawing) setWithdrawModal(false); }}
        onConfirm={() => { if (!withdrawing) handleWithdraw(); }}
      />

      <Modal
        open={schoolVerifyModal}
        title="학교 인증하고 포인트 받기"
        description="학생증 사진을 업로드하면 학교 인증 후 포인트를 지급해드려요."
        cancelText={
          schoolVerifyStep === "uploading" || schoolVerifyStep === "verifying"
            ? "처리 중…"
            : schoolVerifyStep === "done" ||
                schoolVerifyStep === "retry" ||
                schoolVerifyStep === "error"
              ? "닫기"
              : "취소"
        }
        confirmText={
          schoolVerifyStep === "done" ||
          schoolVerifyStep === "retry" ||
          schoolVerifyStep === "error"
            ? "닫기"
            : "업로드하고 인증하기"
        }
        onCancel={handleCloseSchoolVerifyModal}
        onConfirm={handleSchoolVerifyConfirm}
      >
        <div style={styles.verifyModalBody}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleSchoolImageSelected}
          />
          <button
            style={styles.pickImageBtn}
            onClick={handlePickSchoolIdImage}
            disabled={
              schoolVerifyStep === "uploading" || schoolVerifyStep === "verifying"
            }
          >
            사진 선택
          </button>
          <p style={styles.verifyStatusText}>
            {schoolVerifyStep === "idle" && (schoolVerifyResult || "대기 중")}
            {schoolVerifyStep === "uploading" && "업로드 중…"}
            {schoolVerifyStep === "verifying" && "인증 확인 중…"}
            {(schoolVerifyStep === "done" ||
              schoolVerifyStep === "retry" ||
              schoolVerifyStep === "error") &&
              schoolVerifyResult}
          </p>
          {SHOW_VERIFY_DEBUG && schoolVerifyResponse && (
            <div style={styles.verifyDebugPanel}>
              <p style={styles.verifyDebugLine}>
                상태: {schoolVerifyResponse.status}
              </p>
              {schoolVerifyResponse.ok && (
                <p style={styles.verifyDebugLine}>
                  포인트 지급: {schoolVerifyResponse.rewarded ? "완료" : "기지급"}
                </p>
              )}
              <p style={styles.verifyDebugLine}>
                OCR 학생증같음:{" "}
                {schoolVerifyResponse.ocr
                  ? schoolVerifyResponse.ocr.isStudentIdLike ? "O" : "X"
                  : "없음"}
              </p>
              <p style={{ ...styles.verifyDebugLine, whiteSpace: "pre-line" }}>
                후보 학교명:{" "}
                {schoolVerifyResponse.ocr?.candidates?.length
                  ? schoolVerifyResponse.ocr.candidates.join("\n")
                  : "없음"}
              </p>
              <p style={styles.verifyDebugLine}>
                매칭된 후보: {schoolVerifyResponse.ocr?.matchedCandidate ?? "없음"}
              </p>
              <p style={styles.verifyDebugLine}>
                정제된 학교명:{" "}
                {schoolVerifyResponse.ocr?.detectedSchool ?? "읽기 실패"}
              </p>
              <p style={styles.verifyDebugLine}>
                추출 방식: {schoolVerifyResponse.ocr?.method ?? "none"}
              </p>
              <p style={styles.verifyDebugLine}>
                OCR 점수:{" "}
                {schoolVerifyResponse.ocr
                  ? schoolVerifyResponse.ocr.likeScore.toFixed(2)
                  : "N/A"}
              </p>
              <p style={styles.verifyDebugLine}>
                사유:{" "}
                {schoolVerifyResponse.ocr?.reason ||
                  (!schoolVerifyResponse.ok ? schoolVerifyResponse.reason : "-")}
              </p>
            </div>
          )}
        </div>
      </Modal>
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

async function compressImage(file: File): Promise<Blob> {
  try {
    const image = await loadImageFromFile(file);
    const maxSide = 1280;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.75);
    });
    return blob ?? file;
  } catch {
    return file;
  }
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

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
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
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
  verifyBtn: {
    width: "100%",
    padding: "12px 0",
    borderRadius: radius.lg,
    border: "none",
    background: color.mint500,
    color: color.white,
    ...typo.button,
    marginBottom: 24,
    cursor: "pointer",
  },
  verifyBtnDisabled: {
    width: "100%",
    padding: "12px 0",
    borderRadius: radius.lg,
    border: `1px solid ${color.mint300}`,
    background: color.mint100,
    color: color.mint600,
    ...typo.button,
    marginBottom: 24,
    cursor: "default",
    opacity: 0.9,
  },
  verifyModalBody: {
    marginTop: 8,
    display: "grid",
    gap: 10,
  },
  pickImageBtn: {
    width: "100%",
    padding: "10px 0",
    borderRadius: radius.md,
    border: `1px solid ${color.gray300}`,
    background: color.white,
    color: color.gray800,
    ...typo.button,
    cursor: "pointer",
  },
  verifyStatusText: {
    ...typo.body,
    color: color.gray700,
    minHeight: 20,
  },
  verifyDebugPanel: {
    marginTop: 8,
    textAlign: "left",
    padding: "10px 12px",
    background: color.gray100,
    borderRadius: radius.md,
    display: "grid",
    gap: 4,
  },
  verifyDebugLine: {
    ...typo.caption,
    color: color.gray700,
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
