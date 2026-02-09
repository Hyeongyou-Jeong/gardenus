import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Header, Button } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";

const isTestMode =
  import.meta.env.VITE_USE_PHONE_TEST_MODE === "true";

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { pendingPhone, confirmationResult } = useAuth();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [agreed, setAgreed] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  /* ---- confirmationResult가 없으면 /login으로 리다이렉트 ----
     테스트 모드에서는 SMS 발송 실패(too-many-requests)로
     confirmationResult가 없을 수 있으므로 리다이렉트하지 않음 */
  useEffect(() => {
    if (!confirmationResult && !isTestMode) {
      navigate("/login", { replace: true });
    }
  }, [confirmationResult, navigate]);

  const otpFull = otp.every((v) => v !== "");
  const canSubmit = otpFull && agreed && !verifying;

  const handleChange = (idx: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[idx] = value;
    setOtp(next);

    if (value && idx < 5) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  /* ---- OTP 확인 → 로그인 ---- */
  const handleLogin = async () => {
    if (!canSubmit) return;

    /* confirmationResult가 없는 경우 (too-many-requests 후 테스트 모드 진입) */
    if (!confirmationResult) {
      setError(
        "SMS 발송이 완료되지 않아 인증을 진행할 수 없습니다.\n" +
        "Firebase Console에서 테스트 번호를 등록한 뒤,\n" +
        "LoginPage에서 해당 번호로 다시 시도해 주세요."
      );
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const code = otp.join("");
      console.log("[VerifyPage] confirming code", code);
      await confirmationResult.confirm(code);
      // onAuthStateChanged가 user를 세팅 → isAuthed=true
      navigate("/");
    } catch (err: any) {
      console.error("[VerifyPage] confirm 실패", err);
      setError(
        err?.code === "auth/invalid-verification-code"
          ? "인증번호가 올바르지 않습니다."
          : "인증에 실패했습니다. 다시 시도해 주세요."
      );
    } finally {
      setVerifying(false);
    }
  };

  if (!confirmationResult && !isTestMode) return null; // 리다이렉트 대기 중

  return (
    <div style={styles.page}>
      <Header title="로그인" showBack />

      <div style={styles.content}>
        {isTestMode && (
          <div style={styles.testBanner}>
            <strong>테스트 모드</strong>
            <span>
              Firebase Console에서 설정한 테스트 번호/코드를 사용하세요.
              {!confirmationResult &&
                "\nSMS 발송이 제한되었습니다. 테스트 번호로 다시 로그인하세요."}
            </span>
          </div>
        )}

        <p style={styles.guide}>
          {pendingPhone || "전화번호"}로 전송된{"\n"}인증번호 6자리를
          입력해주세요.
        </p>

        {/* OTP 입력 */}
        <div style={styles.otpRow}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              style={{
                ...styles.otpInput,
                borderColor: digit ? color.mint500 : color.gray300,
              }}
            />
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* 이용약관 동의 */}
        <label style={styles.checkbox}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={styles.checkInput}
          />
          <span
            style={{
              ...styles.checkBox,
              background: agreed ? color.mint500 : color.white,
              borderColor: agreed ? color.mint500 : color.gray400,
            }}
          >
            {agreed && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke={color.white}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span style={styles.checkLabel}>
            이용약관 및 개인정보 수집 이용 동의
          </span>
        </label>
      </div>

      <div style={styles.bottom}>
        <Button onClick={handleLogin} disabled={!canSubmit}>
          {verifying ? "확인 중..." : "로그인"}
        </Button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: color.white,
  },
  content: {
    flex: 1,
    padding: "32px 20px 0",
  },
  guide: {
    ...typo.body,
    color: color.gray700,
    marginBottom: 28,
    whiteSpace: "pre-line" as const,
    lineHeight: "22px",
  },
  otpRow: {
    display: "flex",
    gap: 8,
    justifyContent: "center",
    marginBottom: 16,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: radius.md,
    border: `2px solid ${color.gray300}`,
    textAlign: "center" as const,
    fontSize: 24,
    fontWeight: 700,
    color: color.gray900,
    background: color.gray50,
    outline: "none",
    transition: "border-color 0.15s",
  },
  error: {
    ...typo.caption,
    color: color.danger,
    textAlign: "center" as const,
    marginBottom: 16,
    whiteSpace: "pre-line" as const,
  },
  testBanner: {
    background: "#FFF3CD",
    border: "1px solid #FFECB5",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    fontSize: 13,
    lineHeight: "18px",
    color: "#856404",
    whiteSpace: "pre-line" as const,
  },
  checkbox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  checkInput: {
    position: "absolute" as const,
    opacity: 0,
    width: 0,
    height: 0,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    transition: "all 0.15s",
  },
  checkLabel: {
    ...typo.body,
    color: color.gray700,
  },
  bottom: {
    padding: "20px",
  },
};
