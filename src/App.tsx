import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import Timeline from "./pages/Timeline";
import Profile from "./pages/Profile";
import Export from "./pages/Export";
import ManageLibrary from "./pages/ManageLibrary";
import ManageUsers from "./pages/ManageUsers";
import AnalystExport from "./pages/AnalystExport";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import Gdpr from "./pages/Gdpr";
import AboutLegal from "./pages/AboutLegal";
import Library from "./pages/Library";
import Article from "./pages/Article";
import SelfChecks from "./pages/SelfChecks";
import Surveys from "./pages/Surveys";
import ManageLanding from "./pages/ManageLanding";

const queryClient = new QueryClient();

/** All app routes — rendered once for HU (root) and once for EN (/en prefix) */
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/journal" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
    {/* Old routes redirect to journal */}
    <Route path="/check-in" element={<Navigate to="/journal" replace />} />
    <Route path="/self-checks" element={<Navigate to="/surveys" replace />} />
    <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
    <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
    <Route path="/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
    <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
    <Route path="/manage-self-checks" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
    <Route path="/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
    <Route path="/library" element={<Library />} />
    <Route path="/library/:id" element={<Article />} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/cookies" element={<Cookies />} />
    <Route path="/gdpr" element={<Gdpr />} />
    <Route path="/about-legal" element={<AboutLegal />} />
    {/* English prefix */}
    <Route path="/en" element={<Index />} />
    <Route path="/en/auth" element={<Auth />} />
    <Route path="/en/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/en/journal" element={<ProtectedRoute><CheckIn /></ProtectedRoute>} />
    <Route path="/en/check-in" element={<Navigate to="/en/journal" replace />} />
    <Route path="/en/self-checks" element={<Navigate to="/en/surveys" replace />} />
    <Route path="/en/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
    <Route path="/en/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
    <Route path="/en/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/en/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
    <Route path="/en/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
    <Route path="/en/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
    <Route path="/en/manage-self-checks" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
    <Route path="/en/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
    <Route path="/en/library" element={<Library />} />
    <Route path="/en/library/:id" element={<Article />} />
    <Route path="/en/terms" element={<Terms />} />
    <Route path="/en/cookies" element={<Cookies />} />
    <Route path="/en/gdpr" element={<Gdpr />} />
    <Route path="/en/about-legal" element={<AboutLegal />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LanguageProvider>
            <AppRoutes />
          </LanguageProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
