import React, { useCallback, useEffect, useRef, useState } from "react";
import { color, radius, typo } from "@gardenus/shared";

/* ================================================================
   타입
   ================================================================ */

export interface MbtiAxisValue {
  letter: string; // "E" | "I" 등
  percent: number; // 0 ~ 100
}

interface MbtiAxisScrollProps {
  leftLabel: string;
  leftSub?: string;
  rightLabel: string;
  rightSub?: string;
  value: MbtiAxisValue;
  onChange: (next: MbtiAxisValue) => void;
}

/* ================================================================
   MbtiAxisScroll
   ================================================================ */

/**
 * 가로 스크롤 기반 MBTI 축 선택 컴포넌트.
 *
 * 좌측 끝 = leftLabel 100%
 * 중앙      = 0%
 * 우측 끝 = rightLabel 100%
 */
export const MbtiAxisScroll: React.FC<MbtiAxisScrollProps> = ({
  leftLabel,
  leftSub,
  rightLabel,
  rightSub,
  value,
  onChange,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const isUserScrolling = useRef(false);
  const syncedOnce = useRef(false);

  /* ---- 스크롤 → 값 매핑 ---- */
  const calcValueFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollX = el.scrollWidth - el.clientWidth;
    if (maxScrollX <= 0) return;

    const t = el.scrollLeft / maxScrollX; // [0, 1]
    const signed = 2 * t - 1; // [-1, 1]

    const letter = signed < 0 ? leftLabel : rightLabel;
    const percent = Math.round(Math.abs(signed) * 100);

    onChange({ letter, percent });
  }, [leftLabel, rightLabel, onChange]);

  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(calcValueFromScroll);
  }, [calcValueFromScroll]);

  /* ---- 값 → 스크롤 위치 동기화 (마운트 + 외부 값 변경) ---- */
  const syncScrollToValue = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const maxScrollX = el.scrollWidth - el.clientWidth;
    if (maxScrollX <= 0) return;

    const sign = value.letter === rightLabel ? 1 : -1;
    const signed = sign * (value.percent / 100); // [-1, 1]
    const t = (signed + 1) / 2; // [0, 1]
    el.scrollLeft = t * maxScrollX;
  }, [value, rightLabel]);

  /* 마운트 시 초기 위치 세팅 (약간의 딜레이로 렌더 보장) */
  useEffect(() => {
    if (syncedOnce.current) return;

    const timer = setTimeout(() => {
      isUserScrolling.current = false;
      syncScrollToValue();
      syncedOnce.current = true;
    }, 50);

    return () => clearTimeout(timer);
  }, [syncScrollToValue]);

  /* 외부에서 value가 바뀌었을 때(프로필 로드 등) — 유저 스크롤 중에는 무시 */
  const [prevValue, setPrevValue] = useState(value);
  if (value.letter !== prevValue.letter || value.percent !== prevValue.percent) {
    setPrevValue(value);
    if (!isUserScrolling.current) {
      // 다음 프레임에 동기화
      requestAnimationFrame(syncScrollToValue);
    }
  }

  /* cleanup */
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ---- 렌더링 ---- */
  const isLeft = value.letter === leftLabel;

  return (
    <div style={styles.wrapper}>
      {/* 현재 값 표시 */}
      <div style={styles.valueDisplay}>
        <span
          style={{
            ...styles.valueLetter,
            color: color.mint600,
          }}
        >
          {value.letter}
        </span>
        <span style={styles.valuePercent}>{value.percent}%</span>
      </div>

      {/* 양쪽 라벨 */}
      <div style={styles.labelsRow}>
        <div style={styles.labelSide}>
          <span
            style={{
              ...styles.labelCircle,
              background: isLeft ? color.mint500 : color.gray200,
              color: isLeft ? color.white : color.gray500,
            }}
          >
            {leftLabel}
          </span>
          {leftSub && (
            <span
              style={{
                ...styles.labelSub,
                color: isLeft ? color.gray900 : color.gray400,
              }}
            >
              {leftSub}
            </span>
          )}
        </div>

        <div style={styles.labelSide}>
          <span
            style={{
              ...styles.labelCircle,
              background: !isLeft ? color.mint500 : color.gray200,
              color: !isLeft ? color.white : color.gray500,
            }}
          >
            {rightLabel}
          </span>
          {rightSub && (
            <span
              style={{
                ...styles.labelSub,
                color: !isLeft ? color.gray900 : color.gray400,
              }}
            >
              {rightSub}
            </span>
          )}
        </div>
      </div>

      {/* 스크롤 트랙 + 중앙 인디케이터 */}
      <div style={styles.trackOuter}>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="mbti-scroll-track"
          style={styles.scrollContainer}
        >
          {/* 내부 콘텐츠 — 뷰포트의 3배 폭으로 스크롤 범위 확보 */}
          <div style={styles.scrollInner}>
            {/* 좌측 라벨 */}
            <span style={styles.trackEndLabel}>{leftLabel} 100%</span>

            {/* 중앙 마커 */}
            <div style={styles.centerMarker}>
              <div style={styles.centerLine} />
              <span style={styles.centerText}>0%</span>
            </div>

            {/* 우측 라벨 */}
            <span style={styles.trackEndLabel}>{rightLabel} 100%</span>
          </div>
        </div>

        {/* 현재 위치 인디케이터 (고정 중앙 화살표) */}
        <div style={styles.indicatorWrap}>
          <div style={styles.indicator} />
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   스타일
   ================================================================ */

const TRACK_HEIGHT = 54;

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "relative",
    marginBottom: 8,
  },

  /* 값 표시 */
  valueDisplay: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 6,
    marginBottom: 10,
  },
  valueLetter: {
    fontSize: 28,
    fontWeight: 800,
  },
  valuePercent: {
    ...typo.subheading,
    color: color.gray600,
  },

  /* 양쪽 레이블 */
  labelsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    padding: "0 4px",
  },
  labelSide: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  labelCircle: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
  },
  labelSub: {
    fontSize: 11,
    fontWeight: 500,
  },

  /* 트랙 외곽 (인디케이터 기준) */
  trackOuter: {
    position: "relative",
  },

  /* 스크롤 트랙 */
  scrollContainer: {
    width: "100%",
    overflowX: "auto",
    overflowY: "hidden",
    borderRadius: radius.md,
    background: color.gray100,
    height: TRACK_HEIGHT,
    position: "relative",
    /* 스크롤바 숨김 (CSS) */
    scrollbarWidth: "none" as any, // Firefox
    msOverflowStyle: "none" as any, // IE
    WebkitOverflowScrolling: "touch",
  },
  scrollInner: {
    width: "300%", // 뷰포트의 3배 → 스크롤 범위 확보
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    position: "relative",
  },
  trackEndLabel: {
    ...typo.caption,
    color: color.gray400,
    fontWeight: 600,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },

  /* 중앙 마커 */
  centerMarker: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  centerLine: {
    width: 2,
    height: 24,
    background: color.gray300,
    borderRadius: 1,
  },
  centerText: {
    fontSize: 10,
    color: color.gray400,
    fontWeight: 600,
  },

  /* 고정 인디케이터 (트랙 중앙, trackOuter 기준) */
  indicatorWrap: {
    position: "absolute",
    left: "50%",
    top: 0,
    height: TRACK_HEIGHT,
    transform: "translateX(-50%)",
    pointerEvents: "none",
    display: "flex",
    alignItems: "stretch",
    zIndex: 5,
  },
  indicator: {
    width: 3,
    height: "100%",
    borderRadius: 2,
    background: color.mint500,
    boxShadow: "0 0 6px rgba(0,204,118,0.4)",
  },
};
