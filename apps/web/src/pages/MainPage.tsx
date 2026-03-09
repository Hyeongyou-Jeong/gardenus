import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { Header, TabBar } from "@/ui";
import { db } from "@/infra/firebase/client";
import { color, radius, shadow, typo } from "@gardenus/shared";

type EventItem = {
  id: string;
  title: string;
  subtitle: string;
  period: string;
  benefit: string;
  status: "진행중" | "곧 시작";
  tag: string;
};

type Review = {
  id: string;
  name: string;
  age: number;
  gender: "남" | "여";
  date: string;
  text: string;
  imageUrl: string;
};

const EVENTS: EventItem[] = [
  {
    id: "spring-welcome",
    title: "신규 가입 웰컴 이벤트",
    subtitle: "첫 매칭 시작을 위한 혜택",
    period: "2026.03.01 - 2026.03.31",
    benefit: "가입 후 7일 이내 첫 매칭 요청 시 플라워 10개 추가 지급",
    status: "진행중",
    tag: "웰컴",
  },
  {
    id: "school-verify",
    title: "학교 인증 리워드 이벤트",
    subtitle: "인증하고 바로 혜택 받기",
    period: "상시 진행",
    benefit: "학생증 인증 완료 시 포인트 보너스 지급 (계정당 1회)",
    status: "진행중",
    tag: "인증",
  },
  {
    id: "weekend-coupon",
    title: "주말 전용 쿠폰 이벤트",
    subtitle: "금-일 한정 특별 혜택",
    period: "매주 금 18:00 - 일 23:59",
    benefit: "주말 동안 스토어 쿠폰팩 50% 할인",
    status: "곧 시작",
    tag: "쿠폰",
  },
];

const DUMMY_REVIEWS: Review[] = [
  {
    id: "r1",
    name: "서윤",
    age: 23,
    gender: "여",
    date: "2026.03.01",
    text: "프로필 질문이 현실적이라 대화 시작이 훨씬 편했어요. 가볍게 시작했는데 의외로 진지한 분들을 많이 만났어요.",
    imageUrl: "",
  },
  {
    id: "r2",
    name: "민재",
    age: 25,
    gender: "남",
    date: "2026.02.25",
    text: "대학교 생활 패턴이 비슷한 사람을 만나니까 약속 잡기가 쉬웠습니다. UI도 깔끔해서 부담 없이 쓸 수 있었어요.",
    imageUrl: "",
  },
  {
    id: "r3",
    name: "지현",
    age: 22,
    gender: "여",
    date: "2026.02.18",
    text: "처음엔 반신반의했는데 후기처럼 진짜 매너 좋은 분이 많았어요. 메시지 분위기도 전체적으로 차분해서 좋았습니다.",
    imageUrl: "",
  },
  {
    id: "r4",
    name: "도윤",
    age: 24,
    gender: "남",
    date: "2026.02.14",
    text: "가입 쿠폰 덕분에 진입장벽이 낮아서 시작하기 좋았고, 관심사 태그가 잘 맞는 사람을 찾는 데 꽤 도움이 됐어요.",
    imageUrl: "",
  },
];

