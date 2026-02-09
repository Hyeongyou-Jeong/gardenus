import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";

/* ---- Lazy imports ---- */
const MatchHallPage = lazy(() =>
  import("@/pages/MatchHallPage").then((m) => ({ default: m.MatchHallPage }))
);
const LoginPage = lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
);
const VerifyPage = lazy(() =>
  import("@/pages/VerifyPage").then((m) => ({ default: m.VerifyPage }))
);
const MePage = lazy(() =>
  import("@/pages/MePage").then((m) => ({ default: m.MePage }))
);
const EditProfilePage = lazy(() =>
  import("@/pages/EditProfilePage").then((m) => ({
    default: m.EditProfilePage,
  }))
);
const SelectionPage = lazy(() =>
  import("@/pages/SelectionPage").then((m) => ({
    default: m.SelectionPage,
  }))
);
const PlaceholderPage = lazy(() =>
  import("@/pages/PlaceholderPage").then((m) => ({
    default: m.PlaceholderPage,
  }))
);
const InquiryPage = lazy(() =>
  import("@/pages/InquiryPage").then((m) => ({
    default: m.InquiryPage,
  }))
);

/* ---- Error Boundary ---- */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, fontFamily: "monospace" }}>
          <h2 style={{ color: "red" }}>렌더링 에러 발생</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
            {this.state.error.message}
          </pre>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 11, color: "#666" }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
            style={{ marginTop: 16, padding: "8px 16px" }}
          >
            새로고침
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Loading = () => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      color: "#9e9e9e",
    }}
  >
    로딩 중…
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<MatchHallPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/verify" element={<VerifyPage />} />
              <Route path="/me" element={<MePage />} />
              <Route path="/me/edit" element={<EditProfilePage />} />
              <Route path="/select" element={<SelectionPage />} />
              <Route path="/inquiry" element={<InquiryPage />} />
              <Route path="/discover" element={<PlaceholderPage />} />
              <Route path="/chat" element={<PlaceholderPage />} />
              <Route path="/like" element={<PlaceholderPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
