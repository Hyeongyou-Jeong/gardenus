import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Header, Button } from "@/ui";
import {
  fetchMyProfile,
  upsertMyProfile,
} from "@/domains/profile/profile.repo";
import { color, radius, shadow, typo } from "@gardenus/shared";

/* ================================================================
   상수 / 옵션
   ================================================================ */

const PREF_OPTIONS: Record<string, string[]> = {
  contactPref: ["상관없음", "전화", "카카오톡"],
  cigar: ["비흡연", "가끔", "흡연"],
  drinking: ["거의 안먹음", "가끔", "자주", "매우 자주"],
  affectionLevel: ["높은", "중간", "낮은"],
  jealousyLevel: ["높은", "중간", "낮은"],
  meetingPref: ["상관없음", "데이트", "소개팅"],
};

const PREF_LABELS: Record<string, string> = {
  contactPref: "선호연락수단",
  cigar: "흡연여부",
  drinking: "음주정도",
  affectionLevel: "애교레벨",
  jealousyLevel: "질투레벨",
  meetingPref: "선호만남유형",
};

/** MBTI 문자열 → 4축 기본값 (E=25, I=75 등) */
function mbtiStringToAxes(mbti?: string) {
  const m = (mbti ?? "").toUpperCase();
  return {
    ei: m.includes("I") ? 75 : 25,
    sn: m.includes("N") ? 75 : 25,
    tf: m.includes("F") ? 75 : 25,
    jp: m.includes("P") ? 75 : 25,
  };
}

/** 4축 → MBTI 문자열 */
function axesToMbtiString(ei: number, sn: number, tf: number, jp: number) {
  return (
    (ei < 50 ? "E" : "I") +
    (sn < 50 ? "S" : "N") +
    (tf < 50 ? "T" : "F") +
    (jp < 50 ? "J" : "P")
  );
}

/* ================================================================
   SVG 아이콘들
   ================================================================ */

const IcCrown = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 2h14v2H5v-2z" />
  </svg>
);
const IcHeight = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color.gray500} strokeWidth="2" strokeLinecap="round">
    <path d="M12 2v20M8 6l4-4 4 4M8 18l4 4 4-4" />
  </svg>
);
const IcPin = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" />
  </svg>
);
const IcBriefcase = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z" />
  </svg>
);
const IcSchool = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z" />
  </svg>
);
const IcDoc = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
  </svg>
);
const IcPerson = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={color.mint600}>
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);
const IcSparkle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={color.mint600}>
    <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
  </svg>
);
const IcHeart = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={color.mint600}>
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);
const IcChevron = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M9 5l7 7-7 7" stroke={color.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* 선호도 카드 아이콘 */
const IcBell = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
  </svg>
);
const IcNoSmoke = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M2 6l6.99 7H2v3h9.99l7 7 1.26-1.25-17-17L2 6zm18.5 7H22v3h-1.5v-3zM18 13h1.5v3H18v-3zm.85-8.12c.62-.61 1-1.45 1-2.38h-1.5c0 1.02-.83 1.85-1.85 1.85v1.5c2.24 0 4 1.83 4 4.07V12H22V9.92c0-2.23-1.28-4.15-3.15-5.04zM14.5 8.7c.91-.47 1.5-1.41 1.5-2.5 0-1.65-1.35-3-3-3v1.5c.83 0 1.5.67 1.5 1.5 0 .84-.67 1.5-1.5 1.5v1.5c1.85 0 3.5 1.18 3.5 3V12H18v-.8c0-2.04-1.53-3.54-3.5-3.5z" />
  </svg>
);
const IcBeer = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M4 2h12v2H4v16h12v2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm14 4h2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-2V6zm0 8h2V8h-2v6zM6 6h8v12H6V6zm2 2v8h4V8H8z" />
  </svg>
);
const IcCute = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <circle cx="12" cy="12" r="10" fill="none" stroke={color.gray500} strokeWidth="1.5" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke={color.gray500} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="9" cy="9.5" r="1.2" />
    <circle cx="15" cy="9.5" r="1.2" />
  </svg>
);
const IcAngry = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <circle cx="12" cy="12" r="10" fill="none" stroke={color.gray500} strokeWidth="1.5" />
    <path d="M8 16s1.5-2 4-2 4 2 4 2" stroke={color.gray500} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    <circle cx="9" cy="10" r="1.2" />
    <circle cx="15" cy="10" r="1.2" />
    <path d="M7 8l3 1.5M17 8l-3 1.5" stroke={color.gray500} strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
