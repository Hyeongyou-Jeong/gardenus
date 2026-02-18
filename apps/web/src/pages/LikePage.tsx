import React, { useState } from "react";
import { TabBar } from "@/ui";
import { color, typo } from "@gardenus/shared";
import { SentRequestsPage } from "./SentRequestsPage";
import { ReceivedRequestsPage } from "./ReceivedRequestsPage";

const TABS = ["받은 요청", "보낸 요청"];

export const LikePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div style={s.page}>
      {/* ---- 탭 헤더 ---- */}
      <div style={s.tabRow}>
        {TABS.map((tab, idx) => (
          <button
            key={tab}
            onClick={() => setActiveTab(idx)}
            style={{
              ...s.tab,
              color: activeTab === idx ? color.gray900 : color.gray400,
              fontWeight: activeTab === idx ? 800 : 500,
              textDecoration: activeTab === idx ? "underline" : "none",
              textUnderlineOffset: 4,
              textDecorationThickness: activeTab === idx ? 2 : undefined,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ---- 탭 콘텐츠 ---- */}
      {activeTab === 0 ? (
        <ReceivedRequestsPage />
      ) : (
        <SentRequestsPage />
      )}

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
    display: "flex",
    flexDirection: "column",
  },
  tabRow: {
    display: "flex",
    gap: 16,
    padding: "18px 20px 12px",
    position: "sticky",
    top: 0,
    background: color.white,
    zIndex: 800,
  },
  tab: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 18,
    padding: 0,
  },
  emptyWrap: {
    flex: 1,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: 24,
  },
  emptyText: {
    ...typo.body,
    color: color.gray500,
  },
};
