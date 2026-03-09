import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  EmailAuthProvider,
  RecaptchaVerifier,
  linkWithCredential,
  signInWithPhoneNumber,
  signOut,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/infra/firebase/client";
import { Header, Button } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";
import { upsertUser } from "@/domains/user/user.repo";

const isTestMode = import.meta.env.VITE_USE_PHONE_TEST_MODE === "true";
if (isTestMode) {
  (auth as any).settings.appVerificationDisabledForTesting = true;
}

function toE164(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return `+82${digits.slice(1)}`;
  if (digits.startsWith("82")) return `+${digits}`;
  return `+${digits}`;
}

function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@gardenus.local`;
}

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState<"phone" | "code" | "account">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [gender, setGender] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationRef = useRef<ConfirmationResult | null>(null);

  const ensureVerifier = () => {
    if (verifierRef.current) return;
    verifierRef.current = new RecaptchaVerifier(auth, "signup-recaptcha", {
      size: "invisible",
    });
  };

  const handleSendCode = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setError("");
    try {
      ensureVerifier();
      if (!verifierRef.current) throw new Error("reCAPTCHA 초기화 실패");
      const result = await signInWithPhoneNumber(
        auth,
        toE164(phone.trim()),
        verifierRef.current,
      );
      confirmationRef.current = result;
      setStep("code");
    } catch (err: any) {
      console.error("[SignupPage] send code failed", err);
      const code = err?.code ? ` (${err.code})` : "";
      setError(`인증번호 전송에 실패했습니다.${code}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmationRef.current || !code.trim()) return;
    setLoading(true);
    setError("");
    try {
      await confirmationRef.current.confirm(code.trim());
      setStep("account");
    } catch (err: any) {
      console.error("[SignupPage] verify code failed", err);
      const code = err?.code ? ` (${err.code})` : "";
      setError(`인증번호 확인에 실패했습니다.${code}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async () => {
    const id = loginId.trim().toLowerCase();
    if (!id || !password || !password2) return;
    if (gender == null) {
      setError("성별을 선택해 주세요.");
      return;
    }
    if (password !== password2) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser || !currentUser.phoneNumber) {
      setError("휴대폰 인증 상태가 만료되었습니다. 다시 시도해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const email = loginIdToEmail(id);
      const credential = EmailAuthProvider.credential(email, password);
      await linkWithCredential(currentUser, credential);
      // Rules에서 request.auth.token.email을 사용하므로 최신 토큰으로 갱신
      await currentUser.getIdToken(true);
    } catch (err: any) {
      console.error("[SignupPage] credential link failed", err);
      const code = err?.code as string | undefined;
      if (err?.code === "auth/email-already-in-use") {
        setError("이미 사용 중인 아이디입니다.");
      } else if (code === "auth/provider-already-linked") {
        setError("이미 회원가입된 계정입니다. 로그인해 주세요.");
      } else if (code === "auth/requires-recent-login") {
        setError("휴대폰 인증이 만료되었습니다. 처음부터 다시 진행해 주세요.");
      } else {
        setError(`회원가입에 실패했습니다.${code ? ` (${code})` : ""}`);
      }
      await signOut(auth).catch(() => {});
      setStep("phone");
      setCode("");
      setPassword("");
      setPassword2("");
      setLoading(false);
      return;
    }

    try {
      await upsertUser(id, {
        loginId: id,
        authUid: currentUser.uid,
        phoneNumber: currentUser.phoneNumber,
        gender,
        authProvider: "phone",
        reminderEnabled: true,
        ad: true,
        isProfileVisible: true,
      });
      navigate("/");
    } catch (err: any) {
      console.error("[SignupPage] create account failed", err);
      const code = err?.code ? ` (${err.code})` : "";
      setError(
        `계정 생성은 완료됐지만 프로필 저장에 실패했습니다${code}.\n로그인 후 다시 시도해 주세요.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <Header title="회원가입" showBack />
      <div style={styles.content}>
        {step === "phone" && (
          <>
            <label style={styles.label}>휴대폰 번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="전화번호를 입력해주세요."
              style={styles.input}
            />
          </>
        )}

        {step === "code" && (
          <>
            <label style={styles.label}>인증번호</label>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="문자로 받은 6자리 코드"
              style={styles.input}
            />
          </>
        )}

        {step === "account" && (
          <>
            <label style={styles.label}>아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디를 입력해주세요."
              style={styles.input}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              style={styles.input}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>비밀번호 확인</label>
            <input
              type="password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="비밀번호를 다시 입력해주세요."
              style={styles.input}
            />
            <label style={{ ...styles.label, marginTop: 12 }}>성별</label>
            <div style={styles.genderRow}>
              <button
                type="button"
                style={{
                  ...styles.genderBtn,
                  ...(gender === true ? styles.genderBtnActive : {}),
                }}
                onClick={() => setGender(true)}
              >
                남자
              </button>
              <button
                type="button"
                style={{
                  ...styles.genderBtn,
                  ...(gender === false ? styles.genderBtnActive : {}),
                }}
                onClick={() => setGender(false)}
              >
                여자
              </button>
            </div>
            <p style={styles.genderHint}>성별은 가입 후 변경할 수 없습니다.</p>
          </>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>

      <div id="signup-recaptcha" />

      <div style={styles.bottom}>
        {step === "phone" && (
          <Button onClick={handleSendCode} disabled={!phone.trim() || loading}>
            {loading ? "전송 중..." : "인증번호 전송"}
          </Button>
        )}
        {step === "code" && (
          <Button onClick={handleVerifyCode} disabled={!code.trim() || loading}>
            {loading ? "확인 중..." : "휴대폰 인증 확인"}
          </Button>
        )}
        {step === "account" && (
          <Button
            onClick={handleCreateAccount}
            disabled={!loginId.trim() || !password || !password2 || loading}
          >
            {loading ? "가입 중..." : "회원가입 완료"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SignupPage;

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
  label: {
    ...typo.subheading,
    color: color.gray900,
    display: "block",
    marginBottom: 10,
  },
  input: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: radius.lg,
    background: color.gray100,
    fontSize: 16,
    color: color.gray900,
  },
  error: {
    ...typo.caption,
    color: color.danger,
    marginTop: 10,
    whiteSpace: "pre-line" as const,
  },
  bottom: {
    padding: "20px",
  },
  genderRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 2,
  },
  genderBtn: {
    padding: "10px 0",
    borderRadius: radius.lg,
    border: `1.5px solid ${color.gray300}`,
    background: color.white,
    color: color.gray600,
    ...typo.button,
    cursor: "pointer",
  },
  genderBtnActive: {
    borderColor: color.mint500,
    background: color.mint50,
    color: color.mint700,
  },
  genderHint: {
    ...typo.caption,
    color: color.gray500,
    marginTop: 8,
  },
};