const MainPage: React.FC = () => {
  const navigate = useNavigate();

  const [reviews, setReviews] = useState<Review[]>(DUMMY_REVIEWS);
  const [centerIndex, setCenterIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const autoTimerRef = useRef<number | null>(null);
  const resumeAtRef = useRef(0);
  const userInteractingRef = useRef(false);

  const startXRef = useRef<number | null>(null);
  const deltaXRef = useRef(0);

  const reviewCount = reviews.length;
  const GAP = 10;
  const CARD_WIDTH = useMemo(() => {
    if (!viewportWidth) return 320;
    return Math.max(260, Math.min(348, Math.floor(viewportWidth * 0.81)));
  }, [viewportWidth]);
  const STEP = CARD_WIDTH + GAP;
  const baseTranslate = -(STEP * 2);

  useEffect(() => {
    let mounted = true;
    const loadReviews = async () => {
      try {
        const q = query(
          collection(db, "landingReviews"),
          orderBy("createdAt", "desc"),
          limit(10),
        );
        const snap = await getDocs(q);
        const next = snap.docs
          .map((docSnap, index) => toReview(docSnap.id, docSnap.data(), index))
          .filter((v): v is Review => v != null);

        if (mounted && next.length > 0) {
          setReviews(next);
          setCenterIndex(0);
        }
      } catch (error) {
        console.warn("[MainPage] landingReviews fetch failed, fallback to dummy", error);
      }
    };

    void loadReviews();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const updateWidth = () => {
      if (!viewportRef.current) return;
      setViewportWidth(viewportRef.current.clientWidth);
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current != null) window.clearInterval(autoTimerRef.current);
    };
  }, []);

  const visibleReviews = useMemo(() => {
    if (reviews.length === 0) return [];
    const count = reviews.length;

    const get = (offset: number) => {
      const idx = (centerIndex + offset + count) % count;
      return reviews[idx];
    };

    if (count === 1) return [get(0)];
    if (count === 2) return [get(-2), get(-1), get(0), get(1), get(2)];
    return [get(-2), get(-1), get(0), get(1), get(2)];
  }, [reviews, centerIndex]);

  const goToNext = () => {
    if (reviewCount <= 1 || isAnimating) return;
    setDragging(false);
    setIsAnimating(true);
    setOffsetX(-STEP);
  };

  const resetDragState = () => {
    startXRef.current = null;
    deltaXRef.current = 0;
    setDragging(false);
  };

  const handleTransitionEnd = () => {
    if (!isAnimating) return;
    setIsAnimating(false);
    setCenterIndex((prev) => (prev + 1) % Math.max(reviewCount, 1));
    setOffsetX(0);
  };

  useEffect(() => {
    if (reviewCount <= 1) return;

    if (autoTimerRef.current != null) window.clearInterval(autoTimerRef.current);

    autoTimerRef.current = window.setInterval(() => {
      if (userInteractingRef.current) return;
      if (Date.now() < resumeAtRef.current) return;
      goToNext();
    }, 3000);

    return () => {
      if (autoTimerRef.current != null) window.clearInterval(autoTimerRef.current);
    };
  }, [reviewCount, isAnimating, STEP]);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isAnimating || reviewCount <= 1) return;
    startXRef.current = e.clientX;
    deltaXRef.current = 0;
    userInteractingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (startXRef.current == null || isAnimating) return;
    const dx = e.clientX - startXRef.current;
    deltaXRef.current = dx;
    setOffsetX(dx);
  };

  const onPointerUp = () => {
    if (startXRef.current == null) return;

    const moved = deltaXRef.current;
    const threshold = 36;

    if (Math.abs(moved) >= threshold && reviewCount > 1) {
      setDragging(false);
      setIsAnimating(true);
      setOffsetX(-STEP);
    } else {
      setOffsetX(0);
      setDragging(false);
    }

    userInteractingRef.current = false;
    resumeAtRef.current = Date.now() + 3500;
    startXRef.current = null;
    deltaXRef.current = 0;
  };

  const onPointerCancel = () => {
    if (startXRef.current == null) return;
    setOffsetX(0);
    userInteractingRef.current = false;
    resumeAtRef.current = Date.now() + 3500;
    resetDragState();
  };

  const renderReviewCard = (r: Review, key: string) => (
    <article
      key={key}
      style={{
        ...s.reviewCard,
        width: CARD_WIDTH,
        minWidth: CARD_WIDTH,
        maxWidth: CARD_WIDTH,
      }}
    >
      <div style={s.reviewTopRow}>
        {r.imageUrl ? (
          <img src={r.imageUrl} alt={`${r.name} 프로필`} style={s.reviewAvatar} />
        ) : (
          <div style={s.reviewAvatarFallback} aria-hidden>
            {r.name.slice(0, 1)}
          </div>
        )}
        <div style={s.reviewMetaWrap}>
          <p style={s.reviewMetaMain}>
            {r.name} · {r.age} · {r.gender}
          </p>
          <p style={s.reviewMetaDate}>{r.date}</p>
        </div>
      </div>
      <p style={s.reviewText}>{r.text}</p>
    </article>
  );

  return (
    <div style={s.page}>
      <Header title="이벤트" />
      <div style={s.container}>
        <section style={s.heroCard}>
          <h2 style={s.heroTitle}>후기 작성 이벤트</h2>
          <p style={s.heroDesc}>후기 작성하고 포인트 받아가세요</p>
        </section>

        <section style={{ ...s.eventCard, padding: "20px 16px" }}>
          <div style={s.sectionHeaderRow}>
            <h2 style={s.sectionTitle}>솔직 이용 후기</h2>
            <button
              type="button"
              style={s.writeReviewBtn}
              onClick={() => navigate("/review")}
            >
              후기 작성하러 가기
            </button>
          </div>

          <div ref={viewportRef} style={s.reviewViewport}>
            <div
              style={{
                ...s.reviewTrack,
                gap: GAP,
                transform: `translateX(${baseTranslate + offsetX}px)`,
                transition: dragging
                  ? "none"
                  : isAnimating
                    ? "transform 320ms ease"
                    : "none",
                cursor: dragging ? "grabbing" : "grab",
              }}
              onTransitionEnd={handleTransitionEnd}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              onLostPointerCapture={onPointerCancel}
            >
              {visibleReviews.map((r, idx) => renderReviewCard(r, `${r.id}-${idx}`))}
            </div>
          </div>
        </section>

        <section style={s.heroCard}>
          <p style={s.heroBadge}>🎉 진행중인 이벤트</p>
          <h2 style={s.heroTitle}>가드너스 혜택 모아보기</h2>
          <p style={s.heroDesc}>
            지금 참여 가능한 이벤트를 확인하고
            <br />
            더 가볍게 매칭을 시작해 보세요.
          </p>
        </section>

        <section style={s.listWrap}>
          {EVENTS.map((event) => (
            <article key={event.id} style={s.eventCard}>
              <div style={s.topRow}>
                <span
                  style={{
                    ...s.statusChip,
                    background: event.status === "진행중" ? color.mint50 : color.gray100,
                    color: event.status === "진행중" ? color.mint700 : color.gray600,
                  }}
                >
                  {event.status}
                </span>
                <span style={s.tagChip}>{event.tag}</span>
              </div>

              <h3 style={s.eventTitle}>{event.title}</h3>
              <p style={s.eventSubtitle}>{event.subtitle}</p>

              <div style={s.infoBlock}>
                <p style={s.infoLabel}>기간</p>
                <p style={s.infoValue}>{event.period}</p>
              </div>

              <div style={s.divider} />

              <div style={s.infoBlock}>
                <p style={s.infoLabel}>혜택</p>
                <p style={s.infoValue}>{event.benefit}</p>
              </div>
            </article>
          ))}
        </section>
      </div>

      <TabBar />
    </div>
  );
};

