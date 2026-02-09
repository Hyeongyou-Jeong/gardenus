import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthContext";
import { MatchHallPage } from "@/pages/MatchHallPage";
import { LoginPage } from "@/pages/LoginPage";
import { VerifyPage } from "@/pages/VerifyPage";
import { MePage } from "@/pages/MePage";
import { EditProfilePage } from "@/pages/EditProfilePage";
import { SelectionPage } from "@/pages/SelectionPage";
import { PlaceholderPage } from "@/pages/PlaceholderPage";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MatchHallPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify" element={<VerifyPage />} />
          <Route path="/me" element={<MePage />} />
          <Route path="/me/edit" element={<EditProfilePage />} />
          <Route path="/select" element={<SelectionPage />} />
          <Route path="/discover" element={<PlaceholderPage />} />
          <Route path="/chat" element={<PlaceholderPage />} />
          <Route path="/like" element={<PlaceholderPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
