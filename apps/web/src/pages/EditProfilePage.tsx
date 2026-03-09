import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { useProfile } from "@/auth/ProfileContext";
import { Header, Button, Modal } from "@/ui";
import { fetchUser, upsertMyProfile } from "@/domains/user/user.repo";
import {
  applyProfileAvatar,
  generateProfileAvatars,
} from "@/auth/profileAvatarCandidates";
import { storage } from "@/infra/firebase/storage";
import { getDownloadURL, ref } from "firebase/storage";
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

const PREF_PLACEHOLDER = "선택해주세요.";
const HEIGHT_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "200이상", value: 200 },
  ...Array.from({ length: 59 }, (_, i) => {
    const value = 199 - i; // 199 ~ 141
    return { label: `${value}`, value };
  }),
  { label: "140이하", value: 140 },
];
const CURRENT_YEAR = new Date().getFullYear();
const BORN_YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 1980 + 1 },
  (_, i) => CURRENT_YEAR - i,
);
const JOB_OPTIONS = [
  "대학생",
  "대학원생",
  "취준생",
  "회사원",
  "공무원",
  "공기업",
  "개발자",
  "디자이너",
  "마케터",
  "금융권",
  "의료직",
  "교사",
  "연구직",
  "전문직",
  "창업가",
  "자영업",
  "프리랜서",
  "기타",
];
const RESIDENCE_OPTIONS = Array.from(
  new Set(
    `
서울
부산
대구
인천
광주
대전
울산
세종
수원
성남
의정부
안양
부천
광명
평택
동두천
안산
고양
구리
남양주
오산
시흥
군포
과천
의왕
하남
용인
파주
이천
안성
김포
화성
광주
양주
포천
여주
춘천
원주
강릉
동해
태백
속초
삼척
청주
충주
제천
천안
공주
보령
아산
서산
논산
계룡
당진
전주
군산
익산
정읍
남원
김제
목포
여수
순천
나주
광양
포항
경주
김천
안동
구미
영주
영천
상주
문경
경산
창원
진주
통영
사천
김해
밀양
거제
양산
제주
서귀포
`
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
  ),
);
const SCHOOL_OPTIONS = Array.from(
  new Set(
    `
ICT폴리텍대학
SPC식품과학대학
가야대학교
가천대학교
가톨릭관동대학교
가톨릭꽃동네대학교
가톨릭대학교
가톨릭상지대학교
감리교신학대학교
강남대학교
강동대학교
강릉영동대학교
강서대학교
강원대학교
강원도립대학교
개신대학원대학교
거제대학교
건국대학교
건국대학교 GLOCAL캠퍼스
건신대학원대학교
건양대학교
건양사이버대학교
겐트 대학교 글로벌캠퍼스
경기과학기술대학교
경기대학교
경남대학교
경남정보대학교
경동대학교
경민대학교
경복대학교
경북과학대학교
경북대학교
경북보건대학교
경북전문대학교
경상국립대학교
경성대학교
경안대학원대학교
경운대학교
경인교육대학교
경인여자대학교
경일대학교
경찰대학
경희대학교
경희사이버대학교
계명대학교
계명문화대학교
계원예술대학교
고려대학교
고려대학교 세종캠퍼스
고려사이버대학교
고신대학교
공군사관학교
공주교육대학교
과학기술연합대학원대학교
광신대학교
광양보건대학교
광운대학교
광주가톨릭대학교
광주과학기술원
광주교육대학교
광주대학교
광주보건대학교
광주여자대학교
구미대학교
구세군사관대학원대학교
국군간호사관학교
국립경국대학교
국립공주대학교
국립군산대학교
국립금오공과대학교
국립목포대학교
국립목포해양대학교
국립부경대학교
국립순천대학교
국립암센터국제암대학원대학교
국립창원대학교
국립한국교통대학교
국립한국해양대학교
국립한밭대학교
국민대학교
국방대학교
국제뇌교육종합대학원대학교
국제대학교
국제법률경영대학원대학교
국제사이버대학교
국제언어대학원대학교
국제예술대학교
군산간호대학교
군장대학교
극동대학교
글로벌사이버대학교
금강대학교
기독간호대학교
김천대학교
김포대학교
김해대학교
나사렛대학교
나주대학교
남부대학교
남서울대학교
농협대학교
뉴욕 주립대학교 스토니브룩 한국캠퍼스
능인대학원대학교
단국대학교
대경대학교
대구가톨릭대학교
대구경북과학기술원
대구공업대학교
대구과학대학교
대구교육대학교
대구대학교
대구보건대학교
대구사이버대학교
대구예술대학교
대구한의대학교
대덕대학교
대동대학교
대림대학교
대신대학교
대우조선해양공과대학
대원대학교
대전가톨릭대학교
대전과학기술대학교
대전대학교
대전보건대학교
대전신학대학교
대진대학교
대한신학대학원대학교
덕성여자대학교
동강대학교
동국대학교
동국대학교 WISE캠퍼스
동남보건대학교
동덕여자대학교
동명대학교
동방문화대학원대학교
동서대학교
동서울대학교
동신대학교
동아대학교
동아방송예술대학교
동아보건대학교
동양대학교
동양미래대학교
동원과학기술대학교
동원대학교
동의과학대학교
동의대학교
두원공과대학교
디지털서울문화예술대학교
루터대학교
마산대학교
명지대학교
명지전문대학
목원대학교
목포가톨릭대학교
목포과학대학교
문경대학교
배재대학교
배화여자대학교
백석대학교
백석문화대학교
백석예술대학교
백제예술대학교
베뢰아국제대학원대학교
부산가톨릭대학교
부산경상대학교
부산과학기술대학교
부산교육대학교
부산대학교
부산디지털대학교
부산보건대학교
부산여자대학교
부산예술대학교
부산외국어대학교
부산장신대학교
부천대학교
북한대학원대학교
사이버한국외국어대학교
삼성전자공과대학교
삼성중공업공과대학
삼육대학교
삼육보건대학교
상명대학교
상지대학교
서강대학교
서경대학교
서영대학교
서울과학기술대학교
서울과학종합대학원대학교
서울교육대학교
서울기독대학교
서울대학교
서울디지털대학교
서울미디어대학원대학교
서울벤처대학원대학교
서울불교대학원대학교
서울사이버대학교
서울사회복지대학원대학교
서울상담심리대학원대학교
서울성경신학대학원대학교
서울시립대학교
서울신학대학교
서울여자간호대학교
서울여자대학교
서울예술대학교
서울외국어대학원대학교
서울장신대학교
서울한영대학교
서원대학교
서일대학교
서정대학교
선린대학교
선문대학교
선학유피대학원대학교
성결대학교
성공회대학교
성균관대학교
성산효대학원대학교
성서침례대학원대학교
성신여자대학교
성운대학교
세경대학교
세명대학교
세종대학교
세종사이버대학교
세한대학교
송곡대학교
송원대학교
송호대학교
수도국제대학원대학교
수성대학교
수원가톨릭대학교
수원과학대학교
수원대학교
수원여자대학교
숙명여자대학교
순복음대학원대학교
순복음총회신학교
순천제일대학교
순천향대학교
숭실대학교
숭실사이버대학교
숭의여자대학교
신경주대학교
신구대학교
신라대학교
신성대학교
신안산대학교
신한대학교
실천신학대학원대학교
아신대학교
아주대학교
아주자동차대학교
안동과학대학교
안산대학교
안양대학교
에스라성경대학원대학교
여주대학교
연성대학교
연세대학교
연세대학교 미래캠퍼스
연암공과대학교
연암대학교
영남대학교
영남신학대학교
영남외국어대학
영남이공대학교
영산대학교
영산선학대학교
영진사이버대학교
영진전문대학교
예명대학원대학교
예수대학교
예원예술대학교
오산대학교
온석대학원대학교
용인대학교
용인예술과학대학교
우석대학교
우송대학교
우송정보대학
울산과학기술원
울산과학대학교
울산대학교
웅지세무대학교
원광대학교
원광디지털대학교
원불교대학원대학교
웨스트민스터신학대학원대학교
위덕대학교
유원대학교
유타 대학교 아시아 캠퍼스
유한대학교
육군3사관학교
육군사관학교
을지대학교
이화여자대학교
인덕대학교
인제대학교
인천가톨릭대학교
인천대학교
인하공업전문대학
인하대학교
장로회신학대학교
장안대학교
재능대학교
전남과학대학교
전남대학교
전남도립대학교
전북과학대학교
전북대학교
전주교육대학교
전주기전대학
전주대학교
전주비전대학교
정석대학
정화예술대학교
제네바신학대학원대학교
제주관광대학교
제주국제대학교
제주대학교
제주한라대학교
조선간호대학교
조선대학교
조선이공대학교
주안대학원대학교
중부대학교
중앙대학교
중앙승가대학교
중원대학교
진주교육대학교
진주보건대학교
차의과학대학교
창신대학교
창원문성대학교
청강문화산업대학교
청암대학교
청운대학교
청주교육대학교
청주대학교
초당대학교
총신대학교
추계예술대학교
춘천교육대학교
춘해보건대학교
충남대학교
충남도립대학교
충북대학교
충북도립대학교
충북보건과학대학교
충청대학교
치유상담대학원대학교
칼빈대학교
평택대학교
포스코기술대학
포항공과대학교
포항대학교
한경국립대학교
한국개발연구원 국제정책대학원대학교
한국골프과학기술대학교
한국공학대학교
한국과학기술원
한국관광대학교
한국교원대학교
한국기술교육대학교
한국농수산대학교
한국방송통신대학교
한국복지사이버대학교
한국상담대학원대학교
한국성서대학교
한국성서대학교
한국승강기대학교
한국에너지공과대학교
한국열린사이버대학교
한국영상대학교
한국예술종합학교
한국외국어대학교
한국전력국제원자력대학원대학교
한국전통문화대학교
한국조지메이슨대학교
한국침례신학대학교
한국폴리텍대학
한국학중앙연구원 한국학대학원
한국항공대학교
한남대학교
한동대학교
한라대학교
한림국제대학원대학교
한림대학교
한림성심대학교
한반도국제대학원대학교
한서대학교
한성대학교
한세대학교
한세대학교
한신대학교
한양대학교
한양대학교 ERICA캠퍼스
한양사이버대학교
한양여자대학교
한영대학교
한일장신대학교
합동신학대학원대학교
해군사관학교
협성대학교
혜전대학교
호남대학교
호남신학대학교
호산대학교
호서대학교
호원대학교
홍익대학교
화성의과학대학교
화신사이버대학교
횃불트리니티신학대학원대학교
    `
      .split("\n")
      .map((v) => v.trim())
      .filter(Boolean),
  ),
);

