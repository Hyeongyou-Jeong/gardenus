import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/infra/firebase/client";
import { useAuth } from "@/auth/AuthContext";
import { Modal } from "@/ui";
import { color, radius, shadow, typo } from "@gardenus/shared";
import { deleteMatchRequestAndRefund } from "@/lib/match.queries";
import type { MatchRequestStatus } from "@/lib/match.schema";
import { useUserNames } from "@/shared/hooks/useUserNames";

/* ── 타입 ─────────────────────────────────────────────────────── */

interface SentRequestItem {
  id: string;
  toUid: string;
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

const XIcon: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6L6 18" stroke={color.gray600} strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

/* ================================================================
   SentRequestsPage
   ================================================================ */

export const SentRequestsPage: React.FC = () => {
  const { isAuthed, phone, authLoading } = useAuth();
  const [items, setItems] = useState<SentRequestItem[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const nameMap = useUserNames(items.map((i) => i.toUid));

  useEffect(() => {
    if (!isAuthed || !phone) return;

    setListLoading(true);
    const q = query(
      collection(db, "matchRequests"),
      where("fromUid", "==", phone),
      where("status", "==", "PENDING"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SentRequestItem[] = snap.docs.map((d) => {
          const data = d.data();
          const ts = data.createdAt;
          return {
            id: d.id,
            toUid: data.toUid as string,
            status: data.status as MatchRequestStatus,
            createdAt: ts instanceof Timestamp ? ts.toDate() : null,
          };
        });
        setItems(list);
        setListLoading(false);
      },
      (err) => {
        console.error("[SentRequestsPage]", err);
        setListLoading(false);
      },
    );

    return unsub;
  }, [isAuthed, phone]);

  const handleConfirmDelete = async () => {
    const targetId = cancelTarget;
    if (!targetId) return;
    setCancelTarget(null);
    setBusyId(targetId);
    try {
      await deleteMatchRequestAndRefund(targetId);
      setItems((prev) => prev.filter((x) => x.id !== targetId));
    } catch (e) {
      console.error("[SentRequestsPage] delete", e);
      alert("취소에 실패했어요. 잠시 후 다시 시도해주세요.");
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
          <p style={s.emptyTitle}>아직 보낸 요청이 없어요</p>
          <p style={s.emptyDesc}>매칭 페이지에서 마음에 드는 분께 요청해보세요!</p>
          <button style={s.emptyBtn} onClick={() => { window.location.href = "/match"; }}>
            매칭하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={s.list}>
        {items.map((item) => {
          const busy = busyId === item.id;
          const isPending = item.status === "PENDING";

          return (
            <div key={item.id} style={s.card}>
              <div style={s.cardTop}>
                <div style={s.uidBlock}>
                  <span style={s.uidLabel}>상대</span>
                  <span style={s.uidValue}>{nameMap[item.toUid] ?? item.toUid}</span>
                </div>

                <div style={s.rightGroup}>
                  <span style={{ ...s.badge, ...badgeColor(item.status) }}>
                    {STATUS_LABEL[item.status]}
                  </span>
                  {isPending && (
                    <button
                      aria-label="요청 취소"
                      style={{
                        ...s.deleteBtn,
                        ...(busy ? s.btnDisabled : {}),
                      }}
                      disabled={busy}
                      onClick={() => setCancelTarget(item.id)}
                    >
                      <XIcon />
                    </button>
                  )}
                </div>
              </div>
              <span style={s.dateText}>{formatDate(item.createdAt)}</span>
            </div>
          );
        })}
      </div>

      <Modal
        open={cancelTarget !== null}
        title="요청 취소"
        description={"정말 취소하시겠어요?\n사용한 플라워가 환급됩니다."}
        cancelText="아니요"
        confirmText="취소하기"
        confirmDanger
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default SentRequestsPage;

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
  emptyBtn: {
    background: color.mint500,
    color: color.white,
    border: "none",
    borderRadius: radius.full,
    padding: "12px 28px",
    ...typo.button,
    cursor: "pointer",
    boxShadow: shadow.button,
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
  rightGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  badge: {
    ...typo.caption,
    fontWeight: 600,
    borderRadius: radius.full,
    padding: "3px 10px",
    flexShrink: 0,
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    border: `1px solid ${color.gray200}`,
    background: color.white,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "opacity 0.15s",
    flexShrink: 0,
  },
  btnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  dateText: {
    ...typo.caption,
    color: color.gray400,
  },
};
