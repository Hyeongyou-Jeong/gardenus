import React from "react";
import { useLocation } from "react-router-dom";
import { Header, TabBar } from "@/ui";
import { color, typo } from "@gardenus/shared";

const nameMap: Record<string, string> = {
  "/discover": "탐색",
  "/chat": "채팅",
  "/like": "좋아요",
};

export const PlaceholderPage: React.FC = () => {
  const { pathname } = useLocation();
  const title = nameMap[pathname] ?? "페이지";

  return (
    <div style={styles.page}>
      <Header title={title} />
      <div style={styles.body}>
        <p style={styles.emoji}>🚧</p>
        <p style={styles.text}>준비중입니다</p>
      </div>
      <TabBar />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    paddingBottom: 80,
    background: color.white,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "calc(100vh - 56px - 64px)",
    gap: 12,
  },
  emoji: {
    fontSize: 48,
  },
  text: {
    ...typo.subheading,
    color: color.gray500,
  },
};
