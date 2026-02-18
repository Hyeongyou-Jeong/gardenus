import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import { useAuth } from "@/auth/AuthContext";
import { color, radius, shadow, typo } from "@gardenus/shared";
import { updateMatchRequestStatus } from "@/lib/match.queries";
import type { MatchRequestStatus } from "@/lib/match.schema";
import { useUserNames } from "@/shared/hooks/useUserNames";

/* ── 타입 ─────────────────────────────────────────────────────── */

interface ReceivedRequestItem {
  id: string;
  fromUid: string;
  status: MatchRequestStatus;
  createdAt: Date | null;
}

/* ── 헬퍼 ─────────────────────────────────────────────────────── */

function formatDate(d: Date | null): string {
  if (!d) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_LABEL: Record<MatchRequestStatus, string> = {
  PENDING: "대기 중",
  ACCEPTED: "수락됨",
  DECLINED: "거절됨",
  CANCELED: "취소됨",
};

function badgeColor(status: MatchRequestStatus): React.CSSProperties {
  switch (status) {
    case "PENDING":
      return { background: color.mint50, color: color.mint700 };
    case "ACCEPTED":
      return { background: "#e8f5e9", color: color.mint900 };
    case "DECLINED":
    case "CANCELED":
    default:
      return { background: color.gray100, color: color.gray500 };
  }
}

/* ── 아이콘 ───────────────────────────────────────────────────── */

const CheckIcon: React.FC = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M5 13l4 4L19 7" stroke={color.white} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke={color.gray600} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ================================================================
   ReceivedRequestsPage — 내가 받은 매칭 요청 (phone 기준 조회)
   ================================================================ */

export const ReceivedRequestsPage: React.FC = () => {
  const { isAuthed, phone, authLoading } = useAuth();
  const [items, setItems] = useState<ReceivedRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const nameMap = useUserNames(items.map((i) => i.fromUid));

  useEffect(() => {
    if (!isAuthed || !phone) return;

    setListLoading(true);
    const q = query(
      collection(db, "matchRequests"),
      where("toUid", "==", phone),
      where("status", "==", "PENDING"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReceivedRequestItem[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt;
          return {
            id: d.id,
            fromUid: data.fromUid as string,
            status: data.status as MatchRequestStatus,
            createdAt: ts instanceof Timestamp ? ts.toDate() : null,
          };
        });
        setItems(list);
        setListLoading(false);
      },
      (err) => {
        console.error("[ReceivedRequestsPage]", err);
        setListLoading(false);
      },
    );

    return unsub;
  }, [isAuthed, phone]);

  const handleAction = async (itemId: string, status: "ACCEPTED" | "DECLINED") => {
    if (busyId === itemId) return;
    setBusyId(itemId);
    try {
      await updateMatchRequestStatus(itemId, status);
    } catch (err) {
      console.error("[ReceivedRequestsPage] update failed:", err);
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading) {
    return <div style={s.center}><span style={s.muted}>로딩 중…</span></div>;
  }

  if (!isAuthed) {
    return <div style={s.center}><span style={s.muted}>로그인이 필요합니다.</span></div>;
  }

  if (listLoading) {
    return <div style={s.center}><span style={s.muted}>불러오는 중…</span></div>;
  }

  if (items.length === 0) {
    return (
      <div style={s.center}>
        <div style={s.emptyCard}>
          <p style={s.emptyTitle}>아직 받은 요청이 없어요</p>
          <p style={s.emptyDesc}>누군가 요청을 보내면 여기에 나타나요!</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.list}>
      {items.map((item) => {
        const busy = busyId === item.id;
        const isPending = item.status === "PENDING";

        return (
          <div key={item.id} style={s.card}>
            <div style={s.cardTop}>
              <div style={s.uidBlock}>
                <span style={s.uidLabel}>보낸 사람</span>
                <span style={s.uidValue}>{nameMap[item.fromUid] ?? item.fromUid}</span>
              </div>

              {isPending ? (
                <div style={s.actionBtns}>
                  <button
                    aria-label="수락"
                    style={{
                      ...s.acceptBtn,
                      ...(busy ? s.btnDisabled : {}),
                    }}
                    disabled={busy}
                    onClick={() => handleAction(item.id, "ACCEPTED")}
                  >
                    <CheckIcon />
                  </button>
                  <button
                    aria-label="거절"
                    style={{
                      ...s.declineBtn,
                      ...(busy ? s.btnDisabled : {}),
                    }}
                    disabled={busy}
                    onClick={() => handleAction(item.id, "DECLINED")}
                  >
                    <XIcon />
                  </button>
                </div>
              ) : (
                <span style={{ ...s.badge, ...badgeColor(item.status) }}>
                  {STATUS_LABEL[item.status]}
                </span>
              )}
            </div>
            <span style={s.dateText}>{formatDate(item.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ReceivedRequestsPage;

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  center: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 40,
    paddingLeft: 20,
    paddingRight: 20,
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
    marginBottom: 20,
  },

  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    padding: "8px 16px 16px",
  },

  card: {
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.lg,
    boxShadow: shadow.card,
    padding: "14px 16px",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  uidBlock: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flex: 1,
  },
  uidLabel: {
    ...typo.caption,
    color: color.gray400,
    flexShrink: 0,
  },
  uidValue: {
    ...typo.body,
    color: color.gray800,
    fontWeight: 600,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
    maxWidth: 180,
  },
  badge: {
    ...typo.caption,
    fontWeight: 600,
    borderRadius: radius.full,
    padding: "3px 10px",
    flexShrink: 0,
  },
  dateText: {
    ...typo.caption,
    color: color.gray400,
  },

  actionBtns: {
    display: "flex",
    gap: 8,
    flexShrink: 0,
  },
  acceptBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: "none",
    background: color.mint500,
    boxShadow: shadow.button,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  declineBtn: {
    width: 40,
    height: 40,
    borderRadius: "50%",
    border: `1px solid ${color.gray300}`,
    background: color.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};
