import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { color, radius, typo } from "@gardenus/shared";
import {
  TRAIT_CATEGORIES,
  type TraitCategory,
} from "@/shared/constants/traits";
import {
  INTEREST_CATEGORIES,
  type InterestCategory,
} from "@/shared/constants/interests";

/* ================================================================
   모드별 카테고리 데이터
   ================================================================ */

type Category = TraitCategory | InterestCategory;

function getCategories(mode: string): Category[] {
  switch (mode) {
    case "traits":
    case "ideal":
      return TRAIT_CATEGORIES;
    case "interests":
      return INTEREST_CATEGORIES;
    default:
      return TRAIT_CATEGORIES;
  }
}

const MAX_SELECT = 5;

/* ================================================================
   SelectionPage
   ================================================================ */

export const SelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const mode = params.get("mode") ?? "traits";
  const title = params.get("title") ?? "선택";
  const field = params.get("field") ?? "myTraits";
  const returnTo = params.get("returnTo") ?? "/me/edit";

  /* 기존 선택값 복원 */
  const initial = useMemo(() => {
    try {
      const raw = params.get("current");
      if (raw) return JSON.parse(decodeURIComponent(raw)) as string[];
    } catch { /* ignore */ }
    return [] as string[];
  }, [params]);

  const categories = useMemo(() => getCategories(mode), [mode]);
  const [selected, setSelected] = useState<string[]>(initial);
  const [search, setSearch] = useState("");
  const [limitMsg, setLimitMsg] = useState("");

  /* ---- 토글 ---- */
  const toggle = (label: string) => {
    setLimitMsg("");
    setSelected((prev) => {
      if (prev.includes(label)) {
        return prev.filter((v) => v !== label);
      }
      if (prev.length >= MAX_SELECT) {
        setLimitMsg(`최대 ${MAX_SELECT}개까지 선택할 수 있습니다.`);
        return prev;
      }
      return [...prev, label];
    });
  };

  /* ---- 검색 필터 ---- */
  const keyword = search.trim().toLowerCase();
  const filteredCategories = useMemo(() => {
    if (!keyword) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        options: cat.options.filter((o) =>
          o.toLowerCase().includes(keyword)
        ),
      }))
      .filter((cat) => cat.options.length > 0);
  }, [categories, keyword]);

  /* ---- 확인 ---- */
  const handleConfirm = () => {
    const encoded = encodeURIComponent(JSON.stringify(selected));
    navigate(`${returnTo}?field=${field}&values=${encoded}`, {
      replace: true,
    });
  };

  return (
    <div style={s.page}>
      {/* ---- 헤더 ---- */}
      <header style={s.header}>
        <button style={s.backBtn} onClick={() => navigate(-1)}>
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
        <h1 style={s.headerTitle}>{title}</h1>
        <button style={s.confirmBtn} onClick={handleConfirm}>
          확인
        </button>
      </header>

      {/* ---- 검색 ---- */}
      <div style={s.searchWrap}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill={color.gray400} style={{ flexShrink: 0 }}>
          <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          placeholder="검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={s.searchInput}
        />
        {search && (
          <button style={s.clearBtn} onClick={() => setSearch("")}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill={color.gray400}>
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        )}
      </div>

      {/* ---- 선택 현황 ---- */}
      <div style={s.statusBar}>
        <span style={s.statusText}>
          선택된 항목{" "}
          <strong style={{ color: color.mint600 }}>
            ({selected.length}/{MAX_SELECT})
          </strong>
        </span>
        {limitMsg && <span style={s.limitMsg}>{limitMsg}</span>}
      </div>

      {/* ---- 선택된 chip 미리보기 ---- */}
      {selected.length > 0 && (
        <div style={s.selectedRow}>
          {selected.map((v) => (
            <button key={v} style={s.selectedChip} onClick={() => toggle(v)}>
              {v}
              <svg width="14" height="14" viewBox="0 0 24 24" fill={color.white} style={{ marginLeft: 4 }}>
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* ---- 카테고리별 칩 리스트 ---- */}
      <div style={s.body}>
        {filteredCategories.map((cat) => (
          <div key={cat.title} style={s.section}>
            <p style={s.sectionTitle}>{cat.title}</p>
            <div style={s.chipGrid}>
              {cat.options.map((opt) => {
                const active = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    style={{
                      ...s.chip,
                      background: active ? color.mint50 : color.white,
                      borderColor: active ? color.mint500 : color.gray300,
                      color: active ? color.mint700 : color.gray700,
                    }}
                  >
                    {active && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={color.mint600} style={{ marginRight: 4, flexShrink: 0 }}>
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                      </svg>
                    )}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <p style={s.emptyText}>검색 결과가 없습니다.</p>
        )}
      </div>
    </div>
  );
};

/* ================================================================
   스타일
   ================================================================ */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: color.white,
  },

  /* 헤더 */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    height: 56,
    padding: "0 12px",
    position: "sticky",
    top: 0,
    background: color.white,
    zIndex: 800,
    borderBottom: `1px solid ${color.gray100}`,
  },
  backBtn: {
    width: 40,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "transparent",
    cursor: "pointer",
  },
  headerTitle: {
    ...typo.subheading,
    color: color.gray900,
    textAlign: "center",
    flex: 1,
  },
  confirmBtn: {
    ...typo.subheading,
    color: color.mint600,
    background: "transparent",
    padding: "8px 12px",
    cursor: "pointer",
  },

  /* 검색 */
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "12px 16px 0",
    padding: "10px 14px",
    borderRadius: radius.lg,
    background: color.gray50,
    border: `1px solid ${color.gray200}`,
  },
  searchInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    outline: "none",
    ...typo.body,
    color: color.gray900,
  },
  clearBtn: {
    display: "flex",
    background: "transparent",
    cursor: "pointer",
    padding: 0,
  },

  /* 선택 현황 */
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px 4px",
  },
  statusText: {
    ...typo.body,
    color: color.gray700,
  },
  limitMsg: {
    ...typo.caption,
    color: color.danger,
  },

  /* 선택된 chip row */
  selectedRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    padding: "8px 16px",
  },
  selectedChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: radius.full,
    background: color.mint500,
    color: color.white,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
  },

  /* 본문 */
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px 32px",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    ...typo.caption,
    fontWeight: 700,
    color: color.gray500,
    textTransform: "uppercase" as const,
    marginBottom: 10,
  },
  chipGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 14px",
    borderRadius: radius.full,
    border: "1.5px solid",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  },

  emptyText: {
    ...typo.body,
    color: color.gray400,
    textAlign: "center",
    marginTop: 40,
  },
};
