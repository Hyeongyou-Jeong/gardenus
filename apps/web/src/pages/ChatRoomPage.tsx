import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Modal } from "@/ui";
import { color, radius, typo } from "@gardenus/shared";
import { getFunctions, httpsCallable } from "firebase/functions";
import { firebaseApp } from "@/infra/firebase/client";
import { db } from "@/infra/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import {
  makeRoomId,
  ensureRoom,
  subscribeMessages,
  sendMessage,
  type ChatMessage,
} from "@/domains/chat/chat.repo";
import { useUserNames } from "@/domains/user/useUserNames";

/* ── 아이콘 ───────────────────────────────────────────────────── */

const BackIcon: React.FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M15 19l-7-7 7-7" stroke={color.gray800} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SendIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke={color.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={color.white} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MoreIcon: React.FC = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="5" cy="12" r="1.6" fill={color.gray700} />
    <circle cx="12" cy="12" r="1.6" fill={color.gray700} />
    <circle cx="19" cy="12" r="1.6" fill={color.gray700} />
  </svg>
);

/* ── 시간 포맷 ────────────────────────────────────────────────── */

function formatTime(d: Date | null): string {
  if (!d) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ================================================================
   ChatRoomPage
   ================================================================ */

export const ChatRoomPage: React.FC = () => {
  const { otherUid: rawOther } = useParams<{ otherUid: string }>();
  const otherUid = rawOther ? decodeURIComponent(rawOther) : "";
  const navigate = useNavigate();
  const { isAuthed, userId, authLoading } = useAuth();

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [pokeModalOpen, setPokeModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<"leave" | "poke" | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [roomStatus, setRoomStatus] = useState<"ACTIVE" | "EXPIRED">("ACTIVE");
  const [roomExpiredBy, setRoomExpiredBy] = useState<string | null>(null);
  const nameMap = useUserNames(otherUid ? [otherUid] : []);
  const otherName = nameMap[otherUid] ?? otherUid;

  const bottomRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef("");
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const functions = getFunctions(firebaseApp, "asia-northeast3");
  const leaveChatRoomCallable = httpsCallable<{ roomId: string }, { ok: boolean }>(
    functions,
    "leaveChatRoom",
  );
  const pokeChatRoomCallable = httpsCallable<
    { roomId: string },
    { ok: boolean; remaining: number; retryAt?: number }
  >(functions, "pokeChatRoom");
  const isRoomExpired = roomStatus === "EXPIRED";
  const closedByOther = isRoomExpired && roomExpiredBy != null && roomExpiredBy !== userId;

  /* ── room 준비 + 메시지 구독 ── */
  useEffect(() => {
    if (!isAuthed || !userId || !otherUid) return;

    const { roomId, a, b } = makeRoomId(userId, otherUid);
    roomIdRef.current = roomId;

    let unsub: (() => void) | undefined;
    let unsubRoom: (() => void) | undefined;

    ensureRoom(roomId, [a, b])
      .then(() => {
        setRoomReady(true);
        unsubRoom = onSnapshot(
          doc(db, "chatRooms", roomId),
          (snap) => {
            const data = snap.data();
            if (!data) return;
            setRoomStatus(data.status === "EXPIRED" ? "EXPIRED" : "ACTIVE");
            setRoomExpiredBy(typeof data.expiredBy === "string" ? data.expiredBy : null);
          },
          (e) => console.error("[ChatRoomPage] room snapshot", e),
        );
        unsub = subscribeMessages({
          roomId,
          onChange: setMsgs,
          onError: (e) => console.error("[ChatRoomPage]", e),
        });
      })
      .catch((e) => console.error("[ChatRoomPage] ensureRoom", e));

    return () => {
      unsub?.();
      unsubRoom?.();
    };
  }, [isAuthed, userId, otherUid]);

  /* ── 스크롤 하단 유지 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuWrapRef.current) return;
      if (!menuWrapRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ── 전송 ── */
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !userId || isRoomExpired) return;
    setSending(true);
    try {
      await sendMessage({
        roomId: roomIdRef.current,
        senderUid: userId,
        text: trimmed,
      });
      setText("");
    } catch (e) {
      console.error("[ChatRoomPage] send", e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleLeaveChatRoom = async () => {
    if (!roomIdRef.current || actionLoading) return;
    setActionLoading("leave");
    try {
      await leaveChatRoomCallable({ roomId: roomIdRef.current });
      setToast("채팅방을 나갔습니다.");
      navigate("/chat");
    } catch (error) {
      console.error("[ChatRoomPage] leaveChatRoom", error);
      setToast("채팅방 나가기에 실패했어요.");
    } finally {
      setActionLoading(null);
      setLeaveModalOpen(false);
    }
  };

  const formatRetryAt = (retryAt?: number): string => {
    if (!retryAt) return "-";
    const d = new Date(retryAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handlePokeChatRoom = async () => {
    if (!roomIdRef.current || actionLoading) return;
    setActionLoading("poke");
    try {
      const result = await pokeChatRoomCallable({ roomId: roomIdRef.current });
      const data = result.data;
      if (data.ok) {
        setToast(`콕 찔렀어요! (남은 횟수: ${data.remaining}/3)`);
      } else {
        setToast(
          `48시간 동안 3회까지 가능해요. (다음 가능 시간: ${formatRetryAt(data.retryAt)})`,
        );
      }
    } catch (error) {
      console.error("[ChatRoomPage] pokeChatRoom", error);
      setToast("콕 찌르기에 실패했어요.");
    } finally {
      setActionLoading(null);
      setPokeModalOpen(false);
    }
  };

  /* ── 로딩/비로그인 ── */
  if (authLoading) {
    return <div style={s.loadWrap}><span style={s.muted}>로딩 중…</span></div>;
  }
  if (!isAuthed || !userId) {
    return <div style={s.loadWrap}><span style={s.muted}>로그인이 필요합니다.</span></div>;
  }

  return (
    <div style={s.page}>
      {/* ── 헤더 ── */}
      <div style={s.header}>
        <button style={s.backBtn} onClick={() => navigate("/chat")} aria-label="뒤로">
          <BackIcon />
        </button>
        <span style={s.headerTitle}>{otherName}</span>
        <div ref={menuWrapRef} style={s.menuWrap}>
          <button
            style={s.menuBtn}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="메뉴"
          >
            <MoreIcon />
          </button>
          {menuOpen && (
            <div style={s.menuDropdown}>
              <button
                style={s.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setLeaveModalOpen(true);
                }}
              >
                채팅방 나가기
              </button>
              <button
                style={s.menuItem}
                onClick={() => {
                  setMenuOpen(false);
                  setPokeModalOpen(true);
                }}
              >
                콕 찌르기
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── 메시지 영역 ── */}
      <div style={s.body}>
        {closedByOther && (
          <div style={s.closedBanner}>상대방이 대화를 종료했습니다</div>
        )}
        {!roomReady ? (
          <div style={s.centerMsg}><span style={s.muted}>준비 중…</span></div>
        ) : msgs.length === 0 ? (
          <div style={s.centerMsg}><span style={s.muted}>첫 메시지를 보내보세요!</span></div>
        ) : (
          msgs.map((m) => {
            const mine = m.senderUid === userId;
            return (
              <div key={m.id} style={{ ...s.row, justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div style={mine ? s.bubbleMine : s.bubbleOther}>
                  <span style={s.bubbleText}>{m.text}</span>
                  <span style={s.bubbleTime}>{formatTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── 입력 ── */}
      <div style={s.inputBar}>
        <input
          style={{ ...s.input, ...(isRoomExpired ? s.inputDisabled : {}) }}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isRoomExpired ? "대화가 종료되어 입력할 수 없습니다." : "메시지를 입력하세요"}
          disabled={isRoomExpired}
        />
        <button
          style={{
            ...s.sendBtn,
            opacity: sending || !text.trim() || isRoomExpired ? 0.4 : 1,
            ...(isRoomExpired ? s.sendBtnDisabled : {}),
          }}
          onClick={handleSend}
          disabled={sending || !text.trim() || isRoomExpired}
          aria-label="전송"
        >
          <SendIcon />
        </button>
      </div>

      <Modal
        open={leaveModalOpen}
        title="채팅방 나가기"
        description="정말 나가시겠습니까?"
        cancelText="취소"
        confirmText={actionLoading === "leave" ? "나가는 중…" : "나가기"}
        confirmDanger
        onCancel={() => actionLoading !== "leave" && setLeaveModalOpen(false)}
        onConfirm={handleLeaveChatRoom}
      />

      <Modal
        open={pokeModalOpen}
        title="콕 찌르기"
        description={"상대에게 알람을 보낼까요?\n48시간 동안 최대 3회"}
        cancelText="취소"
        confirmText={actionLoading === "poke" ? "전송 중…" : "보내기"}
        onCancel={() => actionLoading !== "poke" && setPokeModalOpen(false)}
        onConfirm={handlePokeChatRoom}
      />

      {toast && <div style={s.toast}>{toast}</div>}
    </div>
  );
};

export default ChatRoomPage;

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxWidth: 430,
    margin: "0 auto",
    background: color.gray50,
  },

  /* ── 헤더 ── */
  header: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "12px 12px 12px 8px",
    background: color.white,
    borderBottom: `1px solid ${color.gray200}`,
    flexShrink: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    padding: 4,
  },
  headerTitle: {
    ...typo.subheading,
    color: color.gray900,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
    whiteSpace: "nowrap" as const,
  },
  menuWrap: {
    marginLeft: "auto",
    position: "relative",
  },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    border: "none",
    background: "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  menuDropdown: {
    position: "absolute",
    right: 0,
    top: 36,
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.md,
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    minWidth: 150,
    zIndex: 20,
    overflow: "hidden",
  },
  menuItem: {
    width: "100%",
    textAlign: "left" as const,
    padding: "10px 12px",
    background: color.white,
    border: "none",
    ...typo.body,
    color: color.gray800,
    cursor: "pointer",
  },

  /* ── 메시지 영역 ── */
  body: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "16px 14px 8px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  centerMsg: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  muted: {
    ...typo.body,
    color: color.gray400,
  },
  loadWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
  },
  closedBanner: {
    ...typo.caption,
    color: color.gray600,
    background: color.gray100,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.full,
    padding: "8px 12px",
    alignSelf: "center",
    marginBottom: 6,
  },

  row: {
    display: "flex",
  },
  bubbleMine: {
    maxWidth: "75%",
    background: color.mint50,
    borderRadius: `${radius.lg} ${radius.lg} 4px ${radius.lg}`,
    padding: "10px 14px",
  },
  bubbleOther: {
    maxWidth: "75%",
    background: color.white,
    border: `1px solid ${color.gray200}`,
    borderRadius: `${radius.lg} ${radius.lg} ${radius.lg} 4px`,
    padding: "10px 14px",
  },
  bubbleText: {
    ...typo.body,
    color: color.gray900,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  },
  bubbleTime: {
    ...typo.caption,
    color: color.gray400,
    marginTop: 4,
    display: "block",
    textAlign: "right" as const,
    fontSize: 11,
  },

  /* ── 입력 바 ── */
  inputBar: {
    display: "flex",
    gap: 8,
    padding: "10px 12px",
    background: color.white,
    borderTop: `1px solid ${color.gray200}`,
    flexShrink: 0,
    paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
  },
  input: {
    flex: 1,
    border: `1px solid ${color.gray200}`,
    borderRadius: radius.full,
    padding: "10px 16px",
    ...typo.body,
    outline: "none",
  },
  inputDisabled: {
    background: color.gray100,
    color: color.gray500,
    cursor: "default",
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: color.mint500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    transition: "opacity 0.15s",
  },
  sendBtnDisabled: {
    cursor: "default",
  },
  toast: {
    position: "fixed",
    left: "50%",
    bottom: 22,
    transform: "translateX(-50%)",
    background: "rgba(35,35,35,0.92)",
    color: color.white,
    padding: "10px 14px",
    borderRadius: radius.full,
    ...typo.caption,
    zIndex: 1200,
    maxWidth: "90vw",
    whiteSpace: "pre-wrap" as const,
    textAlign: "center" as const,
  },
};
