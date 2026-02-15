import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Journal from "./pages/Journal";
import SelfChecks from "./pages/SelfChecks";
import Timeline from "./pages/Timeline";
import Profile from "./pages/Profile";
import Export from "./pages/Export";
import ManageLibrary from "./pages/ManageLibrary";
import ManageUsers from "./pages/ManageUsers";
import AnalystExport from "./pages/AnalystExport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/** All app routes — rendered once for HU (root) and once for EN (/en prefix) */
const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Index />} />
    <Route path="/auth" element={<Auth />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
    <Route path="/self-checks" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
    <Route path="/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
    <Route path="/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
    <Route path="/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
    <Route path="/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
    {/* English prefix duplicates */}
    <Route path="/en" element={<Index />} />
    <Route path="/en/auth" element={<Auth />} />
    <Route path="/en/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/en/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
    <Route path="/en/self-checks" element={<ProtectedRoute><SelfChecks /></ProtectedRoute>} />
    <Route path="/en/timeline" element={<ProtectedRoute><Timeline /></ProtectedRoute>} />
    <Route path="/en/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/en/export" element={<ProtectedRoute><Export /></ProtectedRoute>} />
    <Route path="/en/manage-library" element={<ProtectedRoute><ManageLibrary /></ProtectedRoute>} />
    <Route path="/en/manage-users" element={<ProtectedRoute><ManageUsers /></ProtectedRoute>} />
    <Route path="/en/analyst-export" element={<ProtectedRoute><AnalystExport /></ProtectedRoute>} />
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
