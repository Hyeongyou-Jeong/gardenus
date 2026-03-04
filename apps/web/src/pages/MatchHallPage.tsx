import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Modal, TabBar } from "@/ui";
import { color, radius, shadow, typo, calcAge } from "@gardenus/shared";
import { fetchUser, updateUserFields, type UserDoc } from "@/domains/user/user.repo";
import { fetchCandidateBatch } from "@/domains/match/candidate.repo";
import { getFlowerProfileUrl } from "@/infra/firebase/storage";
import { createMatchRequest, FLOWER_COST } from "@/domains/matchRequest/matchRequest.repo";
import { useMyFlower } from "@/domains/user/useMyFlower";
import { useUserNames } from "@/domains/user/useUserNames";
import { shuffle } from "@/utils/shuffle";
import {
  subscribeMyNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/domains/notification/notifications.repo";

/* ---- Storage URL 캐시 (모듈 스코프, 동일 id 재요청 방지) ---- */
const imgCache = new Map<string, string>();

/* ================================================================
   MatchHallPage — Firestore users 컬렉션 기반 프로필 카드
   ================================================================ */

export const MatchHallPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed, userId } = useAuth();

  const [profiles, setProfiles] = useState<UserDoc[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loginModal, setLoginModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [matchModal, setMatchModal] = useState(false);
  const [flowerModal, setFlowerModal] = useState(false);
  const [visibilityModal, setVisibilityModal] = useState(false);
  const [visibilityUpdating, setVisibilityUpdating] = useState(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const {flower: myFlower } = useMyFlower();
  const [requesting, setRequesting] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  /* ---- 알림 구독 ---- */
  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeMyNotifications({
      myUid: userId,
      onChange: setNotifs,
      onError: (e) => console.error("[notifications]", e),
    });
    return unsub;
  }, [userId]);

  const unreadCount = notifs.filter((n) => !n.readAt).length;

  /* ---- 알림 body 안의 전화번호 → 이름 치환 ---- */
  // body/title에서 "+82XXXXXXXXX님" 패턴의 UID 수집
  const notifUids = useMemo(() => {
    const phoneRe = /(\+82\d{7,11})님/g;
    const uids = new Set<string>();
    notifs.forEach((n) => {
      let m: RegExpExecArray | null;
      for (const text of [n.body, n.title]) {
        phoneRe.lastIndex = 0;
        while ((m = phoneRe.exec(text)) !== null) uids.add(m[1]);
      }
      // targetUid도 미리 로드
      if (n.targetUid) uids.add(n.targetUid);
    });
    return Array.from(uids);
  }, [notifs]);

  const notifNameMap = useUserNames(notifUids);

  /** body/title의 전화번호를 이름으로 치환 */
  const resolveText = (text: string): string =>
    text.replace(/(\+82\d{7,11})님/g, (_, uid) =>
      `${notifNameMap[uid] ?? uid}님`,
    );

  /* ---- 중복 방지 & prefetch 상태 ---- */
  const seenIds = useRef(new Set<string>());
  const fetchingRef = useRef(false);
  const myGenderRef = useRef<boolean | null>(null);

  const BATCH_SIZE = 50;
  const PREFETCH_THRESHOLD = 10;

  /** 배치를 가져와서 seenIds 필터 + shuffle 후 반환 (seenIds 등록은 호출 측에서) */
  const loadBatch = useCallback(async (myGender?: boolean): Promise<UserDoc[]> => {
    const raw = await fetchCandidateBatch({ myGender, limitN: BATCH_SIZE });
    const fresh = raw.filter((u) => {
      if (userId && u.id === userId) return false;
      if (seenIds.current.has(u.id)) return false;
      return true;
    });
    return shuffle(fresh);
  }, [userId]);

  const markSeen = (users: UserDoc[]) => {
    users.forEach((u) => seenIds.current.add(u.id));
  };

  /* ---- 최초 후보 로드 (로그인: 반대 성별 / 비로그인: 전체) ---- */
  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        let gender: boolean | undefined;

        if (userId) {
          const me = await fetchUser(userId);
          if (!alive) return;
          if (me?.isProfileVisible === false) {
            setVisibilityModal(true);
          }
          if (me?.gender != null) {
            gender = me.gender;
            myGenderRef.current = gender;
          }
        }

        const candidates = await loadBatch(gender);
        if (!alive) return;
        markSeen(candidates);
        setProfiles(candidates);

        setCurrentIdx(0);
        setError(null);
      } catch (err) {
        if (!alive) return;
        console.error("[MatchHall] load error", err);
        setError("프로필을 불러오지 못했습니다.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [userId, loadBatch]);

  /* ---- 추가 배치 프리페치 ---- */
  const prefetch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const gender = myGenderRef.current ?? undefined;
      const fresh = await loadBatch(gender);
      if (fresh.length > 0) {
        markSeen(fresh);
        setProfiles((prev) => [...prev, ...fresh]);
      }
    } catch (err) {
      console.error("[MatchHall] prefetch error", err);
    } finally {
      fetchingRef.current = false;
    }
  }, [loadBatch]);

  /* ---- 현재 프로필 ---- */
  const current: UserDoc | undefined =
    profiles.length > 0 && currentIdx < profiles.length
      ? profiles[currentIdx]
      : undefined;

  /* ---- 액션 ---- */
  const handleNext = () => {
    if (profiles.length === 0) return;
    const nextIdx = currentIdx + 1;

    if (nextIdx >= profiles.length) {
      // 끝까지 봤으면 처음으로
      setCurrentIdx(0);
      return;
    }

    setCurrentIdx(nextIdx);

    // 남은 카드가 threshold 이하이면 미리 가져오기
    const remaining = profiles.length - nextIdx;
    if (remaining <= PREFETCH_THRESHOLD) {
      prefetch();
    }
  };

  const handleHeart = () => {
    if (!isAuthed) {
      setLoginModal(true);
    } else if (myGenderRef.current == null) {
      setProfileModal(true);
    } else {
      setMatchModal(true);
    }
  };

  const handleOpenProfile = () => {
    if (!current?.id) return;
    navigate(`/profiles/${encodeURIComponent(current.id)}`);
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
    getFlowerProfileUrl(id).then((url: string | null) => {
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
  const age = current?.born ? calcAge(Number(current.born)) : null;
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
      {/* ---- 종 아이콘 버튼 ---- */}
      <div style={styles.bellWrap}>
        <button
          aria-label="알림"
          style={styles.bellBtn}
          onClick={() => {
            setNotifOpen((v) => {
              if (!v && userId && notifs.some((n) => !n.readAt)) {
                markAllNotificationsRead(userId, notifs).catch(() => {});
              }
              return !v;
            });
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              stroke={color.gray700}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {unreadCount > 0 && (
            <span style={styles.bellBadge}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* ---- 알림 패널 ---- */}
      {notifOpen && (
        <>
          <div style={styles.notifOverlay} onClick={() => setNotifOpen(false)} />
          <div style={styles.notifPanel}>
            <div style={styles.notifHeader}>
              <span style={styles.notifTitle}>알림</span>
              <button
                style={styles.notifClose}
                onClick={() => setNotifOpen(false)}
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke={color.gray500}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            {notifs.length === 0 ? (
              <p style={styles.notifEmpty}>새 알림이 없어요</p>
            ) : (
              <div style={styles.notifList}>
                {notifs.map((n) => {
                  const isClickable =
                    n.type === "LIKE_RECEIVED" || n.type === "MATCH_SUCCESS";

                  const handleNotifClick = () => {
                    if (!isClickable) return;
                    setNotifOpen(false);
                    if (n.type === "LIKE_RECEIVED") {
                      navigate("/like");
                    } else if (n.type === "MATCH_SUCCESS") {
                      // targetUid 있으면 해당 채팅방, 없으면 채팅 목록으로
                      navigate(
                        n.targetUid
                          ? `/chat/${encodeURIComponent(n.targetUid)}`
                          : "/chat",
                      );
                    }
                  };

                  return (
                    <div
                      key={n.id}
                      style={{
                        ...styles.notifItem,
                        ...(isClickable ? styles.notifItemClickable : {}),
                      }}
                      onClick={handleNotifClick}
                      role={isClickable ? "button" : undefined}
                    >
                      <span
                        style={{
                          ...styles.notifDot,
                          background:
                            n.type === "MATCH_SUCCESS"
                              ? color.mint500
                              : n.type === "LIKE_RECEIVED"
                              ? color.mint400
                              : n.type === "REFUND_DONE"
                              ? color.mint300
                              : color.gray400,
                        }}
                      />
                      <div style={styles.notifBody}>
                        <span style={styles.notifItemTitle}>{resolveText(n.title)}</span>
                        <span style={styles.notifItemBody}>{resolveText(n.body)}</span>
                        {n.createdAt && (
                          <span style={styles.notifItemTime}>
                            {n.createdAt.toLocaleDateString("ko-KR", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

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
        <div
          style={{ ...styles.card, ...styles.cardClickable }}
          onClick={handleOpenProfile}
          role="button"
        >
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

            {current.school && (
              <div style={styles.schoolRow}>
                <p style={styles.school}>{current.school}</p>
                {current.schoolVerified === true && (
                  <span style={styles.schoolVerifiedBadge}>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M20 7L10 17l-5-5"
                        stroke={color.white}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    학교인증
                  </span>
                )}
              </div>
            )}

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

      {/* ---- 프로필 작성 안내 모달 ---- */}
      <Modal
        open={profileModal}
        title="프로필 작성"
        description={"매칭을 원하시면\n프로필을 작성해주세요."}
        cancelText="취소"
        confirmText="작성하기"
        onCancel={() => setProfileModal(false)}
        onConfirm={() => {
          setProfileModal(false);
          navigate("/me/edit");
        }}
      />

      {/* ---- 매칭 요청 모달 ---- */}
      <Modal
        open={matchModal}
        title="매칭 요청"
        description={`${current?.name || "상대"}님에게 매칭을 요청하시겠습니까?`}
        cancelText="취소"
        confirmText={requesting ? "요청 중…" : "요청하기"}
        onCancel={() => setMatchModal(false)}
        onConfirm={async () => {
          if (requesting || !userId || !current?.id) return;
          if (myFlower < FLOWER_COST) {
            setMatchModal(false);
            setFlowerModal(true);
            return;
          }
          setRequesting(true);
          try {
            const result = await createMatchRequest(userId, current.id);
            setMatchModal(false);
            if (result.success) {
              alert("요청을 보냈습니다.");
            } else {
              alert(result.message);
            }
          } catch (err) {
            setMatchModal(false);
            alert("요청에 실패했습니다. 다시 시도해주세요.");
          } finally {
            setRequesting(false);
          }
        }}
      >
        <p style={styles.refundNotice}>
          요청이 거절되면 100% 환급됩니다.
        </p>
        <div style={styles.flowerInfo}>
          <div style={styles.flowerRow}>
            <span style={styles.flowerLabel}>보유 플라워:</span>
            <span style={styles.flowerValue}>🌻 {myFlower.toLocaleString()}</span>
          </div>
          <div style={styles.flowerRow}>
            <span style={styles.flowerLabel}>소모 플라워:</span>
            <span style={styles.flowerValue}>🌻 {FLOWER_COST}</span>
          </div>
        </div>
      </Modal>

      {/* ---- 플라워 부족 모달 ---- */}
      <Modal
        open={flowerModal}
        title="플라워 부족"
        description={"플라워가 부족합니다.\n충전하시겠습니까?"}
        cancelText="취소"
        confirmText="충전하기"
        onCancel={() => setFlowerModal(false)}
        onConfirm={() => {
          setFlowerModal(false);
          navigate("/store/flowers");
        }}
      />

      {/* ---- 매칭 기능 활성화 모달 ---- */}
      <Modal
        open={visibilityModal}
        title="매칭 기능 활성화"
        description={"현재 매칭 기능이 비활성화되어 있어요.\n지금 활성화하시겠어요?"}
        cancelText="나중에"
        confirmText={visibilityUpdating ? "활성화 중…" : "활성화하기"}
        onCancel={() => {
          if (!visibilityUpdating) setVisibilityModal(false);
        }}
        onConfirm={async () => {
          if (!userId || visibilityUpdating) return;
          setVisibilityUpdating(true);
          try {
            await updateUserFields(userId, { isProfileVisible: true });
            setVisibilityModal(false);
          } catch (err) {
            console.error("[MatchHall] 활성화 실패", err);
            alert("활성화에 실패했습니다. 다시 시도해주세요.");
          } finally {
            setVisibilityUpdating(false);
          }
        }}
      />
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
  cardClickable: {
    cursor: "pointer",
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
  schoolRow: {
    marginTop: 2,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap" as const,
  },
  schoolVerifiedBadge: {
    ...typo.caption,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    background: color.mint500,
    color: color.white,
    borderRadius: radius.full,
    padding: "2px 8px",
    fontWeight: 700,
    lineHeight: 1.2,
    boxShadow: shadow.button,
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

  /* ---- 모달 내 매칭 요청 ---- */
  refundNotice: {
    ...typo.body,
    color: color.mint600,
    fontWeight: 600,
    marginBottom: 16,
  },
  flowerInfo: {
    textAlign: "left" as const,
    marginBottom: 4,
  },
  flowerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "3px 0",
  },
  flowerLabel: {
    ...typo.body,
    color: color.gray600,
  },
  flowerValue: {
    ...typo.body,
    color: color.gray900,
    fontWeight: 600,
  },

  /* ── 종 아이콘 ── */
  bellWrap: {
    position: "fixed",
    top: 14,
    right: "max(16px, calc((100vw - 430px) / 2 + 16px))",
    zIndex: 850,
  },
  bellBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: "50%",
    background: color.white,
    border: `1px solid ${color.gray200}`,
    boxShadow: shadow.card,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    background: color.danger,
    color: color.white,
    fontSize: 10,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 3px",
  },

  /* ── 알림 패널 ── */
  notifOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 860,
  },
  notifPanel: {
    position: "fixed",
    top: 62,
    right: "max(12px, calc((100vw - 430px) / 2 + 12px))",
    width: 300,
    maxHeight: 400,
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    boxShadow: shadow.modal,
    zIndex: 870,
    display: "flex",
    flexDirection: "column" as const,
    overflow: "hidden",
  },
  notifHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: `1px solid ${color.gray100}`,
    flexShrink: 0,
  },
  notifTitle: {
    ...typo.subheading,
    color: color.gray900,
  },
  notifClose: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 2,
  },
  notifEmpty: {
    ...typo.body,
    color: color.gray400,
    textAlign: "center" as const,
    padding: "28px 0",
  },
  notifList: {
    overflowY: "auto" as const,
    flex: 1,
  },
  notifItem: {
    display: "flex",
    gap: 10,
    padding: "12px 14px",
    borderBottom: `1px solid ${color.gray100}`,
    alignItems: "flex-start",
  },
  notifItemClickable: {
    cursor: "pointer",
    background: "transparent",
    transition: "background 0.15s",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 6,
  },
  notifBody: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    flex: 1,
    minWidth: 0,
  },
  notifItemTitle: {
    ...typo.subheading,
    color: color.gray900,
  },
  notifItemBody: {
    ...typo.body,
    color: color.gray600,
  },
  notifItemTime: {
    ...typo.caption,
    color: color.gray400,
    marginTop: 2,
  },
};
