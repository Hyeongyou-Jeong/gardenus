import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { fetchUser, type UserDoc } from "@/domains/user/user.repo";

/* ================================================================
   타입
   ================================================================ */

interface ProfileContextValue {
  /** 내 프로필 문서 (null = 아직 미로드 or 미인증) */
  myProfile: UserDoc | null;
  /** 로딩 중 */
  profileLoading: boolean;
  /** 전역 프로필 상태를 부분 업데이트 (서버 접근 없음, 메모리만) */
  patchProfile: (patch: Partial<UserDoc>) => void;
  /** 서버에서 다시 로드 */
  refreshProfile: () => Promise<void>;
}

/* ================================================================
   Context
   ================================================================ */

const ProfileContext = createContext<ProfileContextValue>({
  myProfile: null,
  profileLoading: true,
  patchProfile: () => {},
  refreshProfile: async () => {},
});

/* ================================================================
   Provider
   ================================================================ */

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { phone, isAuthed } = useAuth();

  const [myProfile, setMyProfile] = useState<UserDoc | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  /* ---- 로그인 시 1회 로드 ---- */
  useEffect(() => {
    if (!isAuthed || !phone) {
      setMyProfile(null);
      setProfileLoading(false);
      return;
    }

    let alive = true;
    setProfileLoading(true);

    fetchUser(phone)
      .then((doc) => {
        if (alive) setMyProfile(doc);
      })
      .catch((e) => console.error("[ProfileContext] load failed", e))
      .finally(() => {
        if (alive) setProfileLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [phone, isAuthed]);

  /* ---- 부분 업데이트 (메모리만, 서버 접근 없음) ---- */
  const patchProfile = useCallback((patch: Partial<UserDoc>) => {
    setMyProfile((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  /* ---- 서버에서 다시 로드 ---- */
  const refreshProfile = useCallback(async () => {
    if (!phone) return;
    setProfileLoading(true);
    try {
      const doc = await fetchUser(phone);
      setMyProfile(doc);
    } catch (e) {
      console.error("[ProfileContext] refresh failed", e);
    } finally {
      setProfileLoading(false);
    }
  }, [phone]);

  return (
    <ProfileContext.Provider
      value={{ myProfile, profileLoading, patchProfile, refreshProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => useContext(ProfileContext);
