/**
 * Auth Repository – mock 구현
 * 2차에서 Firebase Phone Auth 연동 예정
 */

export interface AuthUser {
  userId: string;
  phone: string;
}

/** 인증번호 전송 (mock) */
export async function sendVerificationCode(phone: string): Promise<{ ok: boolean }> {
  console.log("[mock] SMS sent to", phone);
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 300));
}

/** OTP 검증 + 로그인 (mock) */
export async function verifyCodeAndLogin(
  phone: string,
  code: string
): Promise<AuthUser> {
  console.log("[mock] verifying code", code, "for", phone);
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          userId: "mock-user-" + Date.now(),
          phone,
        }),
      300
    )
  );
}

/** 로그아웃 (mock) */
export async function logout(): Promise<void> {
  console.log("[mock] logged out");
}
