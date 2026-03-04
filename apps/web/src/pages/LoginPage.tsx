import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/infra/firebase/client";
import { upsertUser } from "@/domains/user/user.repo";
import { Header, Button } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";

function loginIdToEmail(loginId: string): string {
  return `${loginId.trim().toLowerCase()}@gardenus.local`;
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    const trimmedId = loginId.trim();
    const trimmedPw = password.trim();
    if (!trimmedId || !trimmedPw) return;

    setLoggingIn(true);
    setError("");

    try {
      const email = loginIdToEmail(trimmedId);
      await signInWithEmailAndPassword(auth, email, trimmedPw);
      // 회원가입 중 users 문서 저장이 실패했을 수 있어 로그인 시 보정 시도
      await upsertUser(trimmedId.toLowerCase(), {
        loginId: trimmedId.toLowerCase(),
        authUid: auth.currentUser?.uid,
        phoneNumber: auth.currentUser?.phoneNumber ?? undefined,
        authProvider: "password_phone",
      }).catch((e) => {
        console.warn("[LoginPage] user doc backfill skipped", e);
      });
      navigate("/");
    } catch (err: any) {
      console.error("[LoginPage] login failed", err);
      setError("아이디 또는 비밀번호가 올바르지 않습니다.");
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div style={styles.page}>
      <Header title="로그인" showBack />

      <div style={styles.content}>
        <label style={styles.label}>아이디</label>
        <input
          type="text"
          placeholder="아이디를 입력해주세요."
          value={loginId}
          onChange={(e) => setLoginId(e.target.value)}
          style={styles.input}
        />
        <label style={{ ...styles.label, marginTop: 14 }}>비밀번호</label>
        <input
          type="password"
          placeholder="비밀번호를 입력해주세요."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />
        <p style={styles.notice}>
          계정이 없다면 회원가입 후 이용해 주세요.
        </p>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      <div style={styles.bottom}>
        <Button
          onClick={handleLogin}
          disabled={!loginId.trim() || !password.trim() || loggingIn}
        >
          {loggingIn ? "로그인 중..." : "로그인"}
        </Button>
        <button style={styles.signupBtn} onClick={() => navigate("/signup")}>
          회원가입
        </button>
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
  notice: {
    ...typo.caption,
    color: color.gray500,
    marginTop: 10,
  },
  error: {
    ...typo.caption,
    color: color.danger,
    marginTop: 8,
    whiteSpace: "pre-line" as const,
  },
  bottom: {
    padding: "20px",
  },
  signupBtn: {
    width: "100%",
    marginTop: 10,
    padding: "12px 0",
    borderRadius: radius.lg,
    background: color.white,
    border: `1px solid ${color.gray300}`,
    color: color.gray700,
    ...typo.button,
    cursor: "pointer",
  },
};
