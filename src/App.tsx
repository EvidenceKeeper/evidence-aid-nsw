import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import AppLayout from "@/components/layout/AppLayout";
import MyCase from "@/pages/MyCase";
import Evidence from "@/pages/Evidence";
import CaseVisualization from "@/pages/CaseVisualization";
import Forms from "@/pages/Forms";
import Assistant from "@/pages/Assistant";
import SearchPage from "@/pages/Search";
import FindHelp from "@/pages/FindHelp";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";
import AuthPage from "@/pages/Auth";
import AuthGate from "@/components/auth/AuthGate";
import Taskboard from "@/pages/Taskboard";
import LawyerConsultations from "@/pages/LawyerConsultations";
import ConsultationDetail from "@/pages/ConsultationDetail";
import LegalAssistant from "@/pages/LegalAssistant";
import LegalProcess from "@/pages/LegalProcess";
import LawyerChat from "@/pages/LawyerChat";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<AuthPage />} />
              <Route element={<AuthGate />}>
                <Route path="/" element={<AppLayout />}>
                  <Route index element={<MyCase />} />
                  <Route path="evidence" element={<Evidence />} />
                  <Route path="timeline" element={<CaseVisualization />} />
                  <Route path="forms" element={<Forms />} />
                  <Route path="assistant" element={<Assistant />} />
                  <Route path="chat" element={<Assistant />} />
                  <Route path="lawyer-chat" element={<LawyerChat />} />
                  <Route path="legal" element={<LegalAssistant />} />
                  <Route path="legal-process" element={<LegalProcess />} />
                  <Route path="search" element={<SearchPage />} />
                  <Route path="find-help" element={<FindHelp />} />
                  <Route path="taskboard" element={<Taskboard />} />
                  <Route path="consultations" element={<LawyerConsultations />} />
                  <Route path="consultation/:consultationId" element={<ConsultationDetail />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
