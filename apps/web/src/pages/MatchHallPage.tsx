import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Modal, TabBar } from "@/ui";
import { color, radius, shadow, typo, calcAge } from "@gardenus/shared";
import { fetchUserProfiles } from "@/domains/profile/profile.repo";
import { getFlowerProfileUrl } from "@/infra/firebase/storage";
import type { UserProfile } from "@/domains/profile/profile.types";

/* ---- Storage URL 캐시 (모듈 스코프, 동일 id 재요청 방지) ---- */
const imgCache = new Map<string, string>();

/* ================================================================
   MatchHallPage — Firestore users 컬렉션 기반 프로필 카드
   ================================================================ */

export const MatchHallPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed } = useAuth();

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModal, setLoginModal] = useState(false);
  const [matchModal, setMatchModal] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  /* ---- Firestore에서 유저 로드 ---- */
  useEffect(() => {
    setLoading(true);
    fetchUserProfiles(30)
      .then((data) => {
        console.log("[users loaded]", data.length, data[0]);
        setProfiles(data);
        setCurrentIdx(0);
        setError(null);
      })
      .catch((err) => {
        console.error("[users load error]", err);
        setError("프로필을 불러오지 못했습니다.");
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---- 현재 프로필 ---- */
  const current: UserProfile | undefined =
    profiles.length > 0
      ? profiles[currentIdx % profiles.length]
      : undefined;

  /* ---- 액션 ---- */
  const handleNext = () => {
    if (profiles.length === 0) return;
    setCurrentIdx((i) => (i + 1) % profiles.length);
  };

  const handleHeart = () => {
    if (!isAuthed) {
      setLoginModal(true);
    } else {
      setMatchModal(true);
    }
  };

  /* ---- profileImageId → Storage URL 비동기 로드 (캐시) ---- */
  useEffect(() => {
    let alive = true;
    const id = current?.profileImageId;
    setImgFailed(false);

    if (!id) {
      setImgUrl(null);
      return;
    }
    if (imgCache.has(id)) {
      setImgUrl(imgCache.get(id)!);
      return;
    }

    setImgUrl(null); // 로딩 중에는 placeholder
    getFlowerProfileUrl(id).then((url) => {
      if (!alive) return;
      if (url) imgCache.set(id, url);
      setImgUrl(url);
    });

    return () => {
      alive = false;
    };
  }, [current?.profileImageId]);

  /* ---- 파생 데이터 (current 기반) ---- */
  const showImg = !!imgUrl && !imgFailed;
  const age = current ? calcAge(current.born) : null;
  const chips = current
    ? [current.mbti, current.department, current.cigar]
        .filter((v): v is string => !!v && String(v).trim() !== "")
        .slice(0, 3)
    : [];

  /* ================================================================
     렌더링
     ================================================================ */

  return (
    <div style={styles.page}>
      {/* ---- 카드 영역 ---- */}
      {loading ? (
        /* 스켈레톤 카드 */
        <div style={styles.card}>
          <div style={styles.skeletonImage}>
            <div style={styles.skeletonPulse} />
          </div>
          <div style={styles.cardBody}>
            <div style={{ ...styles.skeletonLine, width: "40%" }} />
            <div style={{ ...styles.skeletonLine, width: "60%", marginTop: 8 }} />
            <div style={{ ...styles.skeletonLine, width: "30%", marginTop: 8 }} />
          </div>
        </div>
      ) : error ? (
        /* 에러 */
        <div style={styles.messageBox}>
          <p style={{ color: color.danger }}>{error}</p>
        </div>
      ) : !current ? (
        /* 유저 0명 */
        <div style={styles.messageBox}>
          <p>데이터 없음</p>
        </div>
      ) : (
        /* 실제 프로필 카드 */
        <div style={styles.card}>
          {showImg ? (
            <img
              src={imgUrl!}
              alt={current.name || "profile"}
              style={styles.profileImage}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <div style={styles.imagePlaceholder}>
              <span style={styles.placeholderText}>
                {current.name || "Profile"}
              </span>
            </div>
          )}

          <div style={styles.cardBody}>
            <div style={styles.nameRow}>
              <span style={styles.name}>{current.name || "이름 없음"}</span>
              {age != null && <span style={styles.age}>{age}세</span>}
            </div>

            {(current.residence || current.mbti) && (
              <p style={styles.location}>
                {current.residence ?? ""}
                {current.residence && current.mbti ? " · " : ""}
                {current.mbti ?? ""}
              </p>
            )}

            {current.school && <p style={styles.school}>{current.school}</p>}

            {current.aboutme && (
              <p style={styles.aboutme}>{current.aboutme}</p>
            )}

            {chips.length > 0 && (
              <div style={styles.tags}>
                {chips.map((tag) => (
                  <span key={tag} style={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- 액션 버튼 (데이터 있을 때만) ---- */}
      {!loading && current && (
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={handleNext}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke={color.gray600}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            style={{ ...styles.actionBtn, ...styles.heartBtn }}
            onClick={handleHeart}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill={color.white}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      )}

      {/* ---- 사업자 정보 ---- */}
      <div style={styles.businessSection}>
        <p style={styles.businessTitle}>사업자 정보</p>
        <div style={styles.businessCard}>
          <p style={styles.businessRow}>상호명: 더가든</p>
          <p style={styles.businessRow}>대표자: 이정훈</p>
          <p style={styles.businessRow}>사업자등록번호: 702-07-02549</p>
          <p style={styles.businessRow}>
            통신판매업신고번호: 2023-서울성동-1168
          </p>
          <p style={styles.businessRow}>
            주소: 서울특별시 성동구 왕십리로80(성수동1가, 동아아파트)
          </p>
          <p style={styles.businessRow}>고객센터: 031-282-2449</p>
        </div>
      </div>

      {/* ---- 하단 탭바 ---- */}
      <TabBar />

      {/* ---- 로그인 모달 ---- */}
      <Modal
        open={loginModal}
        title="로그인 하기"
        description={"매칭 요청을 보내려면\n로그인이 필요합니다."}
        cancelText="취소"
        confirmText="확인"
        onCancel={() => setLoginModal(false)}
        onConfirm={() => {
          setLoginModal(false);
          navigate("/login");
        }}
      />

      {/* ---- 매칭 요청 모달 ---- */}
      <Modal
        open={matchModal}
        title="매칭 요청"
        description={`${current?.name || "상대"}님에게 매칭을 요청할까요?`}
        cancelText="취소"
        confirmText="요청하기"
        onCancel={() => setMatchModal(false)}
        onConfirm={() => {
          setMatchModal(false);
        }}
      >
        <div style={styles.flowerInfo}>
          <div style={styles.flowerRow}>
            <span style={styles.flowerLabel}>보유 플라워</span>
            <span style={styles.flowerValue}>9,640</span>
          </div>
          <div style={styles.flowerRow}>
            <span style={styles.flowerLabel}>소모 플라워</span>
            <span style={{ ...styles.flowerValue, color: color.danger }}>
              -500
            </span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/* ================================================================
   스타일
   ================================================================ */

const skeletonKeyframes = `
@keyframes skeleton-pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}
`;

/* 스켈레톤 keyframes를 head에 주입 */
if (typeof document !== "undefined") {
  const id = "skeleton-keyframes";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent = skeletonKeyframes;
    document.head.appendChild(style);
  }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    paddingBottom: 100,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 16,
  },
  messageBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "calc(100% - 32px)",
    height: 300,
    borderRadius: radius.xxl,
    background: color.gray100,
    color: color.gray500,
  },

  /* ---- 카드 ---- */
  card: {
    width: "calc(100% - 32px)",
    borderRadius: radius.xxl,
    overflow: "hidden",
    boxShadow: shadow.card,
    background: color.white,
  },
  profileImage: {
    width: "100%",
    height: 420,
    objectFit: "cover" as const,
    display: "block",
    background: color.gray100,
  },
  imagePlaceholder: {
    width: "100%",
    height: 420,
    background: `linear-gradient(135deg, ${color.mint100} 0%, ${color.mint300} 100%)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: 700,
    color: color.mint700,
    opacity: 0.6,
    letterSpacing: 1,
  },
  cardBody: {
    padding: "16px 20px 20px",
  },
  nameRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  name: {
    ...typo.heading,
    color: color.gray900,
  },
  age: {
    ...typo.body,
    color: color.gray600,
  },
  location: {
    ...typo.body,
    color: color.gray500,
    marginTop: 4,
  },
  school: {
    ...typo.caption,
    color: color.gray500,
    marginTop: 2,
  },
  aboutme: {
    ...typo.body,
    color: color.gray700,
    marginTop: 8,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "20px",
    maxHeight: 40,
  },
  tags: {
    display: "flex",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap" as const,
  },
  tag: {
    ...typo.caption,
    background: color.mint50,
    color: color.mint700,
    padding: "4px 10px",
    borderRadius: radius.full,
  },

  /* ---- 스켈레톤 ---- */
  skeletonImage: {
    width: "100%",
    height: 420,
    background: color.gray100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonPulse: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    background: color.gray200,
    animation: "skeleton-pulse 1.4s ease-in-out infinite",
  },
  skeletonLine: {
    height: 16,
    borderRadius: 8,
    background: color.gray200,
    animation: "skeleton-pulse 1.4s ease-in-out infinite",
  },

  /* ---- 액션 ---- */
  actions: {
    display: "flex",
    gap: 24,
    marginTop: 20,
  },
  actionBtn: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    background: color.white,
    boxShadow: shadow.card,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  heartBtn: {
    background: color.mint500,
    boxShadow: shadow.button,
  },

  /* ---- 사업자 정보 ---- */
  businessSection: {
    width: "calc(100% - 32px)",
    marginTop: 32,
  },
  businessTitle: {
    ...typo.subheading,
    color: color.gray700,
    marginBottom: 10,
  },
  businessCard: {
    background: color.gray50,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: "16px 18px",
  },
  businessRow: {
    ...typo.caption,
    color: color.gray500,
    lineHeight: "20px",
    marginBottom: 2,
  },

  /* ---- 모달 내 플라워 ---- */
  flowerInfo: {
    background: color.gray50,
    borderRadius: radius.md,
    padding: "12px 16px",
    marginTop: 8,
    marginBottom: 4,
  },
  flowerRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
  },
  flowerLabel: {
    ...typo.body,
    color: color.gray600,
  },
  flowerValue: {
    ...typo.subheading,
    color: color.gray900,
  },
};
