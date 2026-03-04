# Gardenus

Korean Meeting Platform

## 프로젝트 구조

```
gardenus/
├── packages/
│   └── shared/                ← 크로스플랫폼 공유 패키지 (web / android / ios)
│       └── src/
│           ├── styles/
│           │   └── tokens.ts      디자인 토큰 (색상, 라운드, 그림자, 타이포)
│           └── index.ts           barrel export
├── apps/
│   └── web/                   ← React + Vite + TypeScript SPA
│       └── src/
│           ├── auth/              AuthContext.tsx (전역 인증 상태)
│           ├── domains/           도메인별 repo (Firebase 호출 계층)
│           │   ├── auth/            auth.repo.ts
│           │   ├── match/           match.repo.ts
│           │   └── user/            user.repo.ts
│           ├── infra/
│           │   └── firebase/        client.ts (Firebase 초기화)
│           ├── pages/             페이지 컴포넌트
│           │   ├── MatchHallPage.tsx
│           │   ├── LoginPage.tsx
│           │   ├── VerifyPage.tsx
│           │   └── MePage.tsx
│           ├── styles/            global.css
│           ├── ui/                공통 React UI (Modal, TabBar, Button, Header)
│           ├── App.tsx
│           └── main.tsx
├── package.json               npm workspaces 루트
└── README.md
```

## 기술 스택

- **React 19** + **Vite 6** + **TypeScript 5.7**
- **react-router-dom** (SPA 라우팅)
- **Firebase** (Cloud Firestore + Phone Auth) — 현재 mock 구현, 2차에서 연동
- **npm workspaces** 모노레포
- `@gardenus/shared` — 플랫폼 공유 디자인 토큰/타입/유틸

## 로컬 실행

- 실행 폴더: `C:\dev\gardenus` (레포 루트)
- 권장 Node 버전: LTS (v20+)
- 설치: `npm install`
- 실행: `npm run dev -w @gardenus/web`

## Firebase 설정 (선택)

`apps/web/.env` 파일을 생성하고 Firebase 설정값을 입력하세요.
`apps/web/.env.example`을 참고하세요. 현재는 mock 데이터로 동작합니다.

## 라우팅

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/` | MatchHallPage | 메인 매칭 화면 |
| `/login` | LoginPage | 전화번호 입력 |
| `/verify` | VerifyPage | OTP 인증 |
| `/me` | MePage | 마이 프로필 |
