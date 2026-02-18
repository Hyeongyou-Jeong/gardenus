import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { color, radius, typo } from "@gardenus/shared";
import {
  makeRoomId,
  ensureRoom,
  subscribeMessages,
  sendMessage,
  type ChatMessage,
} from "@/lib/chat.repo";
import { useUserNames } from "@/shared/hooks/useUserNames";

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
  const { isAuthed, phone, authLoading } = useAuth();

  const [msgs, setMsgs] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const nameMap = useUserNames(otherUid ? [otherUid] : []);
  const otherName = nameMap[otherUid] ?? otherUid;

  const bottomRef = useRef<HTMLDivElement>(null);
  const roomIdRef = useRef("");

  /* ── room 준비 + 메시지 구독 ── */
  useEffect(() => {
    if (!isAuthed || !phone || !otherUid) return;

    const { roomId, a, b } = makeRoomId(phone, otherUid);
    roomIdRef.current = roomId;

    let unsub: (() => void) | undefined;

    ensureRoom(roomId, [a, b])
      .then(() => {
        setRoomReady(true);
        unsub = subscribeMessages({
          roomId,
          onChange: setMsgs,
          onError: (e) => console.error("[ChatRoomPage]", e),
        });
      })
      .catch((e) => console.error("[ChatRoomPage] ensureRoom", e));

    return () => unsub?.();
  }, [isAuthed, phone, otherUid]);

  /* ── 스크롤 하단 유지 ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  /* ── 전송 ── */
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !phone) return;
    setSending(true);
    try {
      await sendMessage({
        roomId: roomIdRef.current,
        senderUid: phone,
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

  /* ── 로딩/비로그인 ── */
  if (authLoading) {
    return <div style={s.loadWrap}><span style={s.muted}>로딩 중…</span></div>;
  }
  if (!isAuthed || !phone) {
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
      </div>

      {/* ── 메시지 영역 ── */}
      <div style={s.body}>
        {!roomReady ? (
          <div style={s.centerMsg}><span style={s.muted}>준비 중…</span></div>
        ) : msgs.length === 0 ? (
          <div style={s.centerMsg}><span style={s.muted}>첫 메시지를 보내보세요!</span></div>
        ) : (
          msgs.map((m) => {
            const mine = m.senderUid === phone;
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
          style={s.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
        />
        <button
          style={{ ...s.sendBtn, opacity: sending || !text.trim() ? 0.4 : 1 }}
          onClick={handleSend}
          disabled={sending || !text.trim()}
          aria-label="전송"
        >
          <SendIcon />
        </button>
      </div>
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
};
