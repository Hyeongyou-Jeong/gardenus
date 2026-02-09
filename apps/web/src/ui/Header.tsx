import React from "react";
import { useNavigate } from "react-router-dom";
import { color, typo } from "@gardenus/shared";

interface HeaderProps {
  title: string;
  showBack?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();

  return (
    <header style={styles.wrapper}>
      {showBack ? (
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke={color.gray900}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <div style={{ width: 40 }} />
      )}
      <h1 style={styles.title}>{title}</h1>
      <div style={{ width: 40 }} />
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    padding: "0 12px",
    background: color.white,
    position: "sticky",
    top: 0,
    zIndex: 800,
  },
  backBtn: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
  },
  title: {
    ...typo.heading,
    color: color.gray900,
    textAlign: "center",
    flex: 1,
  },
};
