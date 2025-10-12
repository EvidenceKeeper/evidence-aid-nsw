import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { UnifiedMemoryProvider } from "@/components/memory/UnifiedMemoryProvider";
import { ErrorBoundary, ChatErrorBoundary, EvidenceErrorBoundary } from "@/components/ErrorBoundary";
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
import LegalTraining from "@/pages/LegalTraining";
import LegalTrainingDashboard from "@/pages/LegalTrainingDashboard";
import { DebugErrorLogs } from "@/components/DebugErrorLogs";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <TooltipProvider>
          <UnifiedMemoryProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    <Route path="/auth" element={<AuthPage />} />
                    <Route element={<AuthGate />}>
                      <Route path="/" element={<AppLayout />}>
                        <Route index element={<MyCase />} />
                        <Route path="evidence" element={<EvidenceErrorBoundary><Evidence /></EvidenceErrorBoundary>} />
                        <Route path="timeline" element={<CaseVisualization />} />
                        <Route path="forms" element={<Forms />} />
                        <Route path="assistant" element={<ChatErrorBoundary><Assistant /></ChatErrorBoundary>} />
                        <Route path="chat" element={<ChatErrorBoundary><Assistant /></ChatErrorBoundary>} />
                        <Route path="lawyer-chat" element={<ChatErrorBoundary><LawyerChat /></ChatErrorBoundary>} />
                        <Route path="legal-training" element={<LegalTraining />} />
                        <Route path="legal-training-dashboard" element={<LegalTrainingDashboard />} />
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
                <DebugErrorLogs />
          </UnifiedMemoryProvider>
        </TooltipProvider>
      </HelmetProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