export default MainPage;

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: color.gray50,
    paddingBottom: 84,
  },
  container: {
    maxWidth: 430,
    margin: "0 auto",
    padding: "16px 16px 0",
  },
  sectionHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 0,
  },
  writeReviewBtn: {
    ...typo.caption,
    color: color.mint700,
    background: "transparent",
    cursor: "pointer",
    textDecoration: "underline",
    textUnderlineOffset: 2,
    padding: 0,
    flexShrink: 0,
  },
  reviewViewport: {
    overflow: "hidden",
    width: "100%",
    touchAction: "pan-y",
  },
  reviewTrack: {
    display: "flex",
    willChange: "transform",
    userSelect: "none",
  },
  reviewCard: {
    scrollSnapAlign: "start",
    background: color.white,
    borderRadius: radius.xl,
    border: `1px solid ${color.gray200}`,
    boxShadow: shadow.card,
    padding: "12px 12px 14px",
    flexShrink: 0,
    overflow: "hidden",
  },
  reviewTopRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    objectFit: "cover",
    background: color.gray100,
    flexShrink: 0,
    pointerEvents: "none",
  },
  reviewAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    background: color.mint100,
    color: color.mint700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...typo.caption,
    fontWeight: 700,
    flexShrink: 0,
  },
  reviewMetaWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
  },
  reviewMetaMain: {
    margin: 0,
    fontSize: 14,
    lineHeight: "18px",
    fontWeight: 600,
    color: color.gray900,
  },
  reviewMetaDate: {
    margin: 0,
    fontSize: 12,
    lineHeight: "16px",
    color: color.gray500,
  },
  reviewText: {
    margin: 0,
    minWidth: 0,
    fontSize: 14,
    fontWeight: 400,
    color: color.gray700,
    lineHeight: "20px",
    whiteSpace: "normal",
    wordBreak: "break-word",
    overflowWrap: "anywhere",
  },
  heroCard: {
    borderRadius: radius.xl,
    background: `linear-gradient(135deg, ${color.mint50} 0%, #e8f5e9 100%)`,
    border: `1px solid ${color.mint100}`,
    padding: "18px 16px",
    marginBottom: 14,
  },
  heroBadge: {
    ...typo.caption,
    color: color.mint700,
    fontWeight: 700,
    marginBottom: 6,
  },
  heroTitle: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 6,
  },
  heroDesc: {
    ...typo.caption,
    color: color.gray600,
    lineHeight: "20px",
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  eventCard: {
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.xl,
    boxShadow: shadow.card,
    padding: "14px 14px 12px",
  },
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusChip: {
    ...typo.caption,
    borderRadius: radius.full,
    padding: "4px 10px",
    fontWeight: 700,
  },
  tagChip: {
    ...typo.caption,
    color: color.gray600,
    background: color.gray100,
    borderRadius: radius.full,
    padding: "4px 10px",
  },
  eventTitle: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 3,
  },
  eventSubtitle: {
    ...typo.caption,
    color: color.gray600,
    marginBottom: 10,
  },
  infoBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  infoLabel: {
    ...typo.caption,
    color: color.gray500,
  },
  infoValue: {
    ...typo.body,
    color: color.gray800,
    lineHeight: "20px",
    whiteSpace: "normal",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
  },
  divider: {
    height: 1,
    background: color.gray100,
    margin: "10px 0",
  },
};

function toReview(id: string, raw: Record<string, unknown>, index: number): Review | null {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (!name || !text) return null;

  const age = typeof raw.age === "number" ? raw.age : Number(raw.age ?? 20);
  const genderRaw = typeof raw.gender === "string" ? raw.gender.trim() : "남";
  const gender: "남" | "여" = genderRaw === "여" ? "여" : "남";
  const imageUrl = typeof raw.imageUrl === "string" ? raw.imageUrl.trim() : "";

  return {
    id: id || `review-${index}`,
    name,
    age: Number.isFinite(age) ? age : 20,
    gender,
    date: normalizeDate(raw.date),
    text,
    imageUrl,
  };
}

function normalizeDate(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (
    typeof value === "object" &&
    value != null &&
    "toDate" in value &&
    typeof (value as { toDate?: unknown }).toDate === "function"
  ) {
    const d = (value as { toDate: () => Date }).toDate();
    if (d instanceof Date && !Number.isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = `${d.getMonth() + 1}`.padStart(2, "0");
      const day = `${d.getDate()}`.padStart(2, "0");
      return `${y}.${m}.${day}`;
    }
  }
  return "최근 후기";
}