const IcQuestion = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <text x="12" y="17" textAnchor="middle" fontSize="18" fontWeight="700">?</text>
  </svg>
);

const PREF_ICONS: Record<string, React.FC> = {
  contactPref: IcBell,
  cigar: IcNoSmoke,
  drinking: IcBeer,
  affectionLevel: IcCute,
  jealousyLevel: IcAngry,
  meetingPref: IcQuestion,
};

/* ================================================================
   MbtiSlider 컴포넌트
   ================================================================ */

const MbtiSlider: React.FC<{
  leftLabel: string;
  leftSub: string;
  rightLabel: string;
  rightSub: string;
  value: number; // 0 = fully left, 100 = fully right
  onChange: (v: number) => void;
}> = ({ leftLabel, leftSub, rightLabel, rightSub, value, onChange }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const calcValue = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const pct = Math.round(((clientX - rect.left) / rect.width) * 100);
      return Math.max(0, Math.min(100, pct));
    },
    []
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onChange(calcValue(e.clientX));
    },
    [onChange, calcValue]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      onChange(calcValue(e.clientX));
    },
    [onChange, calcValue]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const leftActive = value < 50;
  const pct = leftActive ? 100 - value : value;
  const displayPct = Math.round(pct * 2 > 100 ? 100 : pct * 2);

  return (
    <div style={mbtiStyles.row}>
      {/* 왼쪽 레이블 */}
      <div style={mbtiStyles.labelCol}>
        <div
          style={{
            ...mbtiStyles.circle,
            background: leftActive ? color.mint500 : color.gray200,
            color: leftActive ? color.white : color.gray500,
          }}
        >
          {leftLabel}
        </div>
        <span style={{ ...mbtiStyles.sub, color: leftActive ? color.gray900 : color.gray400 }}>
          {leftSub}
        </span>
      </div>

      {/* 슬라이더 트랙 */}
      <div style={mbtiStyles.trackWrap}>
        <div
          ref={trackRef}
          style={mbtiStyles.track}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <div
            style={{
              ...mbtiStyles.fill,
              left: leftActive ? `${value}%` : "50%",
              width: leftActive
                ? `${50 - value}%`
                : `${value - 50}%`,
            }}
          />
          <div
            style={{
              ...mbtiStyles.thumb,
              left: `${value}%`,
            }}
          />
        </div>
        <span style={mbtiStyles.pctText}>{displayPct}%</span>
      </div>

      {/* 오른쪽 레이블 */}
      <div style={mbtiStyles.labelCol}>
        <div
          style={{
            ...mbtiStyles.circle,
            background: !leftActive ? color.mint500 : color.gray200,
            color: !leftActive ? color.white : color.gray500,
          }}
        >
          {rightLabel}
        </div>
        <span style={{ ...mbtiStyles.sub, color: !leftActive ? color.gray900 : color.gray400 }}>
          {rightSub}
        </span>
      </div>
    </div>
  );
};

const mbtiStyles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 14,
  },
  labelCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 40,
    flexShrink: 0,
  },
  circle: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 14,
    fontWeight: 700,
  },
  sub: {
    fontSize: 10,
    marginTop: 2,
    whiteSpace: "nowrap" as const,
  },
  trackWrap: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingTop: 8,
  },
  track: {
    width: "100%",
    height: 10,
    borderRadius: 5,
    background: color.gray200,
    position: "relative",
    cursor: "pointer",
    touchAction: "none",
  },
  fill: {
    position: "absolute",
    top: 0,
    height: "100%",
    borderRadius: 5,
    background: color.mint400,
    transition: "left 0.05s, width 0.05s",
  },
  thumb: {
    position: "absolute",
    top: -5,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: color.mint500,
    border: `3px solid ${color.white}`,
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    transform: "translateX(-50%)",
    transition: "left 0.05s",
    pointerEvents: "none",
  },
  pctText: {
    fontSize: 11,
    color: color.gray500,
    marginTop: 4,
  },
};

/* ================================================================
   EditProfilePage
   ================================================================ */

