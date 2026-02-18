import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  onAuthStateChanged,
  signOut,
  type User,
  type ConfirmationResult,
} from "firebase/auth";
import { auth } from "@/infra/firebase/client";

/* ================================================================
   타입
   ================================================================ */

interface AuthContextValue {
  /** Firebase User 객체 (null = 미인증) */
  user: User | null;
  /** 간편 플래그 */
  isAuthed: boolean;
  /** 유저 전화번호 (E.164 형식) */
  phone: string;
  /** Firebase uid */
  userId: string;
  /** 인증 상태 초기 로딩 여부 */
  authLoading: boolean;
  /** 로그아웃 */
  logout: () => Promise<void>;

  /* ---- Phone Auth 플로우 전달용 ---- */
  /** LoginPage에서 설정한 pendingPhone (표시용, 한국 번호) */
  pendingPhone: string;
  setPendingPhone: (v: string) => void;
  /** signInWithPhoneNumber의 결과를 저장/조회 */
  confirmationResult: ConfirmationResult | null;
  setConfirmationResult: (v: ConfirmationResult | null) => void;
}

/* ================================================================
   Context
   ================================================================ */

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthed: false,
  phone: "",
  userId: "",
  authLoading: true,
  logout: async () => {},
  pendingPhone: "",
  setPendingPhone: () => {},
  confirmationResult: null,
  setConfirmationResult: () => {},
});

/* ================================================================
   Provider
   ================================================================ */

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [pendingPhone, setPendingPhone] = useState("");
  const confirmRef = useRef<ConfirmationResult | null>(null);
  // state로도 관리해서 VerifyPage에서 리렌더 트리거
  const [confirmationResult, _setConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const setConfirmationResult = useCallback(
    (v: ConfirmationResult | null) => {
      confirmRef.current = v;
      _setConfirmationResult(v);
    },
    []
  );

  /* onAuthStateChanged — 새로고침 시 로그인 상태 복원 */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setConfirmationResult(null);
    setPendingPhone("");
  }, [setConfirmationResult]);

  const isAuthed = !!user;
  const phone = user?.phoneNumber ?? "";
  const userId = user?.uid ?? "";
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthed,
        phone,
        userId,
        authLoading,
        logout,
        pendingPhone,
        setPendingPhone,
        confirmationResult,
        setConfirmationResult,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