/** MBTI 문자열 → 슬라이더 기본값 (0~100, 50=중앙) */
function mbtiStringToSliders(mbti?: string) {
  const m = (mbti ?? "").toUpperCase();
  return {
    ei: m.includes("I") ? 75 : 25,
    sn: m.includes("N") ? 75 : 25,
    tf: m.includes("F") ? 75 : 25,
    jp: m.includes("P") ? 75 : 25,
  };
}

/** 슬라이더(0~100) → MBTI 문자열 */
function slidersToMbtiString(ei: number, sn: number, tf: number, jp: number) {
  return (
    (ei < 50 ? "E" : "I") +
    (sn < 50 ? "S" : "N") +
    (tf < 50 ? "T" : "F") +
    (jp < 50 ? "J" : "P")
  );
}

/**
 * DB mbtiPercentages (-100 ~ 100) → 슬라이더 (0 ~ 100)
 *   -100(왼쪽극단) → 0,  0(중앙) → 50,  100(오른쪽극단) → 100
 */
function dbToSlider(dbVal: number): number {
  return Math.round((dbVal + 100) / 2);
}

/**
 * 슬라이더 (0 ~ 100) → DB mbtiPercentages (-100 ~ 100)
 */
function sliderToDb(sliderVal: number): number {
  return Math.round(sliderVal * 2 - 100);
}

/* ---- 선호도: 숫자(DB) ↔ 문자열(UI) 매핑 ---- */

/** DB 숫자 필드 → UI 선호도 키 매핑 */
const NUM_PREF_MAP: Record<string, { dbField: string; options: string[] }> = {
  contactPref: { dbField: "call", options: ["상관없음", "전화", "카카오톡"] },
  drinking: { dbField: "forDate", options: ["거의 안먹음", "가끔", "자주", "매우 자주"] },
  affectionLevel: { dbField: "cute", options: ["높은", "중간", "낮은"] },
  jealousyLevel: { dbField: "jealousy", options: ["높은", "중간", "낮은"] },
  meetingPref: { dbField: "date", options: ["상관없음", "데이트", "소개팅"] },
};

/** DB 숫자 → UI 문자열 */
function dbNumToPrefString(dbField: string, dbValue: number): string | undefined {
  const entry = Object.values(NUM_PREF_MAP).find((e) => e.dbField === dbField);
  if (!entry) return undefined;
  return entry.options[dbValue] ?? entry.options[0];
}

/** UI 선호도 키 + 문자열 → DB 숫자 */
function prefStringToDbNum(prefKey: string, value: string): number {
  const entry = NUM_PREF_MAP[prefKey];
  if (!entry) return 0;
  const idx = entry.options.indexOf(value);
  return idx >= 0 ? idx : 0;
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
const IcPhone = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M6.62 10.79a15.53 15.53 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.3 21 3 13.7 3 4c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.12.35.03.74-.24 1.02l-2.21 2.2z" />
  </svg>
);
const IcChatBubble = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H8l-4 4V6c0-1.1.9-2 2-2zm3 5h10v2H7V9zm0 4h7v2H7v-2z" />
  </svg>
);
const IcNoSmoke = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M2 6l6.99 7H2v3h9.99l7 7 1.26-1.25-17-17L2 6zm18.5 7H22v3h-1.5v-3zM18 13h1.5v3H18v-3zm.85-8.12c.62-.61 1-1.45 1-2.38h-1.5c0 1.02-.83 1.85-1.85 1.85v1.5c2.24 0 4 1.83 4 4.07V12H22V9.92c0-2.23-1.28-4.15-3.15-5.04zM14.5 8.7c.91-.47 1.5-1.41 1.5-2.5 0-1.65-1.35-3-3-3v1.5c.83 0 1.5.67 1.5 1.5 0 .84-.67 1.5-1.5 1.5v1.5c1.85 0 3.5 1.18 3.5 3V12H18v-.8c0-2.04-1.53-3.54-3.5-3.5z" />
  </svg>
);
const IcSmoke = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M3 13h14v4H3v-4zm15 0h3a2 2 0 012 2 2 2 0 01-2 2h-3v-4zM15.5 3c1.1.75 1.8 1.98 1.8 3.35 0 1.13-.49 2.15-1.27 2.85l-.98-.98c.5-.46.81-1.11.81-1.87 0-.88-.43-1.67-1.09-2.15L15.5 3zm3.5.5C20.22 4.52 21 6.19 21 8c0 1.5-.53 2.87-1.42 3.95l-1.01-1.01A4.47 4.47 0 0019.5 8c0-1.35-.6-2.56-1.56-3.38L19 3.5z" />
  </svg>
);
const IcBeer = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M4 2h12v2H4v16h12v2H4c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2zm14 4h2c1.1 0 2 .9 2 2v6c0 1.1-.9 2-2 2h-2V6zm0 8h2V8h-2v6zM6 6h8v12H6V6zm2 2v8h4V8H8z" />
  </svg>
);
const IcCup = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <path d="M3 4h14v3a4 4 0 01-4 4h-1v7h3v2H5v-2h3v-7H7a4 4 0 01-4-4V4zm2 2v1a2 2 0 002 2h6a2 2 0 002-2V6H5z" />
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
const IcNeutral = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill={color.gray500}>
    <circle cx="12" cy="12" r="10" fill="none" stroke={color.gray500} strokeWidth="1.5" />
    <circle cx="9" cy="10" r="1.2" />
    <circle cx="15" cy="10" r="1.2" />
    <path d="M8 15h8" stroke={color.gray500} strokeWidth="1.5" strokeLinecap="round" />
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
  disabled?: boolean;
}> = ({ leftLabel, leftSub, rightLabel, rightSub, value, onChange, disabled = false }) => {
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
      if (disabled) return;
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      onChange(calcValue(e.clientX));
    },
    [onChange, calcValue, disabled]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      if (!dragging.current) return;
      onChange(calcValue(e.clientX));
    },
    [onChange, calcValue, disabled]
  );

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const leftActive = value < 50;
  const displayPct = Math.round(Math.abs(value - 50) * 2);

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
          style={{
            ...mbtiStyles.track,
            cursor: disabled ? "default" : "pointer",
          }}
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