export const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthed, userId, authLoading } = useAuth();

  /* 접근 제어 */
  useEffect(() => {
    if (!authLoading && !isAuthed) navigate("/login", { replace: true });
  }, [authLoading, isAuthed, navigate]);

  /* ---- 폼 상태 ---- */
  const [name, setName] = useState("");
  const [gender, setGender] = useState<boolean | null>(null); // true=남, false=여
  const [born, setBorn] = useState("");
  const [height, setHeight] = useState("");
  const [residence, setResidence] = useState("");
  const [job, setJob] = useState("");
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [aboutme, setAboutme] = useState("");
  const [profileImageId, setProfileImageId] = useState("1");

  /* MBTI 축 (0=왼 극단, 100=오른 극단) */
  const [ei, setEi] = useState(50);
  const [sn, setSn] = useState(50);
  const [tf, setTf] = useState(50);
  const [jp, setJp] = useState(50);

  /* 내특징 / 관심사 / 이상형 */
  const [myTraits, setMyTraits] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [idealTraits, setIdealTraits] = useState<string[]>([]);

  /* 선호도 */
  const [prefs, setPrefs] = useState<Record<string, string>>({
    contactPref: "상관없음",
    cigar: "비흡연",
    drinking: "거의 안먹음",
    affectionLevel: "중간",
    jealousyLevel: "낮은",
    meetingPref: "상관없음",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  /* ---- 기존 프로필 로드 ---- */
  useEffect(() => {
    if (!userId) return;
    let alive = true;

    fetchMyProfile(userId)
      .then((p) => {
        if (!alive || !p) return;
        setName(p.name ?? "");
        if (p.gender != null) setGender(p.gender);
        setBorn(p.born != null ? String(p.born) : "");
        setHeight(p.height != null ? String(p.height) : "");
        setResidence(p.residence ?? "");
        setJob(p.job ?? "");
        setSchool(p.school ?? "");
        setDepartment(p.department ?? "");
        setAboutme(p.aboutme ?? "");
        setProfileImageId(p.profileImageId ?? "1");

        // MBTI 축
        if (p.mbtiEI != null) setEi(p.mbtiEI);
        else if (p.mbti) {
          const axes = mbtiStringToAxes(p.mbti);
          setEi(axes.ei);
          setSn(axes.sn);
          setTf(axes.tf);
          setJp(axes.jp);
        }
        if (p.mbtiSN != null) setSn(p.mbtiSN);
        if (p.mbtiTF != null) setTf(p.mbtiTF);
        if (p.mbtiJP != null) setJp(p.mbtiJP);

        // 선호도
        setPrefs((prev) => ({
          ...prev,
          ...(p.contactPref ? { contactPref: p.contactPref } : {}),
          ...(p.cigar ? { cigar: p.cigar } : {}),
          ...(p.drinking ? { drinking: p.drinking } : {}),
          ...(p.affectionLevel ? { affectionLevel: p.affectionLevel } : {}),
          ...(p.jealousyLevel ? { jealousyLevel: p.jealousyLevel } : {}),
          ...(p.meetingPref ? { meetingPref: p.meetingPref } : {}),
        }));

        // 태그 배열
        if (p.myTraits) setMyTraits(p.myTraits);
        if (p.interests) setInterests(p.interests);
        if (p.idealTraits) setIdealTraits(p.idealTraits);
      })
      .catch((e) => console.error("[EditProfile] load failed", e))
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [userId]);

  /* ---- SelectionPage에서 돌아올 때 URL params 처리 ---- */
  const selectionHandled = useRef(false);
  useEffect(() => {
    if (selectionHandled.current) return;
    const field = searchParams.get("field");
    const valuesRaw = searchParams.get("values");
    if (!field || !valuesRaw) return;

    selectionHandled.current = true;
    try {
      const values = JSON.parse(decodeURIComponent(valuesRaw)) as string[];
      if (field === "myTraits") setMyTraits(values);
      else if (field === "interests") setInterests(values);
      else if (field === "idealTraits") setIdealTraits(values);
    } catch { /* ignore */ }

    // URL 정리
    searchParams.delete("field");
    searchParams.delete("values");
    setSearchParams(searchParams, { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- 선호도 순환 ---- */
  const cyclePref = (key: string) => {
    const opts = PREF_OPTIONS[key];
    if (!opts) return;
    const idx = opts.indexOf(prefs[key]);
    const next = opts[(idx + 1) % opts.length];
    setPrefs((prev) => ({ ...prev, [key]: next }));
  };

  /* ---- 저장 ---- */
  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!userId) return;

    setSaving(true);
    setError("");

    try {
      const bornNum = parseInt(born, 10);
      const heightNum = parseInt(height, 10);
      await upsertMyProfile(userId, {
        name: trimmedName,
        gender: gender ?? undefined,
        born: Number.isNaN(bornNum) ? undefined : bornNum,
        height: Number.isNaN(heightNum) ? undefined : heightNum,
        residence: residence.trim() || undefined,
        job: job.trim() || undefined,
        school: school.trim() || undefined,
        department: department.trim() || undefined,
        aboutme: aboutme.trim() || undefined,
        profileImageId: profileImageId || undefined,
        mbti: axesToMbtiString(ei, sn, tf, jp),
        mbtiEI: ei,
        mbtiSN: sn,
        mbtiTF: tf,
        mbtiJP: jp,
        myTraits,
        interests,
        idealTraits,
        ...prefs,
      });
      navigate("/me");
    } catch (err: any) {
      console.error("[EditProfile] save failed", err);
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  /* ---- 렌더링 ---- */
  if (authLoading || (!isAuthed && !authLoading)) return null;

  if (loading) {
    return (
      <div style={s.page}>
        <Header title="프로필 수정" showBack />
        <div style={s.loadingWrap}>
          <p style={s.loadingText}>불러오는 중…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Header title="프로필 수정" showBack />

      <div style={s.scroll}>
        {/* ==================== 카드 1: 기본 정보 ==================== */}
        <div style={s.card}>
          {/* 프로필 이미지 + 닉네임 */}
          <div style={s.profileRow}>
            <div style={s.flowerCircle}>
              <span style={{ fontSize: 30 }}>🌷</span>
            </div>
            <div style={{ flex: 1 }}>
              <span style={s.fieldHint}>닉네임</span>
              <input
                type="text"
                placeholder="이름을 입력해주세요"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={s.nameInput}
              />
            </div>
          </div>

          {/* 성별 */}
          <div style={{ marginTop: 20 }}>
            <p style={s.fieldLabel}>
              성별{" "}
              <span style={{ ...typo.caption, color: color.gray400, fontWeight: 400 }}>
                성별은 가입 후 수정할 수 없습니다.
              </span>
            </p>
            <div style={s.genderRow}>
              {[true, false].map((g) => (
                <button
                  key={String(g)}
                  onClick={() => setGender(g)}
                  style={{
                    ...s.genderBtn,
                    borderColor: gender === g ? color.mint500 : color.gray300,
                    color: gender === g ? color.mint600 : color.gray400,
                    background: gender === g ? color.mint50 : color.white,
                  }}
                >
                  {g ? "남자" : "여자"}
                </button>
              ))}
            </div>
          </div>

          {/* 2열 정보 그리드 */}
          <div style={s.infoGrid}>
            <InfoField icon={<IcCrown />} label="출생연도" value={born} placeholder="예: 1998" suffix="년" onChange={setBorn} inputMode="numeric" />
            <InfoField icon={<IcHeight />} label="키" value={height} placeholder="예: 174" suffix="cm" onChange={setHeight} inputMode="numeric" />
          </div>
          <div style={s.infoGrid}>
            <InfoField icon={<IcPin />} label="거주지" value={residence} placeholder="예: 서울 북부" onChange={setResidence} />
            <InfoField icon={<IcBriefcase />} label="직업" value={job} placeholder="직업 입력" onChange={setJob} />
          </div>
          <div style={s.infoGrid}>
            <InfoField icon={<IcSchool />} label="대학교" value={school} placeholder="학교명" onChange={setSchool} />
            <InfoField icon={<IcDoc />} label="전공" value={department} placeholder="전공 입력" onChange={setDepartment} />
          </div>

          {/* 자기소개 */}
          <div style={{ marginTop: 22 }}>
            <p style={s.fieldLabel}>자기소개</p>
            <p style={{ ...typo.caption, color: color.gray500, marginBottom: 8 }}>
              자세히 작성할수록 매칭률 UP!
            </p>
            <div style={s.textareaWrap}>
              <textarea
                placeholder="자신에 대해 적어주세요! (최소10자)"
                value={aboutme}
                onChange={(e) => setAboutme(e.target.value)}
                rows={4}
                style={s.textarea}
              />
              <span style={s.charCount}>{aboutme.length}자</span>
            </div>
          </div>
        </div>

        {/* ==================== 카드 2: MBTI ==================== */}
        <div style={s.card}>
          <p style={s.cardTitle}>MBTI</p>
          <MbtiSlider leftLabel="E" leftSub="외향형" rightLabel="I" rightSub="내향형" value={ei} onChange={setEi} />
          <MbtiSlider leftLabel="S" leftSub="감각형" rightLabel="N" rightSub="직관형" value={sn} onChange={setSn} />
          <MbtiSlider leftLabel="T" leftSub="사고형" rightLabel="F" rightSub="감정형" value={tf} onChange={setTf} />
          <MbtiSlider leftLabel="J" leftSub="판단형" rightLabel="P" rightSub="인식형" value={jp} onChange={setJp} />
        </div>

        {/* ==================== 카드 3: 내특징 / 관심사 / 이상형 ==================== */}
        <div style={s.card}>
          <TagRow
            icon={<IcPerson />}
            label="내특징"
            sub={myTraits.length > 0 ? `${myTraits.length}개 선택됨` : "선택해주세요."}
            onClick={() =>
              navigate(
                `/select?mode=traits&title=${encodeURIComponent("내특징 선택")}&field=myTraits&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(myTraits))}`
              )
            }
          />
          <div style={s.divider} />
          <TagRow
            icon={<IcSparkle />}
            label="관심사"
            sub={interests.length > 0 ? `${interests.length}개 선택됨` : "선택해주세요."}
            onClick={() =>
              navigate(
                `/select?mode=interests&title=${encodeURIComponent("관심사 선택")}&field=interests&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(interests))}`
              )
            }
          />
          <div style={s.divider} />
          <TagRow
            icon={<IcHeart />}
            label="이상형"
            sub={idealTraits.length > 0 ? `${idealTraits.length}개 선택됨` : "선택해주세요."}
            onClick={() =>
              navigate(
                `/select?mode=ideal&title=${encodeURIComponent("이상형 선택")}&field=idealTraits&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(idealTraits))}`
              )
            }
          />
        </div>

        {/* ==================== 카드 4: 선호도 ==================== */}
        <div style={s.card}>
          <div style={s.prefGrid}>
            {["contactPref", "cigar", "drinking"].map((key) => (
              <PrefCard
                key={key}
                label={PREF_LABELS[key]}
                value={prefs[key]}
                Icon={PREF_ICONS[key]}
                onClick={() => cyclePref(key)}
              />
            ))}
          </div>
          <div style={{ ...s.prefGrid, marginTop: 16 }}>
            {["affectionLevel", "jealousyLevel", "meetingPref"].map((key) => (
              <PrefCard
                key={key}
                label={PREF_LABELS[key]}
                value={prefs[key]}
                Icon={PREF_ICONS[key]}
                onClick={() => cyclePref(key)}
              />
            ))}
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}
      </div>

      {/* 저장 버튼 */}
      <div style={s.bottom}>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "저장 중…" : "저장하기"}
        </Button>
      </div>
    </div>
  );
};

/* ================================================================
   InfoField — 아이콘 + 라벨 + 입력 카드
   ================================================================ */

const InfoField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  onChange: (v: string) => void;
  inputMode?: "text" | "numeric";
}> = ({ icon, label, value, placeholder, suffix, onChange, inputMode = "text" }) => (
  <div style={{ minWidth: 0 }}>
    <p style={s.fieldLabel}>{label}</p>
    <div style={s.infoCard}>
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={s.infoInput}
      />
      {suffix && value && <span style={s.suffix}>{suffix}</span>}
    </div>
  </div>
);

/* ================================================================
   TagRow — 내특징 / 관심사 / 이상형
   ================================================================ */

const TagRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick?: () => void;
}> = ({ icon, label, sub, onClick }) => (
  <div style={s.tagRow} onClick={onClick}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
      {icon}
      <div>
        <p style={{ ...typo.subheading, color: color.gray900, fontSize: 14 }}>{label}</p>
        <p style={{ ...typo.caption, color: color.gray400 }}>{sub}</p>
      </div>
    </div>
    <IcChevron />
  </div>
);

/* ================================================================
   PrefCard — 선호도 카드 (탭하면 순환)
   ================================================================ */

const PrefCard: React.FC<{
  label: string;
  value: string;
  Icon: React.FC;
  onClick: () => void;
}> = ({ label, value, Icon, onClick }) => (
  <div>
    <p style={s.prefLabel}>{label}</p>
    <button style={s.prefBtn} onClick={onClick}>
      <Icon />
      <span style={s.prefValue}>{value}</span>
    </button>
  </div>
);

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: color.gray100,
  },
  loadingWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { ...typo.body, color: color.gray500 },
  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: "12px 16px 24px",
  },

  /* -- 카드 -- */
  card: {
    background: color.white,
    borderRadius: radius.xl,
    padding: "20px 18px",
    marginBottom: 14,
    boxShadow: shadow.card,
    overflow: "hidden",
    boxSizing: "border-box" as const,
  },
  cardTitle: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 18,
  },

  /* -- 프로필 상단 -- */
  profileRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  flowerCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: color.mint50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  fieldHint: {
    ...typo.caption,
    color: color.gray400,
    display: "block",
    marginBottom: 2,
  },
  nameInput: {
    ...typo.heading,
    color: color.gray900,
    border: "none",
    background: "transparent",
    outline: "none",
    width: "100%",
    padding: 0,
  },

  /* -- 성별 -- */
  genderRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginTop: 8,
  },
  genderBtn: {
    padding: "10px 0",
    borderRadius: radius.lg,
    border: "2px solid",
    ...typo.button,
    cursor: "pointer",
    transition: "all 0.15s",
  },

  /* -- 정보 그리드 -- */
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 18,
    minWidth: 0,
  },
  fieldLabel: {
    ...typo.caption,
    fontWeight: 700,
    color: color.gray800,
    marginBottom: 6,
  },
  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: radius.lg,
    background: color.gray50,
    border: `1px solid ${color.gray200}`,
    boxSizing: "border-box" as const,
    minWidth: 0,
    overflow: "hidden",
  },
  infoInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    ...typo.body,
    color: color.gray900,
    fontWeight: 500,
    minWidth: 0,
    width: "100%",
    padding: 0,
  },
  suffix: {
    ...typo.body,
    color: color.gray500,
    flexShrink: 0,
  },

  /* -- 자기소개 -- */
  textareaWrap: {
    position: "relative",
    background: color.gray50,
    borderRadius: radius.lg,
    border: `1px solid ${color.gray200}`,
  },
  textarea: {
    width: "100%",
    padding: "12px 14px 28px",
    border: "none",
    background: "transparent",
    outline: "none",
    ...typo.body,
    color: color.gray900,
    resize: "none" as const,
    fontFamily: "inherit",
    minHeight: 100,
    boxSizing: "border-box" as const,
  },
  charCount: {
    position: "absolute",
    right: 14,
    bottom: 8,
    ...typo.caption,
    color: color.gray400,
  },

  /* -- 태그 행 -- */
  tagRow: {
    display: "flex",
    alignItems: "center",
    padding: "14px 0",
    cursor: "pointer",
  },
  divider: {
    height: 1,
    background: color.gray100,
  },

  /* -- 선호도 그리드 -- */
  prefGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 12,
  },
  prefLabel: {
    ...typo.caption,
    fontWeight: 700,
    color: color.gray800,
    marginBottom: 8,
  },
  prefBtn: {
    width: "100%",
    padding: "16px 8px 12px",
    borderRadius: radius.lg,
    background: color.gray50,
    border: `1px solid ${color.gray200}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
    transition: "background 0.15s",
  },
  prefValue: {
    ...typo.caption,
    fontWeight: 600,
    color: color.gray700,
  },

  /* -- 기타 -- */
  error: {
    ...typo.caption,
    color: color.danger,
    textAlign: "center",
    padding: "0 16px",
    marginTop: 4,
  },
  bottom: {
    padding: "12px 16px 24px",
    background: color.gray100,
  },
};
