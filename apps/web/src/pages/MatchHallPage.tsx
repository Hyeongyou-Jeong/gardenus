import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Modal, TabBar } from "@/ui";
import { color, radius, shadow, typo, calcAge } from "@gardenus/shared";
import { fetchUser, updateUserFields, type UserDoc } from "@/domains/user/user.repo";
import { fetchCandidateBatch } from "@/domains/match/candidate.repo";
import { getFlowerProfileUrl, storage } from "@/infra/firebase/storage";
import { getDownloadURL, ref } from "firebase/storage";
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

  const [frontImgUrl, setFrontImgUrl] = useState<string | null>(null);
  const [frontImgFailed, setFrontImgFailed] = useState(false);
  const [backImgUrl, setBackImgUrl] = useState<string | null>(null);
  const [backImgFailed, setBackImgFailed] = useState(false);

  const { flower: myFlower } = useMyFlower();
  const [requesting, setRequesting] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState<AppNotification[]>([]);

  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDraggingCard, setIsDraggingCard] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [cardPhase, setCardPhase] = useState<"idle" | "dragging" | "animating-out">(
    "idle",
  );
  const [exitingProfile, setExitingProfile] = useState<UserDoc | null>(null);
  const [exitingImgUrl, setExitingImgUrl] = useState<string | null>(null);
  const [exitingImgFailed, setExitingImgFailed] = useState(false);
  const [exitingTranslateX, setExitingTranslateX] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const seenIds = useRef(new Set<string>());
  const fetchingRef = useRef(false);
  const myGenderRef = useRef<boolean | null>(null);

  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const swipeDeltaXRef = useRef(0);
  const isSwipingRef = useRef(false);

  const BATCH_SIZE = 50;
  const PREFETCH_THRESHOLD = 10;

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

  const notifUids = useMemo(() => {
    const phoneRe = /(\+82\d{7,11})님/g;
    const uids = new Set<string>();

    notifs.forEach((n) => {
      let m: RegExpExecArray | null;
      for (const text of [n.body, n.title]) {
        phoneRe.lastIndex = 0;
        while ((m = phoneRe.exec(text)) !== null) uids.add(m[1]);
      }
      if (n.targetUid) uids.add(n.targetUid);
    });

    return Array.from(uids);
  }, [notifs]);

  const notifNameMap = useUserNames(notifUids);

  const resolveText = (text: string): string =>
    text.replace(/(\+82\d{7,11})님/g, (_, uid) => `${notifNameMap[uid] ?? uid}님`);

  const loadBatch = useCallback(
    async (myGender?: boolean): Promise<UserDoc[]> => {
      const raw = await fetchCandidateBatch({ myGender, limitN: BATCH_SIZE });
      const fresh = raw.filter((u) => {
        if (userId && u.id === userId) return false;
        if (seenIds.current.has(u.id)) return false;
        return true;
      });
      return shuffle(fresh);
    },
    [userId],
  );

  const markSeen = (users: UserDoc[]) => {
    users.forEach((u) => seenIds.current.add(u.id));
  };

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

    return () => {
      alive = false;
    };
  }, [userId, loadBatch]);

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

  const current: UserDoc | undefined =
    profiles.length > 0 && currentIdx < profiles.length ? profiles[currentIdx] : undefined;
  const backProfile: UserDoc | undefined =
    profiles.length > 1 ? profiles[(currentIdx + 1) % profiles.length] : undefined;

  const maybePrefetchAfterNext = useCallback(
    (baseIdx: number) => {
      const nextIdx = baseIdx + 1;
      const remaining = profiles.length - nextIdx;
      if (remaining <= PREFETCH_THRESHOLD) {
        prefetch();
      }
    },
    [profiles.length, prefetch],
  );

  const animateToDirection = useCallback(
    (direction: "left" | "right") => {
      if (profiles.length === 0 || isAnimatingOut || !current) return;
  
      const outDistance = Math.max(window.innerWidth, 420);
      const startOffsetX = dragOffsetX;
  
      setExitingProfile(current);
      setExitingImgUrl(frontImgUrl);
      setExitingImgFailed(frontImgFailed);
      setExitingTranslateX(startOffsetX);
      setExitDirection(direction);
      setIsAnimatingOut(true);
  
      // 방향과 상관없이 항상 다음 카드로 이동
      setCurrentIdx((prev) => {
        const next = prev + 1;
        maybePrefetchAfterNext(prev);
        return next >= profiles.length ? 0 : next;
      });
  
      setDragOffsetX(0);
      setIsDraggingCard(false);
      setCardPhase("idle");
  
      window.requestAnimationFrame(() => {
        setExitingTranslateX(direction === "left" ? -outDistance : outDistance);
      });
  
      window.setTimeout(() => {
        setExitingProfile(null);
        setExitingImgUrl(null);
        setExitingImgFailed(false);
        setExitingTranslateX(0);
        setExitDirection(null);
        setIsAnimatingOut(false);
        isSwipingRef.current = false;
      }, 180);
    },
    [
      profiles.length,
      isAnimatingOut,
      current,
      dragOffsetX,
      frontImgUrl,
      frontImgFailed,
      maybePrefetchAfterNext,
    ],
  );

  const handleSkip = useCallback(() => {
    animateToDirection("left");
  }, [animateToDirection]);

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

  const handleCardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen" && e.pointerType !== "mouse") {
      return;
    }
    if (isAnimatingOut) return;

    swipeStartXRef.current = e.clientX;
    swipeStartYRef.current = e.clientY;
    swipeDeltaXRef.current = 0;
    isSwipingRef.current = false;

    setIsDraggingCard(true);
    setCardPhase("dragging");
    setDragOffsetX(0);

    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeStartXRef.current == null || swipeStartYRef.current == null) return;

    const deltaX = e.clientX - swipeStartXRef.current;
    const deltaY = e.clientY - swipeStartYRef.current;
    swipeDeltaXRef.current = deltaX;

    if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
      isSwipingRef.current = true;
      setDragOffsetX(deltaX * 0.95);
    } else if (!isSwipingRef.current) {
      setDragOffsetX(0);
    }
  };

  const handleCardPointerUp = () => {
    const delta = swipeDeltaXRef.current;
    const threshold = 56;

    swipeStartXRef.current = null;
    swipeStartYRef.current = null;
    swipeDeltaXRef.current = 0;
    setIsDraggingCard(false);

    if (Math.abs(delta) >= threshold) {
      isSwipingRef.current = true;
      animateToDirection(delta < 0 ? "left" : "right");
      return;
    }

    setDragOffsetX(0);
    setCardPhase("idle");

    window.setTimeout(() => {
      isSwipingRef.current = false;
    }, 120);
  };

  const handleCardClick = () => {
    if (isSwipingRef.current || isDraggingCard || isAnimatingOut) return;
    handleOpenProfile();
  };

  const resolveProfileImage = useCallback(async (profile?: UserDoc): Promise<string | null> => {
    if (!profile) return null;
    const imagePath = profile.profileImagePath?.trim();
    const directUrlRaw = (profile.photoURL ?? profile.aiPhotoURL) as string | undefined;
    const directUrl = typeof directUrlRaw === "string" ? directUrlRaw.trim() : "";
    const id = profile.profileImageId;

    if (imagePath) {
      const cacheKey = `path:${imagePath}`;
      if (imgCache.has(cacheKey)) return imgCache.get(cacheKey)!;
      try {
        const url = await getDownloadURL(ref(storage, imagePath));
        imgCache.set(cacheKey, url);
        return url;
      } catch {
        // fallthrough
      }
    }

    if (directUrl) {
      const cacheKey = `url:${directUrl}`;
      if (imgCache.has(cacheKey)) return imgCache.get(cacheKey)!;
      imgCache.set(cacheKey, directUrl);
      return directUrl;
    }

    if (!id) return null;
    const cacheKey = `flower:${id}`;
    if (imgCache.has(cacheKey)) return imgCache.get(cacheKey)!;
    const url = await getFlowerProfileUrl(id);
    if (url) imgCache.set(cacheKey, url);
    return url;
  }, []);

  useEffect(() => {
    let alive = true;
    setFrontImgFailed(false);
    setBackImgFailed(false);
    setFrontImgUrl(null);
    setBackImgUrl(null);

    const resolve = async () => {
      const [frontUrl, backUrl] = await Promise.all([
        resolveProfileImage(current),
        resolveProfileImage(backProfile),
      ]);
      if (!alive) return;
      setFrontImgUrl(frontUrl);
      setBackImgUrl(backUrl);
    };

    void resolve();

    return () => {
      alive = false;
    };
  }, [current, backProfile, resolveProfileImage]);

  const getCardViewData = (profile?: UserDoc) => {
    const age = profile?.born ? calcAge(Number(profile.born)) : null;
    const chips = profile
      ? (Array.isArray(profile.interests) ? profile.interests : [])
          .filter((v): v is string => typeof v === "string" && v.trim() !== "")
          .slice(0, 4)
      : [];
    const metaChips = [profile?.residence?.trim(), profile?.mbti?.trim()].filter(
      (v): v is string => !!v,
    );
    const introText = typeof profile?.aboutme === "string" ? profile.aboutme.trim() : "";
    const schoolText = typeof profile?.school === "string" ? profile.school.trim() : "";
    return { age, chips, metaChips, introText, schoolText };
  };

  const renderProfileCardContent = (
    profile: UserDoc,
    imgUrl: string | null,
    imgFailed: boolean,
    onImageError: () => void,
  ) => {
    const { age, chips, metaChips, introText, schoolText } = getCardViewData(profile);
    const showImg = !!imgUrl && !imgFailed;
    return (
      <>
        <div style={styles.imageWrap}>
          {showImg ? (
            <img
              src={imgUrl!}
              alt={profile.name || "profile"}
              style={styles.profileImage}
              onError={onImageError}
            />
          ) : (
            <div style={styles.imagePlaceholder}>
              <span style={styles.placeholderText}>{profile.name || "Profile"}</span>
            </div>
          )}

          <div style={styles.imageOverlayTop}>
            {profile.schoolVerified === true ? (
              <span style={styles.overlayVerifiedBadge}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
            ) : (
              <span />
            )}
          </div>

          <div style={styles.imageOverlayBottom}>
            <div style={styles.nameRow}>
              <span style={styles.nameOnImage}>{profile.name || "이름 없음"}</span>
              {age != null && <span style={styles.ageOnImage}>{age}세</span>}
            </div>

            {schoolText && (
              <div style={styles.schoolInlineRow}>
                <span style={styles.schoolOnImage}>{schoolText}</span>
              </div>
            )}

            {metaChips.length > 0 && (
              <div style={styles.metaInlineRow}>
                {metaChips.map((item) => (
                  <span key={item} style={styles.metaOnImage}>
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={styles.cardBody}>
          {chips.length > 0 && (
            <div style={styles.tags}>
              {chips.map((tag) => (
                <span key={tag} style={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {introText ? (
            <div style={styles.introCard}>
              <p style={styles.aboutme}>{introText}</p>
            </div>
          ) : (
            <div style={styles.emptyIntroCard}>
              <p style={styles.emptyIntroText}>프로필을 눌러 자세한 소개를 확인해보세요</p>
            </div>
          )}

          <div style={styles.profileHintRow}>
            <span style={styles.profileHintText}>프로필 자세히 보기</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5l7 7-7 7"
                stroke={color.gray400}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </>
    );
  };

  const absOffset = Math.abs(dragOffsetX);
  const cardScale = isDraggingCard ? 0.992 : cardPhase === "animating-out" ? 0.985 : 1;

  const cardTransition =
    cardPhase === "dragging"
      ? "transform 0s, box-shadow 0.12s ease, opacity 0.12s ease"
      : cardPhase === "animating-out"
        ? "transform 180ms ease-out, box-shadow 180ms ease-out, opacity 180ms ease-out"
        : "transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease";

  const cardOpacity =
    cardPhase === "animating-out"
      ? 0.94
      : isDraggingCard
        ? Math.max(0.95, 1 - absOffset / 1200)
        : 1;

  return (
    <div style={styles.page}>
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
            <span style={styles.bellBadge}>{unreadCount > 9 ? "9+" : unreadCount}</span>
          )}
        </button>
      </div>

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
                  const isClickable = n.type === "LIKE_RECEIVED" || n.type === "MATCH_SUCCESS";

                  const handleNotifClick = () => {
                    if (!isClickable) return;
                    setNotifOpen(false);
                    if (n.type === "LIKE_RECEIVED") {
                      navigate("/like");
                    } else if (n.type === "MATCH_SUCCESS") {
                      navigate(n.targetUid ? `/chat/${encodeURIComponent(n.targetUid)}` : "/chat");
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

      {loading ? (
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
        <div style={styles.messageBox}>
          <p style={{ color: color.danger }}>{error}</p>
        </div>
      ) : !current ? (
        <div style={styles.messageBox}>
          <p>데이터 없음</p>
        </div>
      ) : (
        <div style={styles.cardStack}>
      {backProfile && (
        <div
          key={`back-${backProfile.id}`}
          style={{
            ...styles.card,
            ...styles.backCardLayer,
            transform: isAnimatingOut
              ? "translateY(0) scale(1)"
              : "translateY(12px) scale(0.975)",
            opacity: isAnimatingOut ? 1 : 0.94,
            transition: "transform 180ms ease-out, opacity 180ms ease-out",
          }}
          aria-hidden="true"
        >
          {renderProfileCardContent(
            backProfile,
            backImgUrl,
            backImgFailed,
            () => setBackImgFailed(true),
          )}
        </div>
      )}

      <div
        key={`front-${current.id}`}
        style={{
          ...styles.card,
          ...styles.frontCardLayer,
          ...styles.cardClickable,
          transform: `translateX(${isAnimatingOut ? 0 : dragOffsetX}px) scale(${
            isAnimatingOut ? 1 : cardScale
          })`,
          transition: isAnimatingOut
            ? "transform 0ms, box-shadow 180ms ease, opacity 180ms ease"
            : cardTransition,
          boxShadow: isDraggingCard ? shadow.modal : shadow.card,
          opacity: isAnimatingOut ? 1 : cardOpacity,
        }}
        onClick={handleCardClick}
        onPointerDown={handleCardPointerDown}
        onPointerMove={handleCardPointerMove}
        onPointerUp={handleCardPointerUp}
        onPointerCancel={handleCardPointerUp}
        role="button"
      >
        {renderProfileCardContent(current, frontImgUrl, frontImgFailed, () =>
          setFrontImgFailed(true),
        )}
      </div>

      {exitingProfile && (
        <div
          key={`exiting-${exitingProfile.id}`}
          style={{
            ...styles.card,
            ...styles.exitingCardLayer,
            transform: `translateX(${exitingTranslateX}px) scale(1)`,
            opacity: 0.96,
            transition: "transform 180ms ease-out, opacity 180ms ease-out",
            boxShadow: shadow.modal,
          }}
          aria-hidden="true"
        >
          {renderProfileCardContent(
            exitingProfile,
            exitingImgUrl,
            exitingImgFailed,
            () => setExitingImgFailed(true),
          )}
        </div>
      )}
    </div>
      )}

      {!loading && current && (
        <div style={styles.actions}>
          <button style={styles.actionBtn} onClick={handleSkip} aria-label="넘기기">
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
            aria-label="매칭 요청"
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill={color.white}>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      )}

      <TabBar />

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
          } catch {
            setMatchModal(false);
            alert("요청에 실패했습니다. 다시 시도해주세요.");
          } finally {
            setRequesting(false);
          }
        }}
      >
        <p style={styles.refundNotice}>요청이 거절되면 100% 환급됩니다.</p>
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

const skeletonKeyframes = `
@keyframes skeleton-pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}
`;

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
    background: color.gray50,
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
  cardStack: {
    position: "relative",
    width: "calc(100% - 32px)",
    minHeight: 600,
    maxHeight: 600,
  },

  card: {
    width: "calc(100% - 32px)",
    minHeight: 600,
    maxHeight: 600,
    display: "flex",
    flexDirection: "column",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: shadow.card,
    background: color.white,
    border: `1px solid ${color.gray100}`,
  },
  backCardLayer: {
    position: "absolute",
    inset: 0,
    width: "100%",
    transform: "translateY(12px) scale(0.975)",
    opacity: 0.94,
    zIndex: 1,
    pointerEvents: "none",
  },
  frontCardLayer: {
    position: "absolute",
    inset: 0,
    width: "100%",
    zIndex: 2,
  },
  exitingCardLayer: {
    position: "absolute",
    inset: 0,
    width: "100%",
    zIndex: 3,
    pointerEvents: "none",
  },
  cardClickable: {
    cursor: "pointer",
    touchAction: "pan-y",
  },
  imageWrap: {
    position: "relative",
    width: "100%",
    height: 416,
    flexShrink: 0,
    overflow: "hidden",
    background: color.gray100,
  },
  profileImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    background: color.gray100,
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
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
  imageOverlayTop: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  imageOverlayBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: "44px 18px 18px",
    background:
      "linear-gradient(to top, rgba(0,0,0,0.60) 0%, rgba(0,0,0,0.28) 45%, rgba(0,0,0,0.00) 100%)",
  },
  overlayVerifiedBadge: {
    ...typo.caption,
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "6px 10px",
    borderRadius: radius.full,
    background: color.mint500,
    color: color.white,
    fontWeight: 700,
    boxShadow: shadow.button,
    backdropFilter: "blur(4px)",
  },
  cardBody: {
    height: 226,
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    padding: "16px 18px 18px",
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  nameOnImage: {
    fontSize: 28,
    lineHeight: "34px",
    fontWeight: 800,
    color: color.white,
    letterSpacing: "-0.02em",
  },
  ageOnImage: {
    fontSize: 18,
    lineHeight: "24px",
    fontWeight: 600,
    color: "rgba(255,255,255,0.92)",
  },
  schoolInlineRow: {
    marginTop: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  schoolOnImage: {
    ...typo.body,
    color: "rgba(255,255,255,0.92)",
    fontWeight: 500,
  },
  metaInlineRow: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  metaOnImage: {
    ...typo.caption,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "5px 9px",
    borderRadius: radius.full,
    background: "rgba(255,255,255,0.18)",
    color: color.white,
    border: "1px solid rgba(255,255,255,0.22)",
    fontWeight: 600,
    backdropFilter: "blur(6px)",
  },
  tags: {
    display: "flex",
    gap: 6,
    marginTop: 12,
    flexWrap: "wrap",
    minHeight: 30,
    maxHeight: 56,
    overflow: "hidden",
    alignContent: "flex-start",
  },
  tag: {
    ...typo.caption,
    background: color.mint50,
    color: color.mint700,
    padding: "5px 10px",
    borderRadius: radius.full,
    border: `1px solid ${color.mint100}`,
    fontWeight: 600,
  },
  aboutme: {
    margin: 0,
    ...typo.body,
    color: color.gray700,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: "21px",
    maxHeight: 42,
  },
  introCard: {
    marginTop: 14,
    padding: 0,
    minHeight: 42,
  },
  emptyIntroCard: {
    marginTop: 14,
    padding: 0,
    minHeight: 42,
  },
  emptyIntroText: {
    margin: 0,
    ...typo.body,
    color: color.gray400,
  },
  profileHintRow: {
    marginTop: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  profileHintText: {
    ...typo.caption,
    color: color.gray400,
    fontWeight: 600,
  },

  skeletonImage: {
    width: "100%",
    height: 396,
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

  actions: {
    display: "flex",
    gap: 18,
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

  refundNotice: {
    ...typo.body,
    color: color.mint600,
    fontWeight: 600,
    marginBottom: 16,
  },
  flowerInfo: {
    textAlign: "left",
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
    flexDirection: "column",
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
    textAlign: "center",
    padding: "28px 0",
  },
  notifList: {
    overflowY: "auto",
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
    flexDirection: "column",
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