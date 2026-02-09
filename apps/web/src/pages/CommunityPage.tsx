import React, { useState } from "react";
import { TabBar } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";

/* ================================================================
   Mock 데이터
   ================================================================ */

interface CommunityPost {
  id: number;
  icon: string;
  tags: string[];
  title: string;
  description: string;
  timeAgo: string;
  members: number;
  status: string;
}

const MOCK_POSTS: CommunityPost[] = [
  {
    id: 1,
    icon: "💚",
    tags: ["미팅", "4대4"],
    title: "20-24)소개팅! ❤️",
    description: "서울 사시는 새내기 대학생 분들 같이 모여서 소개팅해여!!",
    timeAgo: "7달전",
    members: 7,
    status: "참가중",
  },
  {
    id: 2,
    icon: "🤝",
    tags: ["모임", "요리/제조"],
    title: "맛집 같이 갈 여성분?",
    description: "서울/경기 쪽 맛집 같이 다녀요",
    timeAgo: "8달전",
    members: 1,
    status: "참가중",
  },
  {
    id: 3,
    icon: "💚",
    tags: ["미팅", "2대2"],
    title: "오타쿠 끼리 미팅!!",
    description: "자기관리 잘하시는분만요~!!",
    timeAgo: "9달전",
    members: 4,
    status: "참가중",
  },
  {
    id: 4,
    icon: "💚",
    tags: ["미팅", "3대3"],
    title: "고려대 남자 3명입니다",
    description: "3대3 미팅할 여자분들 구합니다 참고로 남자 다들 잘 생겼어요!!",
    timeAgo: "9달전",
    members: 6,
    status: "참가중",
  },
  {
    id: 5,
    icon: "💚",
    tags: ["미팅", "3대3"],
    title: "3대3",
    description: "같이 편하게 노실분 구해요 저희는 남자 3이고 자차있어서 데릴러갈게요",
    timeAgo: "10달전",
    members: 4,
    status: "참가중",
  },
  {
    id: 6,
    icon: "💚",
    tags: ["미팅", "3대3"],
    title: "미팅하실 여자분구해요!",
    description: "연세대 남자 동기들입니다 3,4학년이고 2대 2 3대 3 4대4다가능해요",
    timeAgo: "11달전",
    members: 6,
    status: "참가중",
  },
  {
    id: 7,
    icon: "🤝",
    tags: ["모임", "사교/인맥"],
    title: "강남구 사시는 분",
    description: "동네 친구 만들고 싶어요",
    timeAgo: "0년전",
    members: 0,
    status: "참가중",
  },
  {
    id: 8,
    icon: "🤝",
    tags: ["모임", "사교/인맥"],
    title: "서울 경기 북부 모임",
    description: "서울 및 경기 북부에서 가볍게 만나서 서로 알아가는 시간 가져요",
    timeAgo: "1년전",
    members: 11,
    status: "참가중",
  },
  {
    id: 9,
    icon: "🤝",
    tags: ["모임", "스포츠관람"],
    title: "야구 같이 보실 분!",
    description: "주말에 잠실 야구장 가서 같이 응원해요",
    timeAgo: "1년전",
    members: 3,
    status: "참가중",
  },
];

const SUB_TABS = ["전체", "내 모임"];

/* ================================================================
   CommunityPage
   ================================================================ */

export const CommunityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={s.page}>
      {/* ---- 헤더 ---- */}
      <header style={s.header}>
        <div style={s.headerLeft}>
          <h1 style={s.headerTitle}>커뮤니티</h1>
        </div>
        <button style={s.filterBtn}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 6h16M7 12h10M10 18h4"
              stroke={color.gray700}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* ---- 서브탭 ---- */}
      <div style={s.subTabRow}>
        {SUB_TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            style={{
              ...s.subTab,
              color: activeTab === idx ? color.gray900 : color.gray400,
              borderBottom: activeTab === idx ? `2px solid ${color.gray900}` : "2px solid transparent",
              fontWeight: activeTab === idx ? 700 : 400,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ---- 리스트 ---- */}
      <div style={s.list}>
        {MOCK_POSTS.map((post) => (
          <div key={post.id} style={s.card}>
            <div style={s.cardIcon}>
              <span style={{ fontSize: 28 }}>{post.icon}</span>
            </div>

            <div style={s.cardBody}>
              {/* 태그 + 메타 */}
              <div style={s.cardTopRow}>
                <div style={s.tagRow}>
                  {post.tags.map((tag) => (
                    <span key={tag} style={s.tag}>{tag}</span>
                  ))}
                </div>
                <span style={s.meta}>
                  {post.timeAgo} · {post.members}명 {post.status}
                </span>
              </div>

              {/* 제목 */}
              <p style={s.cardTitle}>{post.title}</p>

              {/* 설명 */}
              <p style={s.cardDesc}>{post.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ---- FAB ---- */}
      <button
        style={s.fab}
        onClick={() => alert("준비중")}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill={color.white}>
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
        </svg>
      </button>

      <TabBar />
    </div>
  );
};

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: color.white,
    paddingBottom: 80,
  },

  /* 헤더 */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px 0",
    position: "sticky",
    top: 0,
    background: color.white,
    zIndex: 800,
  },
  headerLeft: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: color.mint600,
  },
  headerSub: {
    ...typo.body,
    color: color.gray900,
    fontWeight: 700,
  },
  filterBtn: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    border: "none",
    cursor: "pointer",
  },

  /* 서브탭 */
  subTabRow: {
    display: "flex",
    gap: 0,
    padding: "0 16px",
    position: "sticky",
    top: 48,
    background: color.white,
    zIndex: 799,
    borderBottom: `1px solid ${color.gray100}`,
  },
  subTab: {
    padding: "10px 16px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    transition: "all 0.15s",
  },

  /* 리스트 */
  list: {
    padding: "8px 0",
  },
  card: {
    display: "flex",
    gap: 14,
    padding: "16px 16px",
    borderBottom: `1px solid ${color.gray100}`,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    background: color.gray50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTopRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  tagRow: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap" as const,
  },
  tag: {
    fontSize: 11,
    fontWeight: 600,
    color: color.mint700,
    background: color.mint50,
    padding: "2px 8px",
    borderRadius: radius.full,
    whiteSpace: "nowrap" as const,
  },
  meta: {
    fontSize: 11,
    color: color.gray400,
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
    marginLeft: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: color.gray900,
    marginBottom: 3,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  cardDesc: {
    ...typo.caption,
    color: color.gray500,
    lineHeight: "18px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical" as any,
  },

  /* FAB */
  fab: {
    position: "fixed",
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: color.mint500,
    border: "none",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 850,
  },
};
