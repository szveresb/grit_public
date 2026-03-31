import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ConsentProvider } from "@/hooks/useConsent";
import { StanceProvider } from "@/hooks/useStance";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";

const Auth = lazy(() => import("./pages/Auth"));
const CheckIn = lazy(() => import("./pages/CheckIn"));
const Profile = lazy(() => import("./pages/Profile"));
const Export = lazy(() => import("./pages/Export"));
const ManageLibrary = lazy(() => import("./pages/ManageLibrary"));
const ManageUsers = lazy(() => import("./pages/ManageUsers"));
const AnalystExport = lazy(() => import("./pages/AnalystExport"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const Gdpr = lazy(() => import("./pages/Gdpr"));
const AboutLegal = lazy(() => import("./pages/AboutLegal"));
const Library = lazy(() => import("./pages/Library"));
const Article = lazy(() => import("./pages/Article"));
const SelfChecks = lazy(() => import("./pages/SelfChecks"));
const Surveys = lazy(() => import("./pages/Surveys"));
const ManageLanding = lazy(() => import("./pages/ManageLanding"));
const ConsentOnboarding = lazy(() => import("./pages/ConsentOnboarding"));
const Timeline = lazy(() => import("./pages/Timeline"));

const queryClient = new QueryClient();

/** All app routes — rendered once for HU (root) and once for EN (/en prefix) */
const AppRoutes = () => (
  <Suspense fallback={<div className="min-h-screen bg-background" />}>
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/dashboard" element={<Navigate to="/journal" replace />} />
      <Route path="/journal" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
      <Route path="/check-in" element={<Navigate to="/journal" replace />} />
      <Route path="/self-checks" element={<Navigate to="/surveys" replace />} />
      <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
      <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
      <Route path="/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
      <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
      <Route path="/manage-questionnaires" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
      <Route path="/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
      <Route path="/manage-landing" element={<ProtectedRoute><ManageLanding /></ProtectedRoute>} />
      <Route path="/consent" element={<ProtectedRoute skipConsentCheck><ConsentOnboarding /></ProtectedRoute>} />
      <Route path="/library" element={<Library />} />
      <Route path="/library/:id" element={<Article />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/cookies" element={<Cookies />} />
      <Route path="/gdpr" element={<Gdpr />} />
      <Route path="/about-legal" element={<AboutLegal />} />
      <Route path="/en" element={<Index />} />
      <Route path="/en/auth" element={<Auth />} />
      <Route path="/en/dashboard" element={<Navigate to="/en/journal" replace />} />
      <Route path="/en/journal" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
      <Route path="/en/check-in" element={<Navigate to="/en/journal" replace />} />
      <Route path="/en/self-checks" element={<Navigate to="/en/surveys" replace />} />
      <Route path="/en/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
      <Route path="/en/timeline" element={<Navigate to="/en/journal" replace />} />
      <Route path="/en/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/en/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
      <Route path="/en/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
      <Route path="/en/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
      <Route path="/en/manage-questionnaires" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
      <Route path="/en/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
      <Route path="/en/manage-landing" element={<ProtectedRoute><ManageLanding /></ProtectedRoute>} />
      <Route path="/en/consent" element={<ProtectedRoute skipConsentCheck><ConsentOnboarding /></ProtectedRoute>} />
      <Route path="/en/library" element={<Library />} />
      <Route path="/en/library/:id" element={<Article />} />
      <Route path="/en/terms" element={<Terms />} />
      <Route path="/en/cookies" element={<Cookies />} />
      <Route path="/en/gdpr" element={<Gdpr />} />
      <Route path="/en/about-legal" element={<AboutLegal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ConsentProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <LanguageProvider>
              <StanceProvider>
                <AppRoutes />
              </StanceProvider>
            </LanguageProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ConsentProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
