import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/infra/firebase/client";
import { useAuth } from "@/auth/AuthContext";
import { Header, Button } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";

function toE164(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "+82" + digits.slice(1);
  if (digits.startsWith("82")) return "+" + digits;
  return "+" + digits;
}

/*
 * TODO: 운영 배포 시 아래 줄 제거 — 테스트 번호 전용 우회
 * Firebase Console > Authentication > Phone > 테스트 번호가 등록되어 있어야 동작
 */
(auth as any).settings.appVerificationDisabledForTesting = true;

/* ================================================================
   LoginPage — reCAPTCHA 비활성화 (테스트 모드)
   ================================================================ */

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setPendingPhone, setConfirmationResult } = useAuth();

  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initDone = useRef(false);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current!);
          cooldownRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  /* ---- invisible reCAPTCHA (테스트 모드에서는 자동 통과) ---- */
  const ensureVerifier = useCallback(() => {
    if (verifierRef.current) return;
    try {
      verifierRef.current = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        { size: "invisible" },
      );
    } catch (e) {
      console.error("[reCAPTCHA] create failed", e);
    }
  }, []);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    ensureVerifier();
    return () => {
      try { verifierRef.current?.clear(); } catch { /* ignore */ }
      verifierRef.current = null;
    };
  }, [ensureVerifier]);

  /* ---- SMS 발송 ---- */
  const handleSend = async () => {
    const trimmed = phone.trim();
    if (!trimmed) return;

    ensureVerifier();
    if (!verifierRef.current) {
      setError("초기화 실패. 페이지를 새로고침해 주세요.");
      return;
    }

    setSending(true);
    setError("");

    try {
      const e164 = toE164(trimmed);
      console.log("[LoginPage] sending SMS to", e164);

      const result = await signInWithPhoneNumber(
        auth,
        e164,
        verifierRef.current,
      );
      setConfirmationResult(result);
      setPendingPhone(trimmed);
      navigate("/verify");
    } catch (err: any) {
      const code = err?.code ?? "unknown";
      console.error("[send sms failed]", { code, raw: err });

      if (code === "auth/too-many-requests") {
        setError(
          "요청이 많아 SMS 발송이 일시 제한되었습니다.\n" +
          "잠시 후 다시 시도해 주세요.",
        );
        try { verifierRef.current?.clear(); } catch { /* ignore */ }
        verifierRef.current = null;
        startCooldown(30);
      } else if (
        code === "auth/captcha-check-failed" ||
        code === "auth/invalid-app-credential"
      ) {
        setError("인증에 실패했습니다. 다시 시도해 주세요.");
        try { verifierRef.current?.clear(); } catch { /* ignore */ }
        verifierRef.current = null;
        ensureVerifier();
      } else {
        setError(`발송 실패: ${code}`);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.page}>
      <Header title="로그인" showBack />

      <div style={styles.content}>
        <label style={styles.label}>전화번호</label>
        <input
          type="tel"
          placeholder="전화번호를 입력해주세요."
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={styles.input}
        />
        <p style={styles.notice}>
          전화번호는 상대방에게 절대로 공개되지 않아요.
        </p>
        {error && <p style={styles.error}>{error}</p>}
      </div>

      {/* invisible reCAPTCHA 앵커 (화면에 표시 안 됨) */}
      <div id="recaptcha-container" />

      <div style={styles.bottom}>
        {cooldown > 0 ? (
          <>
            <p style={styles.cooldownText}>
              {cooldown}초 후 재시도할 수 있습니다.
            </p>
            <Button onClick={undefined} disabled>
              재시도 대기 ({cooldown}초)
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!phone.trim() || sending}
          >
            {sending ? "전송 중..." : "인증 번호 전송"}
          </Button>
        )}
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
  cooldownText: {
    ...typo.caption,
    color: color.gray500,
    textAlign: "center" as const,
    marginBottom: 8,
  },
  bottom: {
    padding: "20px",
  },
};
