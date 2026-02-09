import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { color, typo } from "@gardenus/shared";

interface TabItem {
  path: string;
  label: string;
  icon: string; // 임시 텍스트/이모지, 추후 SVG 교체
}

const tabs: TabItem[] = [
  { path: "/", label: "홈", icon: "🏠" },
  { path: "/discover", label: "탐색", icon: "🔍" },
  { path: "/chat", label: "채팅", icon: "💬" },
  { path: "/like", label: "좋아요", icon: "💚" },
  { path: "/me", label: "MY", icon: "👤" },
];

export const TabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <nav style={styles.wrapper}>
      {tabs.map((tab) => {
        const active = isActive(tab.path);
        return (
          <button
            key={tab.path}
            style={{
              ...styles.tab,
              color: active ? color.mint500 : color.gray500,
            }}
            onClick={() => navigate(tab.path)}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span
              style={{
                ...styles.label,
                fontWeight: active ? 600 : 400,
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: "fixed",
    bottom: 0,
    left: "50%",
    transform: "translateX(-50%)",
    width: "100%",
    maxWidth: 430,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    height: 64,
    background: color.white,
    borderTop: `1px solid ${color.gray200}`,
    zIndex: 900,
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
  },
  tab: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    padding: "6px 0",
    background: "transparent",
    minWidth: 56,
  },
  icon: {
    fontSize: 20,
    lineHeight: "24px",
  },
  label: {
    ...typo.caption,
  },
};
