import { BrowserRouter, Route, Routes } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import Layout from "./components/Layout";
import { AuthProvider } from "./context/AuthContext";
import { ConversationsProvider } from "./context/ConversationsContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import Chat from "./pages/Chat";
import Home from "./pages/Home";
import PhotoAnalysis from "./pages/PhotoAnalysis";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AuthGate>
            <ConversationsProvider>
              <BrowserRouter>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/:conversationId" element={<Chat />} />
                    <Route path="/photo" element={<PhotoAnalysis />} />
                    <Route path="/photo/:conversationId" element={<PhotoAnalysis />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </ConversationsProvider>
          </AuthGate>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