type EditProfileMode = "edit" | "read";

interface EditProfilePageProps {
  mode?: EditProfileMode;
}

interface AvatarCandidateView {
  index: number;
  storagePath: string;
  imageUrl: string;
}

const ANIMAL_OPTIONS: Array<{ label: string; value: string }> = [
  { label: "AI 추천", value: "AI Recommand" },
  { label: "강아지-도베르만", value: "Doberman" },
  { label: "강아지-리트리버", value: "Retreiver" },
  { label: "강아지-비숑", value: "Bichon" },
  { label: "강아지-말티푸", value: "Maltipoo" },
  { label: "고슴도치", value: "Hedgehog" },
  { label: "고양이", value: "Cat" },
  { label: "곰돌이", value: "Brown Bear" },
  { label: "늑대", value: "Wolf" },
  { label: "담비", value: "Marten" },
  { label: "범고래", value: "Orca" },
  { label: "수달", value: "Otter" },
  { label: "사막여우", value: "Fennec fox" },
  { label: "양", value: "Sheep" },
  { label: "여우", value: "Fox" },
  { label: "토끼", value: "Rabbit" },
  { label: "팬더", value: "Panda" },
  { label: "햄스터", value: "Hamster" },
  { label: "호랑이", value: "Omit" },
];

export const EditProfilePage: React.FC<EditProfilePageProps> = ({ mode = "edit" }) => {
  const navigate = useNavigate();
  const params = useParams<{ uid: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isReadMode = mode === "read";
  const targetUid = params.uid;
  const { isAuthed, userId, authLoading } = useAuth();
  const { myProfile, profileLoading, patchProfile } = useProfile();

  /* 접근 제어 */
  useEffect(() => {
    if (isReadMode) return;
    if (!authLoading && !isAuthed) navigate("/login", { replace: true });
  }, [authLoading, isAuthed, navigate, isReadMode]);

  /* ==================================================================
     버퍼 (draft): 전역 프로필을 로컬에서 편집하는 단일 상태
     - 진입 시 ProfileContext → buffer 복사 (1회)
     - 선택 페이지 이동 시에만 sessionStorage에 임시 저장
     - 저장 버튼 → 서버 반영 + 전역 프로필 갱신
     - 뒤로가기 → 로컬 버퍼 버림 (전역 프로필 그대로)
     ================================================================== */
  const SESSION_KEY = "editProfile_draft";

  const [buffer, setBuffer] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarGenerating, setAvatarGenerating] = useState(false);
  const [avatarApplying, setAvatarApplying] = useState(false);
  const [avatarGenId, setAvatarGenId] = useState("");
  const [avatarCandidates, setAvatarCandidates] = useState<AvatarCandidateView[]>([]);
  const [avatarSelectedIndex, setAvatarSelectedIndex] = useState<number | null>(null);
  const [avatarError, setAvatarError] = useState("");
  const [aiInfoOpen, setAiInfoOpen] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState<string>("AI Recommand");
  const [bornYearPickerOpen, setBornYearPickerOpen] = useState(false);
  const [heightPickerOpen, setHeightPickerOpen] = useState(false);
  const [residencePickerOpen, setResidencePickerOpen] = useState(false);
  const [residenceQuery, setResidenceQuery] = useState("");
  const [jobPickerOpen, setJobPickerOpen] = useState(false);
  const [jobQuery, setJobQuery] = useState("");
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [error, setError] = useState("");
  const initialized = useRef(false);
  const nameFieldRef = useRef<HTMLDivElement | null>(null);
  const bornFieldRef = useRef<HTMLDivElement | null>(null);
  const heightFieldRef = useRef<HTMLDivElement | null>(null);
  const residenceFieldRef = useRef<HTMLDivElement | null>(null);
  const jobFieldRef = useRef<HTMLDivElement | null>(null);
  const schoolFieldRef = useRef<HTMLDivElement | null>(null);
  const departmentFieldRef = useRef<HTMLDivElement | null>(null);
  const aboutmeFieldRef = useRef<HTMLDivElement | null>(null);
  const featuresFieldRef = useRef<HTMLDivElement | null>(null);
  const interestsFieldRef = useRef<HTMLDivElement | null>(null);
  const idealTypeFieldRef = useRef<HTMLDivElement | null>(null);
  const prefFieldRef = useRef<HTMLDivElement | null>(null);
  const genderLocked = typeof buffer.gender === "boolean";
  const filteredResidences = useMemo(() => {
    const q = residenceQuery.trim().toLowerCase();
    if (!q) return RESIDENCE_OPTIONS;
    return RESIDENCE_OPTIONS.filter((name) => name.toLowerCase().includes(q));
  }, [residenceQuery]);
  const filteredJobs = useMemo(() => {
    const q = jobQuery.trim().toLowerCase();
    if (!q) return JOB_OPTIONS;
    return JOB_OPTIONS.filter((name) => name.toLowerCase().includes(q));
  }, [jobQuery]);
  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase();
    if (!q) return SCHOOL_OPTIONS;
    return SCHOOL_OPTIONS.filter((name) => name.toLowerCase().includes(q));
  }, [schoolQuery]);

  /** 버퍼 필드 부분 업데이트 (로컬만, 서버 접근 없음) */
  const set = useCallback((patch: Record<string, any>) => {
    setBuffer((prev) => ({ ...prev, ...patch }));
  }, []);

  /* ---- URL params에서 SelectionPage 결과 파싱 (동기) ---- */
  const selectionPatch = useRef<Record<string, any> | null>(null);
  const paramsHandled = useRef(false);

  if (!paramsHandled.current) {
    if (isReadMode) {
      paramsHandled.current = true;
    }
    const field = searchParams.get("field");
    const valuesRaw = searchParams.get("values");
    if (field && valuesRaw) {
      paramsHandled.current = true;
      try {
        const values = JSON.parse(decodeURIComponent(valuesRaw)) as string[];
        if (field === "myTraits") selectionPatch.current = { features: values };
        else if (field === "interests") selectionPatch.current = { interests: values };
        else if (field === "idealTraits") selectionPatch.current = { idealType: values };
      } catch { /* ignore */ }
    }
  }

  /* ---- 초기 진입: sessionStorage(선택 페이지 복귀) or 전역 프로필 → buffer (1회만) ---- */
  useEffect(() => {
    if (initialized.current) return;

    if (isReadMode) {
      if (!targetUid) {
        setLoading(false);
        initialized.current = true;
        return;
      }
      setLoading(true);
      fetchUser(targetUid)
        .then((doc) => {
          const data: Record<string, any> = doc ? { ...doc } : {};
          delete data.id;
          setBuffer(data);
        })
        .catch((e) => {
          console.error("[ReadProfile] load failed", e);
          setError("프로필을 불러오지 못했습니다.");
        })
        .finally(() => {
          setLoading(false);
          initialized.current = true;
        });
      return;
    }

    if (profileLoading) return;

    // URL 정리
    if (searchParams.has("field") || searchParams.has("values")) {
      searchParams.delete("field");
      searchParams.delete("values");
      setSearchParams(searchParams, { replace: true });
    }

    // 1) 선택 페이지에서 돌아온 경우: sessionStorage 복원
    const saved = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY); // 1회 사용 후 즉시 삭제

    let base: Record<string, any> = {};

    if (saved) {
      try {
        base = JSON.parse(saved);
      } catch { /* 파싱 실패 → 전역 프로필 사용 */ }
    }

    // 2) sessionStorage가 없으면 전역 프로필에서 복사
    if (Object.keys(base).length === 0 && myProfile) {
      const { id, ...data } = myProfile;

      // MBTI 문자열만 있고 퍼센티지가 없으면 변환
      if (!data.mbtiPercentages && data.mbti) {
        const axes = mbtiStringToSliders(data.mbti);
        data.mbtiPercentages = {
          EI: sliderToDb(axes.ei),
          SN: sliderToDb(axes.sn),
          TF: sliderToDb(axes.tf),
          JP: sliderToDb(axes.jp),
        };
      }

      base = data;
    }

    // 3) SelectionPage 결과 머지
    if (selectionPatch.current) {
      base = { ...base, ...selectionPatch.current };
      selectionPatch.current = null;
    }

    setBuffer(base);
    initialized.current = true;
    setLoading(false);
  }, [profileLoading, isReadMode, targetUid]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- 2단계 헬퍼: MBTI 슬라이더 (UI 0~100 ↔ DB -100~100) ---- */
  const getMbtiSlider = (axis: "EI" | "SN" | "TF" | "JP"): number =>
    dbToSlider(buffer.mbtiPercentages?.[axis] ?? 0);

  const setMbtiSlider = (axis: "EI" | "SN" | "TF" | "JP", sliderVal: number) => {
    const current = buffer.mbtiPercentages ?? { EI: 0, SN: 0, TF: 0, JP: 0 };
    const updated = { ...current, [axis]: sliderToDb(sliderVal) };
    set({
      mbtiPercentages: updated,
      mbti: slidersToMbtiString(
        dbToSlider(updated.EI),
        dbToSlider(updated.SN),
        dbToSlider(updated.TF),
        dbToSlider(updated.JP),
      ),
    });
  };

  /* ---- 2단계 헬퍼: 선호도 (UI 문자열 ↔ DB 숫자) ---- */
  const hasPrefSelection = (prefKey: string): boolean => {
    if (prefKey === "cigar") {
      return typeof buffer.cigar === "string" && PREF_OPTIONS.cigar.includes(buffer.cigar);
    }
    const entry = NUM_PREF_MAP[prefKey];
    if (!entry) return false;
    const dbVal = buffer[entry.dbField];
    return (
      typeof dbVal === "number" &&
      Number.isInteger(dbVal) &&
      dbVal >= 0 &&
      dbVal < entry.options.length
    );
  };

  const getPref = (prefKey: string): string => {
    if (!hasPrefSelection(prefKey)) return PREF_PLACEHOLDER;
    if (prefKey === "cigar") return buffer.cigar as string;
    const entry = NUM_PREF_MAP[prefKey];
    if (!entry) return "";
    const dbVal = buffer[entry.dbField] as number;
    return entry.options[dbVal] ?? entry.options[0];
  };

  const getPrefIcon = (prefKey: string): React.FC => {
    if (!hasPrefSelection(prefKey)) return IcQuestion;
    const value = getPref(prefKey);

    if (prefKey === "contactPref") {
      if (value === "전화") return IcPhone;
      if (value === "카카오톡") return IcChatBubble;
      return IcBell;
    }
    if (prefKey === "cigar") {
      return value === "비흡연" ? IcNoSmoke : IcSmoke;
    }
    if (prefKey === "drinking") {
      return value === "거의 안먹음" ? IcCup : IcBeer;
    }
    if (prefKey === "affectionLevel") {
      if (value === "높은") return IcCute;
      if (value === "중간") return IcNeutral;
      return IcQuestion;
    }
    if (prefKey === "jealousyLevel") {
      if (value === "높은") return IcAngry;
      if (value === "중간") return IcNeutral;
      return IcCute;
    }
    if (prefKey === "meetingPref") {
      if (value === "데이트") return IcHeart;
      if (value === "소개팅") return IcSparkle;
      return IcQuestion;
    }
    return IcQuestion;
  };

  type RequiredFieldKey =
    | "name"
    | "born"
    | "height"
    | "residence"
    | "job"
    | "school"
    | "department"
    | "aboutme"
    | "features"
    | "interests"
    | "idealType"
    | "preferences";

  const focusRequiredField = (field: RequiredFieldKey) => {
    const targetMap: Record<RequiredFieldKey, HTMLDivElement | null> = {
      name: nameFieldRef.current,
      born: bornFieldRef.current,
      height: heightFieldRef.current,
      residence: residenceFieldRef.current,
      job: jobFieldRef.current,
      school: schoolFieldRef.current,
      department: departmentFieldRef.current,
      aboutme: aboutmeFieldRef.current,
      features: featuresFieldRef.current,
      interests: interestsFieldRef.current,
      idealType: idealTypeFieldRef.current,
      preferences: prefFieldRef.current,
    };
    const target = targetMap[field];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (field === "name") {
      const input = target.querySelector("input");
      if (input instanceof HTMLInputElement) {
        window.setTimeout(() => input.focus(), 220);
      }
    }
    if (field === "aboutme") {
      const textarea = target.querySelector("textarea");
      if (textarea instanceof HTMLTextAreaElement) {
        window.setTimeout(() => textarea.focus(), 220);
      }
    }
  };

  const validateRequiredField = (): { field: RequiredFieldKey; label: string } | null => {
    if (!(buffer.name ?? "").trim()) return { field: "name", label: "닉네임" };
    if (!String(buffer.born ?? "").trim()) return { field: "born", label: "출생연도" };
    if (buffer.height == null || String(buffer.height).trim() === "") {
      return { field: "height", label: "키" };
    }
    if (!String(buffer.residence ?? "").trim()) return { field: "residence", label: "거주지" };
    if (!String(buffer.job ?? "").trim()) return { field: "job", label: "직업" };
    if (!String(buffer.school ?? "").trim()) return { field: "school", label: "대학교" };
    if (!String(buffer.department ?? "").trim()) return { field: "department", label: "전공" };
    if ((buffer.aboutme ?? "").trim().length < 10) return { field: "aboutme", label: "자기소개" };
    if (!Array.isArray(buffer.features) || buffer.features.length === 0) {
      return { field: "features", label: "내특징" };
    }
    if (!Array.isArray(buffer.interests) || buffer.interests.length === 0) {
      return { field: "interests", label: "관심사" };
    }
    if (!Array.isArray(buffer.idealType) || buffer.idealType.length === 0) {
      return { field: "idealType", label: "이상형" };
    }
    const prefKeys = [
      "contactPref",
      "cigar",
      "drinking",
      "affectionLevel",
      "jealousyLevel",
      "meetingPref",
    ];
    const hasAnyMissingPref = prefKeys.some((key) => !hasPrefSelection(key));
    if (hasAnyMissingPref) return { field: "preferences", label: "선호도" };
    return null;
  };

  const cyclePref = (prefKey: string) => {
    if (prefKey === "cigar") {
      const opts = PREF_OPTIONS.cigar;
      if (!hasPrefSelection(prefKey)) {
        set({ cigar: opts[0] });
        return;
      }
      const idx = opts.indexOf(buffer.cigar as string);
      const safeIdx = idx >= 0 ? idx : 0;
      set({ cigar: opts[(safeIdx + 1) % opts.length] });
      return;
    }
    const entry = NUM_PREF_MAP[prefKey];
    if (!entry) return;
    if (!hasPrefSelection(prefKey)) {
      set({ [entry.dbField]: 0 });
      return;
    }
    const current = buffer[entry.dbField] as number;
    set({ [entry.dbField]: (current + 1) % entry.options.length });
  };

  /** 선택 페이지로 이동 시 현재 buffer를 임시 저장 */
  const navigateToSelection = (url: string) => {
    if (isReadMode) return;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(buffer));
    navigate(url);
  };

  /* ---- 뒤로가기 (저장하지 않고 나가기 → 로컬 버퍼 버림) ---- */
  const handleBack = () => {
    navigate(-1);
  };

  /* ---- 즉시 저장 (저장 버튼 → 서버 반영 + 전역 프로필 갱신) ---- */
  const handleSave = async () => {
    if (isReadMode) return;
    const missing = validateRequiredField();
    if (missing) {
      setError(`해당 필드를 입력하세요: ${missing.label}`);
      focusRequiredField(missing.field);
      return;
    }
    if (!userId) return;

    setSaving(true);
    setError("");

    try {
      await upsertMyProfile(userId, buffer);
      // 전역 프로필도 즉시 반영 (서버 재조회 없이 메모리 업데이트)
      patchProfile(buffer);
      navigate("/me");
    } catch (err: any) {
      console.error("[EditProfile] save failed", err);
      setError("저장에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  };

  const openAiAvatarModal = () => {
    if (isReadMode || avatarApplying) return;
    setAvatarModalOpen(true);
    setAvatarError("");
  };

  const handleGenerateAiAvatarCandidates = async () => {
    if (isReadMode || avatarGenerating || avatarApplying) return;
    setAvatarCandidates([]);
    setAvatarSelectedIndex(null);
    setAvatarError("");
    setAvatarGenerating(true);

    try {
      const payloadAnimal = selectedAnimal === "AI Recommand" ? null : selectedAnimal;
      const payloadMbti = typeof buffer.mbti === "string" ? buffer.mbti : null;
      console.info("[EditProfile][AI Avatar] generate request", {
        selectedAnimal,
        payloadAnimal,
        mbti: payloadMbti,
      });
      const result = await generateProfileAvatars({
        animal: payloadAnimal,
        mbti: payloadMbti,
      });
      console.info("[EditProfile][AI Avatar] generate response", {
        genId: result.genId,
        candidateCount: result.candidates.length,
      });
      const candidatesWithUrl = await Promise.all(
        result.candidates.map(async (candidate) => {
          const imageUrl = await getDownloadURL(ref(storage, candidate.storagePath));
          return {
            index: candidate.index,
            storagePath: candidate.storagePath,
            imageUrl,
          };
        }),
      );

      setAvatarGenId(result.genId);
      setAvatarCandidates(candidatesWithUrl);
      setAvatarSelectedIndex(candidatesWithUrl[0]?.index ?? null);
    } catch (err) {
      console.error("[EditProfile] AI avatar candidates generate failed", err);
      setAvatarError("이미지 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setAvatarGenerating(false);
    }
  };

  const handleApplyAiAvatar = async () => {
    if (isReadMode || avatarApplying || avatarGenerating) return;
    if (!avatarGenId || avatarSelectedIndex == null) {
      setAvatarError("적용할 이미지를 선택해주세요.");
      return;
    }

    setAvatarApplying(true);
    setAvatarError("");
    try {
      console.info("[EditProfile][AI Avatar] apply request", {
        genId: avatarGenId,
        selectedIndex: avatarSelectedIndex,
      });
      const result = await applyProfileAvatar({
        genId: avatarGenId,
        selectedIndex: avatarSelectedIndex,
      });
      console.info("[EditProfile][AI Avatar] apply response", {
        selectedPath: result.selectedPath,
        deletedCount: result.deletedCount,
      });
      const selectedUrl = await getDownloadURL(ref(storage, result.selectedPath));

      set({
        profileImagePath: result.selectedPath,
        photoURL: selectedUrl,
        aiPhotoURL: selectedUrl,
      });
      patchProfile({
        profileImagePath: result.selectedPath,
        photoURL: selectedUrl,
        aiPhotoURL: selectedUrl,
      });
      setAvatarModalOpen(false);
      alert("프로필 이미지가 적용됐어요.");
    } catch (err) {
      console.error("[EditProfile] AI avatar apply failed", err);
      setAvatarError("선택한 이미지 적용에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setAvatarApplying(false);
    }
  };

  useEffect(() => {
    const path = buffer.profileImagePath as string | undefined;
    if (!path) return;
    if (buffer.photoURL || buffer.aiPhotoURL) return;

    let alive = true;
    getDownloadURL(ref(storage, path))
      .then((url) => {
        if (!alive) return;
        set({ photoURL: url, aiPhotoURL: url });
        patchProfile({ photoURL: url, aiPhotoURL: url });
      })
      .catch((err) => {
        console.warn("[EditProfile] profileImagePath URL 변환 실패", err);
      });
    return () => {
      alive = false;
    };
  }, [buffer.profileImagePath, buffer.photoURL, buffer.aiPhotoURL, set, patchProfile]);

  /* ---- 렌더링 ---- */
  if (!isReadMode && (authLoading || (!isAuthed && !authLoading))) return null;

  if (loading) {
    return (
      <div style={s.page}>
        <Header title="프로필 수정" showBack onBack={handleBack} />
        <div style={s.loadingWrap}>
          <p style={s.loadingText}>불러오는 중…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Header title={isReadMode ? "프로필" : "프로필 수정"} showBack onBack={handleBack} />

      <div style={s.scroll}>
        {/* ==================== 카드 1: 기본 정보 ==================== */}
        <div style={s.card}>
          {/* 프로필 이미지 + 닉네임 */}
          <div style={s.profileRow}>
            <div style={s.flowerCircle}>
              {buffer.photoURL || buffer.aiPhotoURL ? (
                <img
                  src={(buffer.photoURL ?? buffer.aiPhotoURL) as string}
                  alt="프로필 이미지"
                  style={s.profileImage}
                />
              ) : (
                <span style={{ fontSize: 30 }}>🌷</span>
              )}
            </div>
            <div style={{ flex: 1 }} ref={nameFieldRef}>
              <span style={s.fieldHint}>닉네임</span>
              <input
                type="text"
                placeholder="이름을 입력해주세요"
                value={buffer.name ?? ""}
                onChange={(e) => !isReadMode && set({ name: e.target.value })}
                readOnly={isReadMode}
                style={s.nameInput}
              />
              {!isReadMode && (
                <div style={s.aiAvatarActions}>
                  <button
                    style={s.aiAvatarBtn}
                    onClick={openAiAvatarModal}
                    disabled={avatarApplying}
                  >
                    AI프로필 이미지 만들기
                  </button>
                  <button
                    type="button"
                    style={s.aiInfoBtn}
                    aria-label="AI 프로필 이미지 안내"
                    onMouseEnter={() => setAiInfoOpen(true)}
                    onMouseLeave={() => setAiInfoOpen(false)}
                    onFocus={() => setAiInfoOpen(true)}
                    onBlur={() => setAiInfoOpen(false)}
                    onClick={() => setAiInfoOpen((prev) => !prev)}
                  >
                    ?
                  </button>
                  {aiInfoOpen && (
                    <div style={s.aiInfoTooltip} role="tooltip">
                      작성하신 프로필을 분석해서 AI가 사용자에게 잘 어울리는 동물 프로필 사진으르
                      만들어 줘요!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>


          {/* 2열 정보 그리드 */}
          <div style={s.infoGrid}>
            <div ref={bornFieldRef}>
              <HeightPickerField
                icon={<IcCrown />}
                label="출생연도"
                value={buffer.born != null ? String(buffer.born) : ""}
                placeholder="선택해주세요."
                suffix="년"
                onClick={() => setBornYearPickerOpen(true)}
                readOnly={isReadMode}
              />
            </div>
            <div ref={heightFieldRef}>
              <HeightPickerField
                icon={<IcHeight />}
                label="키"
                value={buffer.height != null ? String(buffer.height) : ""}
                placeholder="선택해주세요."
                suffix="cm"
                onClick={() => setHeightPickerOpen(true)}
                readOnly={isReadMode}
              />
            </div>
          </div>
          <div style={s.infoGrid}>
            <div ref={residenceFieldRef}>
              <HeightPickerField
                icon={<IcPin />}
                label="거주지"
                value={buffer.residence ?? ""}
                placeholder="선택해주세요."
                onClick={() => setResidencePickerOpen(true)}
                readOnly={isReadMode}
              />
            </div>
            <div ref={jobFieldRef}>
              <HeightPickerField
                icon={<IcBriefcase />}
                label="직업"
                value={buffer.job ?? ""}
                placeholder="선택해주세요."
                onClick={() => setJobPickerOpen(true)}
                readOnly={isReadMode}
              />
            </div>
          </div>
          <div style={s.infoGrid}>
            <div ref={schoolFieldRef}>
              <HeightPickerField
                icon={<IcSchool />}
                label="대학교"
                value={buffer.school ?? ""}
                placeholder="선택해주세요."
                onClick={() => setSchoolPickerOpen(true)}
                readOnly={isReadMode}
              />
            </div>
            <div ref={departmentFieldRef}>
              <InfoField icon={<IcDoc />} label="전공" value={buffer.department ?? ""} placeholder="직접 입력" onChange={(v) => set({ department: v })} readOnly={isReadMode} />
            </div>
          </div>

          {/* 자기소개 */}
          <div style={{ marginTop: 22 }} ref={aboutmeFieldRef}>
            <p style={s.fieldLabel}>자기소개</p>
            <p style={{ ...typo.caption, color: color.gray500, marginBottom: 8 }}>
              자세히 작성할수록 매칭률 UP!
            </p>
            <div style={s.textareaWrap}>
              <textarea
                placeholder="자신에 대해 적어주세요! (최소10자)"
                value={buffer.aboutme ?? ""}
                onChange={(e) => !isReadMode && set({ aboutme: e.target.value })}
                readOnly={isReadMode}
                rows={4}
                style={s.textarea}
              />
              <span style={s.charCount}>{(buffer.aboutme ?? "").length}자</span>
            </div>
          </div>
        </div>

        {/* ==================== 카드 2: MBTI ==================== */}
        <div style={s.card}>
          <p style={s.cardTitle}>MBTI</p>
          <MbtiSlider leftLabel="E" leftSub="외향형" rightLabel="I" rightSub="내향형" value={getMbtiSlider("EI")} onChange={(v) => setMbtiSlider("EI", v)} disabled={isReadMode} />
          <MbtiSlider leftLabel="S" leftSub="감각형" rightLabel="N" rightSub="직관형" value={getMbtiSlider("SN")} onChange={(v) => setMbtiSlider("SN", v)} disabled={isReadMode} />
          <MbtiSlider leftLabel="T" leftSub="사고형" rightLabel="F" rightSub="감정형" value={getMbtiSlider("TF")} onChange={(v) => setMbtiSlider("TF", v)} disabled={isReadMode} />
          <MbtiSlider leftLabel="J" leftSub="판단형" rightLabel="P" rightSub="인식형" value={getMbtiSlider("JP")} onChange={(v) => setMbtiSlider("JP", v)} disabled={isReadMode} />
        </div>

        {/* ==================== 카드 3: 내특징 / 관심사 / 이상형 ==================== */}
        <div style={s.card}>
          <div ref={featuresFieldRef}>
            <TagRow
              icon={<IcPerson />}
              label="내특징"
              sub={(buffer.features?.length ?? 0) > 0 ? '' : "선택해주세요."}
              selected={buffer.features ?? []}
              onClick={isReadMode ? undefined : () =>
                navigateToSelection(
                  `/select?mode=traits&title=${encodeURIComponent("내특징 선택")}&field=myTraits&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(buffer.features ?? []))}`
                )
              }
              disabled={isReadMode}
            />
          </div>
          <div style={s.divider} />
          <div ref={interestsFieldRef}>
            <TagRow
              icon={<IcSparkle />}
              label="관심사"
              sub={(buffer.interests?.length ?? 0) > 0 ? '' : "선택해주세요."}
              selected={buffer.interests ?? []}
              onClick={isReadMode ? undefined : () =>
                navigateToSelection(
                  `/select?mode=interests&title=${encodeURIComponent("관심사 선택")}&field=interests&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(buffer.interests ?? []))}`
                )
              }
              disabled={isReadMode}
            />
          </div>
          <div style={s.divider} />
          <div ref={idealTypeFieldRef}>
            <TagRow
              icon={<IcHeart />}
              label="이상형"
              sub={(buffer.idealType?.length ?? 0) > 0 ? `` : "선택해주세요."}
              selected={buffer.idealType ?? []}
              onClick={isReadMode ? undefined : () =>
                navigateToSelection(
                  `/select?mode=ideal&title=${encodeURIComponent("이상형 선택")}&field=idealTraits&returnTo=/me/edit&current=${encodeURIComponent(JSON.stringify(buffer.idealType ?? []))}`
                )
              }
              disabled={isReadMode}
            />
          </div>
        </div>

        {/* ==================== 카드 4: 선호도 ==================== */}
        <div style={s.card} ref={prefFieldRef}>
          <div style={s.prefGrid}>
            {["contactPref", "cigar", "drinking"].map((key) => (
              <PrefCard
                key={key}
                label={PREF_LABELS[key]}
                value={getPref(key)}
                Icon={getPrefIcon(key)}
                onClick={() => cyclePref(key)}
                disabled={isReadMode}
              />
            ))}
          </div>
          <div style={{ ...s.prefGrid, marginTop: 16 }}>
            {["affectionLevel", "jealousyLevel", "meetingPref"].map((key) => (
              <PrefCard
                key={key}
                label={PREF_LABELS[key]}
                value={getPref(key)}
                Icon={getPrefIcon(key)}
                onClick={() => cyclePref(key)}
                disabled={isReadMode}
              />
            ))}
          </div>
        </div>

        {error && <p style={s.error}>{error}</p>}
      </div>

      {/* 저장 버튼 */}
      {!isReadMode && (
        <div style={s.bottom}>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "저장 중…" : "저장하기"}
          </Button>
        </div>
      )}

      {!isReadMode && (
        <Modal
          open={residencePickerOpen}
          title="거주지 선택"
          cancelText="닫기"
          confirmText="확인"
          onCancel={() => {
            setResidencePickerOpen(false);
            setResidenceQuery("");
          }}
          onConfirm={() => {
            setResidencePickerOpen(false);
            setResidenceQuery("");
          }}
        >
          <div style={s.schoolPickerWrap}>
            <input
              type="text"
              value={residenceQuery}
              onChange={(e) => setResidenceQuery(e.target.value)}
              placeholder="거주지 검색"
              style={s.schoolSearchInput}
            />
            <div style={s.heightPickerList}>
              {filteredResidences.length === 0 ? (
                <div style={s.schoolEmptyText}>검색 결과가 없습니다.</div>
              ) : (
                filteredResidences.map((residence) => {
                  const selected = String(buffer.residence ?? "") === residence;
                  return (
                    <button
                      key={residence}
                      type="button"
                      style={{
                        ...s.heightPickerItem,
                        background: selected ? color.mint50 : color.white,
                        color: selected ? color.mint700 : color.gray800,
                        borderColor: selected ? color.mint200 : color.gray200,
                        fontWeight: selected ? 700 : 500,
                      }}
                      onClick={() => {
                        set({ residence });
                        setResidencePickerOpen(false);
                        setResidenceQuery("");
                      }}
                    >
                      {residence}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {!isReadMode && (
        <Modal
          open={jobPickerOpen}
          title="직업 선택"
          cancelText="닫기"
          confirmText="확인"
          onCancel={() => {
            setJobPickerOpen(false);
            setJobQuery("");
          }}
          onConfirm={() => {
            setJobPickerOpen(false);
            setJobQuery("");
          }}
        >
          <div style={s.schoolPickerWrap}>
            <input
              type="text"
              value={jobQuery}
              onChange={(e) => setJobQuery(e.target.value)}
              placeholder="직업 검색"
              style={s.schoolSearchInput}
            />
            <div style={s.heightPickerList}>
              {filteredJobs.length === 0 ? (
                <div style={s.schoolEmptyText}>검색 결과가 없습니다.</div>
              ) : (
                filteredJobs.map((job) => {
                  const selected = String(buffer.job ?? "") === job;
                  return (
                    <button
                      key={job}
                      type="button"
                      style={{
                        ...s.heightPickerItem,
                        background: selected ? color.mint50 : color.white,
                        color: selected ? color.mint700 : color.gray800,
                        borderColor: selected ? color.mint200 : color.gray200,
                        fontWeight: selected ? 700 : 500,
                      }}
                      onClick={() => {
                        set({ job });
                        setJobPickerOpen(false);
                        setJobQuery("");
                      }}
                    >
                      {job}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {!isReadMode && (
        <Modal
          open={schoolPickerOpen}
          title="대학교 선택"
          cancelText="닫기"
          confirmText="확인"
          onCancel={() => {
            setSchoolPickerOpen(false);
            setSchoolQuery("");
          }}
          onConfirm={() => {
            setSchoolPickerOpen(false);
            setSchoolQuery("");
          }}
        >
          <div style={s.schoolPickerWrap}>
            <input
              type="text"
              value={schoolQuery}
              onChange={(e) => setSchoolQuery(e.target.value)}
              placeholder="학교명 검색"
              style={s.schoolSearchInput}
            />
            <div style={s.heightPickerList}>
              {filteredSchools.length === 0 ? (
                <div style={s.schoolEmptyText}>검색 결과가 없습니다.</div>
              ) : (
                filteredSchools.map((school) => {
                  const selected = String(buffer.school ?? "") === school;
                  return (
                    <button
                      key={school}
                      type="button"
                      style={{
                        ...s.heightPickerItem,
                        background: selected ? color.mint50 : color.white,
                        color: selected ? color.mint700 : color.gray800,
                        borderColor: selected ? color.mint200 : color.gray200,
                        fontWeight: selected ? 700 : 500,
                      }}
                      onClick={() => {
                        set({ school });
                        setSchoolPickerOpen(false);
                        setSchoolQuery("");
                      }}
                    >
                      {school}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Modal>
      )}

      {!isReadMode && (
        <Modal
          open={bornYearPickerOpen}
          title="출생연도 선택"
          cancelText="닫기"
          confirmText="확인"
          onCancel={() => setBornYearPickerOpen(false)}
          onConfirm={() => setBornYearPickerOpen(false)}
        >
          <div style={s.heightPickerList}>
            {BORN_YEAR_OPTIONS.map((year) => {
              const selected = String(buffer.born ?? "") === String(year);
              return (
                <button
                  key={year}
                  type="button"
                  style={{
                    ...s.heightPickerItem,
                    background: selected ? color.mint50 : color.white,
                    color: selected ? color.mint700 : color.gray800,
                    borderColor: selected ? color.mint200 : color.gray200,
                    fontWeight: selected ? 700 : 500,
                  }}
                  onClick={() => {
                    set({ born: String(year) });
                    setBornYearPickerOpen(false);
                  }}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {!isReadMode && (
        <Modal
          open={heightPickerOpen}
          title="키 선택"
          cancelText="닫기"
          confirmText="확인"
          onCancel={() => setHeightPickerOpen(false)}
          onConfirm={() => setHeightPickerOpen(false)}
        >
          <div style={s.heightPickerList}>
            {HEIGHT_OPTIONS.map((option) => {
              const selected = String(buffer.height ?? "") === String(option.value);
              return (
                <button
                  key={option.label}
                  type="button"
                  style={{
                    ...s.heightPickerItem,
                    background: selected ? color.mint50 : color.white,
                    color: selected ? color.mint700 : color.gray800,
                    borderColor: selected ? color.mint200 : color.gray200,
                    fontWeight: selected ? 700 : 500,
                  }}
                  onClick={() => {
                    set({ height: option.value });
                    setHeightPickerOpen(false);
                  }}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {!isReadMode && (
        <Modal
          open={avatarModalOpen}
          title="AI프로필 이미지 만들기"
          description="마음에 드는 이미지를 선택한 뒤 적용하세요."
          cancelText={avatarGenerating || avatarApplying ? "진행 중…" : "닫기"}
          confirmText={avatarApplying ? "적용 중…" : "이 사진으로 적용"}
          onCancel={() => {
            if (avatarGenerating || avatarApplying) return;
            setAvatarModalOpen(false);
          }}
          onConfirm={handleApplyAiAvatar}
        >
          <div style={s.aiModalContent}>
            <div style={s.aiSelectRow}>
              <span style={s.aiSelectLabel}>동물 선택</span>
              <select
                value={selectedAnimal}
                onChange={(e) => setSelectedAnimal(e.target.value)}
                disabled={avatarGenerating || avatarApplying}
                style={s.aiSelect}
              >
                {ANIMAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {avatarGenerating && <p style={s.aiHelperText}>이미지 4장을 생성 중입니다…</p>}
            {!avatarGenerating && avatarCandidates.length > 0 && (
              <div style={s.aiGrid}>
                {avatarCandidates.map((candidate) => {
                  const selected = avatarSelectedIndex === candidate.index;
                  return (
                    <button
                      key={candidate.index}
                      style={{
                        ...s.aiCard,
                        borderColor: selected ? color.mint700 : color.gray200,
                      }}
                      onClick={() => setAvatarSelectedIndex(candidate.index)}
                    >
                      <img
                        src={candidate.imageUrl}
                        alt={`AI 후보 ${candidate.index + 1}`}
                        style={s.aiImage}
                      />
                    </button>
                  );
                })}
              </div>
            )}
            {!avatarGenerating && avatarCandidates.length === 0 && !avatarError && (
              <p style={s.aiHelperText}>생성하기를 눌러 후보 이미지 4장을 만들어주세요.</p>
            )}
            {avatarError && <p style={s.aiErrorText}>{avatarError}</p>}
            <button
              style={s.aiRetryBtn}
              onClick={handleGenerateAiAvatarCandidates}
              disabled={avatarGenerating || avatarApplying}
            >
              {avatarGenerating ? "생성 중…" : avatarCandidates.length > 0 ? "다시 생성" : "생성하기"}
            </button>
          </div>
        </Modal>
      )}
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
  readOnly?: boolean;
}> = ({ icon, label, value, placeholder, suffix, onChange, inputMode = "text", readOnly = false }) => (
  <div style={{ minWidth: 0 }}>
    <p style={s.fieldLabel}>{label}</p>
    <div style={s.infoCard}>
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      <input
        type="text"
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        readOnly={readOnly}
        style={s.infoInput}
      />
      {suffix && value && <span style={s.suffix}>{suffix}</span>}
    </div>
  </div>
);

const HeightPickerField: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  suffix?: string;
  onClick: () => void;
  readOnly?: boolean;
}> = ({ icon, label, value, placeholder, suffix, onClick, readOnly = false }) => (
  <div style={{ minWidth: 0 }}>
    <p style={s.fieldLabel}>{label}</p>
    <button
      type="button"
      style={{
        ...s.infoCard,
        width: "100%",
        cursor: readOnly ? "default" : "pointer",
        textAlign: "left",
        opacity: readOnly ? 0.9 : 1,
      }}
      onClick={readOnly ? undefined : onClick}
      disabled={readOnly}
    >
      <span style={{ flexShrink: 0, display: "flex" }}>{icon}</span>
      <span style={{ ...s.infoInput, color: value ? color.gray900 : color.gray400 }}>
        {value || placeholder}
      </span>
      {suffix && value && <span style={s.suffix}>{suffix}</span>}
    </button>
  </div>
);

/* ================================================================
   TagRow — 내특징 / 관심사 / 이상형
   ================================================================ */

const TagRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  sub: string;
  selected?: string[];
  onClick?: () => void;
  disabled?: boolean;
}> = ({ icon, label, sub, selected = [], onClick, disabled = false }) => (
  <div
    style={{ ...s.tagRow, cursor: disabled ? "default" : "pointer" }}
    onClick={disabled ? undefined : onClick}
  >
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flex: 1, minWidth: 0 }}>
      {icon}
      <div style={{ minWidth: 0 }}>
        <p style={{ ...typo.subheading, color: color.gray900, fontSize: 14 }}>{label}</p>
        <p style={{ ...typo.caption, color: color.gray400 }}>{sub}</p>
        {selected.length > 0 && (
          <div style={s.tagPreviewWrap}>
            {chunkByThree(selected).map((row, rowIdx) => (
              <div key={`row-${rowIdx}`} style={s.tagPreviewRow}>
                {row.map((item) => (
                  <span key={`${item}-${rowIdx}`} style={s.tagPreviewChip}>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {!disabled && <IcChevron />}
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
  disabled?: boolean;
}> = ({ label, value, Icon, onClick, disabled = false }) => (
  <div>
    <p style={s.prefLabel}>{label}</p>
    <button
      style={{ ...s.prefBtn, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.85 : 1 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
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
    overflow: "hidden",
  },
  profileImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
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
  aiAvatarBtn: {
    marginTop: 8,
    padding: "8px 12px",
    borderRadius: radius.full,
    border: `1px solid ${color.mint300}`,
    background: color.mint50,
    color: color.mint700,
    ...typo.caption,
    fontWeight: 700,
    cursor: "pointer",
  },
  aiAvatarActions: {
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  aiInfoBtn: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: color.gray200,
    color: color.gray700,
    ...typo.caption,
    fontWeight: 700,
    lineHeight: "24px",
    textAlign: "center" as const,
    cursor: "help",
    flexShrink: 0,
  },
  aiInfoTooltip: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: 240,
    padding: "10px 12px",
    borderRadius: radius.md,
    background: color.white,
    border: `1px solid ${color.gray200}`,
    boxShadow: shadow.card,
    color: color.gray700,
    ...typo.caption,
    lineHeight: 1.5,
    textAlign: "left" as const,
    zIndex: 5,
  },
  aiModalContent: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    marginTop: 6,
  },
  aiSelectRow: {
    display: "grid",
    gap: 6,
    textAlign: "left" as const,
  },
  aiSelectLabel: {
    ...typo.caption,
    color: color.gray600,
    fontWeight: 700,
  },
  aiSelect: {
    width: "100%",
    border: `1px solid ${color.gray300}`,
    borderRadius: radius.md,
    padding: "8px 10px",
    background: color.white,
    color: color.gray800,
    ...typo.body,
    outline: "none",
  },
  aiHelperText: {
    ...typo.caption,
    color: color.gray500,
  },
  aiGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
  },
  aiCard: {
    borderRadius: radius.md,
    border: `2px solid ${color.gray200}`,
    overflow: "hidden",
    padding: 0,
    background: color.white,
  },
  aiImage: {
    width: "100%",
    aspectRatio: "1 / 1",
    objectFit: "cover" as const,
    display: "block",
  },
  aiRetryBtn: {
    alignSelf: "center",
    padding: "6px 12px",
    borderRadius: radius.full,
    background: color.gray100,
    color: color.gray700,
    ...typo.caption,
    fontWeight: 700,
  },
  aiErrorText: {
    ...typo.caption,
    color: color.danger,
  },
  heightPickerList: {
    maxHeight: 220,
    overflowY: "auto",
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    padding: 6,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  heightPickerItem: {
    minHeight: 44,
    borderRadius: radius.md,
    border: `1px solid ${color.gray200}`,
    ...typo.body,
    cursor: "pointer",
    width: "100%",
  },
  schoolPickerWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  schoolSearchInput: {
    width: "100%",
    height: 40,
    borderRadius: radius.md,
    border: `1px solid ${color.gray300}`,
    padding: "0 12px",
    ...typo.body,
    color: color.gray900,
    background: color.white,
    outline: "none",
    boxSizing: "border-box",
  },
  schoolEmptyText: {
    ...typo.caption,
    color: color.gray500,
    padding: "16px 8px",
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
  tagPreviewWrap: {
    marginTop: 8,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  tagPreviewRow: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  tagPreviewChip: {
    ...typo.caption,
    color: color.mint700,
    background: color.mint50,
    border: `1px solid ${color.mint100}`,
    borderRadius: radius.full,
    padding: "4px 8px",
    lineHeight: "16px",
    whiteSpace: "normal",
    wordBreak: "keep-all",
    overflowWrap: "break-word",
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

function chunkByThree(values: string[]): string[][] {
  const rows: string[][] = [];
  for (let i = 0; i < values.length; i += 3) {
    rows.push(values.slice(i, i + 3));
  }
  return rows;
}
