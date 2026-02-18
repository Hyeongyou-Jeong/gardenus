import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { TabBar } from "@/ui";
import { color, radius, shadow, typo } from "@gardenus/shared";
import {
  fetchAcceptedMatchesForMe,
  type AcceptedMatchItem,
} from "@/lib/match.queries";
import { useUserNames } from "@/shared/hooks/useUserNames";

/* ── 헬퍼 ─────────────────────────────────────────────────────── */

function formatDate(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const Chevron: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
    <path d="M9 5l7 7-7 7" stroke={color.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ================================================================
   ChatListPage — ACCEPTED 매칭 목록 (채팅 진입점)
   ================================================================ */

export const ChatListPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthed, phone, authLoading } = useAuth();
  const [items, setItems] = useState<AcceptedMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const nameMap = useUserNames(items.map((i) => i.otherUid));

  useEffect(() => {
    if (!isAuthed || !phone) return;

    let cancelled = false;
    setLoading(true);
    fetchAcceptedMatchesForMe(phone)
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => console.error("[ChatListPage]", err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [isAuthed, phone]);

  /* ── 로딩 ── */
  if (authLoading) {
    return (
      <div style={s.page}>
        <div style={s.header}><h1 style={s.title}>채팅</h1></div>
        <div style={s.center}><span style={s.muted}>로딩 중…</span></div>
        <TabBar />
      </div>
    );
  }

  /* ── 비로그인 ── */
  if (!isAuthed) {
    return (
      <div style={s.page}>
        <div style={s.header}><h1 style={s.title}>채팅</h1></div>
        <div style={s.center}><span style={s.muted}>로그인이 필요합니다.</span></div>
        <TabBar />
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>채팅</h1>
        <p style={s.subtitle}>매칭된 상대와 대화를 시작할 수 있어요</p>
      </div>

      {loading ? (
        <div style={s.center}><span style={s.muted}>불러오는 중…</span></div>
      ) : items.length === 0 ? (
        <div style={s.center}>
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>아직 매칭이 없어요</p>
            <p style={s.emptyDesc}>매칭이 성사되면 여기에서 대화할 수 있어요!</p>
          </div>
        </div>
      ) : (
        <div style={s.list}>
          {items.map((item) => (
            <button key={item.id} style={s.card} onClick={() => navigate(`/chat/${encodeURIComponent(item.otherUid)}`)}>
              <div style={s.avatar}>💬</div>
              <div style={s.cardBody}>
                <span style={s.otherUid}>{nameMap[item.otherUid] ?? item.otherUid}</span>
                <span style={s.dateText}>{formatDate(item.createdAt)}</span>
              </div>
              <Chevron />
            </button>
          ))}
        </div>
      )}

      <TabBar />
    </div>
  );
};

export default ChatListPage;

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: color.white,
    paddingBottom: 80,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "20px 20px 12px",
  },
  title: {
    ...typo.heading,
    color: color.gray900,
    marginBottom: 4,
  },
  subtitle: {
    ...typo.caption,
    color: color.gray500,
  },
  center: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 48,
  },
  muted: {
    ...typo.body,
    color: color.gray400,
  },

  emptyCard: {
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.xl,
    boxShadow: shadow.card,
    padding: "32px 24px",
    textAlign: "center" as const,
    maxWidth: 320,
  },
  emptyTitle: {
    ...typo.subheading,
    color: color.gray800,
    marginBottom: 8,
  },
  emptyDesc: {
    ...typo.body,
    color: color.gray500,
  },

  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    padding: "0 16px",
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 16px",
    background: color.white,
    border: "none",
    borderBottom: `1px solid ${color.gray100}`,
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
    transition: "background 0.12s",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: color.mint50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 22,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    minWidth: 0,
  },
  otherUid: {
    ...typo.body,
    color: color.gray900,
    fontWeight: 600,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  dateText: {
    ...typo.caption,
    color: color.gray400,
  },
};
