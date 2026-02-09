import React from "react";
import { color, radius, shadow, typo } from "@gardenus/shared";

interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  cancelText?: string;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  title,
  description,
  cancelText = "취소",
  confirmText = "확인",
  onCancel,
  onConfirm,
  children,
}) => {
  if (!open) return null;

  return (
    <div style={styles.backdrop} onClick={onCancel}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        {description && <p style={styles.description}>{description}</p>}
        {children}
        <div style={styles.buttonRow}>
          <button style={styles.cancelBtn} onClick={onCancel}>
            {cancelText}
          </button>
          <button style={styles.confirmBtn} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: color.backdrop,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "0 24px",
  },
  card: {
    background: color.white,
    borderRadius: radius.xl,
    boxShadow: shadow.modal,
    padding: "28px 24px 20px",
    width: "100%",
    maxWidth: 340,
    textAlign: "center",
  },
  title: {
    ...typo.subheading,
    color: color.gray900,
    marginBottom: 8,
  },
  description: {
    ...typo.body,
    color: color.gray600,
    marginBottom: 20,
    whiteSpace: "pre-line" as const,
  },
  buttonRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: radius.lg,
    background: color.gray200,
    color: color.gray700,
    ...typo.button,
  },
  confirmBtn: {
    flex: 1,
    padding: "12px 0",
    borderRadius: radius.lg,
    background: color.mint500,
    color: color.white,
    ...typo.button,
  },
};
