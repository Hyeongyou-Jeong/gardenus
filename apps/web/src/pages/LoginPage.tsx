import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { auth } from "@/infra/firebase/client";
import { useAuth } from "@/auth/AuthContext";
import { Header, Button } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";

/** 한국 전화번호를 E.164 형식으로 변환 */
function toE164(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.startsWith("0")) return "+82" + digits.slice(1);
  if (digits.startsWith("82")) return "+" + digits;
  return "+" + digits;
}

/* ----------------------------------------------------------------
   SDK 버전 호환 RecaptchaVerifier 생성
   v9 compat: new RecaptchaVerifier("containerId", options, auth)
   v9 modular: new RecaptchaVerifier(auth, "containerId", options)
   ---------------------------------------------------------------- */
function createVerifier(
  options: Record<string, unknown>
): RecaptchaVerifier {
  // 시도 1: modular (firebase v11+)
  try {
    const v = new RecaptchaVerifier(auth, "recaptcha-container", options);
    console.log("[reCAPTCHA] created (modular signature)");
    return v;
  } catch (e1) {
    console.warn("[reCAPTCHA] modular signature failed, trying compat…", e1);
  }

  // 시도 2: compat (firebase v9 compat)
  try {
    const v = new (RecaptchaVerifier as any)(
      "recaptcha-container",
      options,
      auth
    );
    console.log("[reCAPTCHA] created (compat signature)");
    return v;
  } catch (e2) {
    console.error("[reCAPTCHA] both signatures failed", e2);
    throw new Error(
      "RecaptchaVerifier 생성 실패 — Firebase SDK 버전을 확인하세요."
    );
  }
}

/* ================================================================
   LoginPage
   ================================================================ */

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setPendingPhone, setConfirmationResult } = useAuth();

  const [phone, setPhone] = useState("");
  const [sending, setSending] = useState(false);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 디버깅: 현재 host 출력
  useEffect(() => {
    console.log("[host]", window.location.host);
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

  /* ---- reCAPTCHA 초기화 (마운트 시 1회) ---- */
  const initVerifier = useCallback(async () => {
    // 기존 정리
    try {
      verifierRef.current?.clear();
    } catch { /* ignore */ }
    verifierRef.current = null;
    setCaptchaReady(false);

    // #recaptcha-container 내부 비우기 (재생성 대비)
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";

    try {
      const verifier = createVerifier({
        size: "normal",
        callback: () => {
          console.log("[reCAPTCHA] solved ✓");
        },
        "expired-callback": () => {
          console.warn("[reCAPTCHA] expired — re-initializing");
          initVerifier();
        },
      });

      const widgetId = await verifier.render();
      console.log("[reCAPTCHA] rendered, widgetId =", widgetId);
      verifierRef.current = verifier;
      setCaptchaReady(true);
    } catch (err) {
      console.error("[reCAPTCHA] init failed", err);
      setError("캡차 초기화에 실패했습니다. 페이지를 새로고침해 주세요.");
    }
  }, []);

  useEffect(() => {
    initVerifier();
    return () => {
      try {
        verifierRef.current?.clear();
      } catch { /* ignore */ }
      verifierRef.current = null;
    };
  }, [initVerifier]);

  /* 쿨다운 종료 시 reCAPTCHA 자동 재초기화 */
  const prevCooldown = useRef(cooldown);
  useEffect(() => {
    if (prevCooldown.current > 0 && cooldown === 0) {
      initVerifier();
    }
    prevCooldown.current = cooldown;
  }, [cooldown, initVerifier]);

  /* ---- SMS 발송 ---- */
  const handleSend = async () => {
    const trimmed = phone.trim();
    if (!trimmed || !verifierRef.current) return;

    setSending(true);
    setError("");

    try {
      const e164 = toE164(trimmed);
      console.log("[LoginPage] sending SMS to", e164);

      const result = await signInWithPhoneNumber(
        auth,
        e164,
        verifierRef.current
      );
      setConfirmationResult(result);
      setPendingPhone(trimmed);
      navigate("/verify");
    } catch (err: any) {
      const code = err?.code ?? "unknown";
      const msg = err?.message ?? String(err);
      console.error("[send sms failed]", { code, message: msg, raw: err });

      if (code === "auth/too-many-requests") {
        setError(
          "요청이 많아 SMS 발송이 일시 제한되었습니다.\n" +
          "Firebase Console → Authentication → Phone → 테스트 번호 기능으로 진행하세요."
        );
        // reCAPTCHA 정리 & 30초 쿨다운
        try { verifierRef.current?.clear(); } catch { /* ignore */ }
        verifierRef.current = null;
        setCaptchaReady(false);
        const container = document.getElementById("recaptcha-container");
        if (container) container.innerHTML = "";
        startCooldown(30);
      } else if (
        code === "auth/captcha-check-failed" ||
        code === "auth/invalid-app-credential"
      ) {
        setError("캡차를 다시 진행해 주세요.");
        // verifier 재초기화
        await initVerifier();
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

        {/* reCAPTCHA 위젯 (normal — 화면에 표시) */}
        <div id="recaptcha-container" style={styles.captchaBox} />
      </div>

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
            onClick={!captchaReady && !verifierRef.current ? initVerifier : handleSend}
            disabled={!phone.trim() || sending || !captchaReady}
          >
            {sending
              ? "전송 중..."
              : !captchaReady
                ? "캡차 로딩 중..."
                : "인증 번호 전송"}
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
  captchaBox: {
    marginTop: 20,
    display: "flex",
    justifyContent: "center",
  },
  bottom: {
    padding: "20px",
  },
};
