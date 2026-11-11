import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LeadsProvider } from "@/contexts/LeadsContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useMustChangePassword } from "@/hooks/useMustChangePassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Pipeline from "./pages/Pipeline";
import Leads from "./pages/Leads";
import Atendimento from "./pages/Atendimento";
import LeadDetail from "./pages/LeadDetail";
import Relatorios from "./pages/Relatorios";
import Admin from "./pages/Admin";
import Agenda from "./pages/Agenda";
import Inbox from "./pages/Inbox";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { role, loading: roleLoading, isComercial } = useUserRole();
  const { mustChange, loading: pwLoading, clear } = useMustChangePassword();

  if (loading || roleLoading || pwLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // User exists but has no role assigned yet
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 text-center">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Acesso Pendente</h2>
          <p className="text-muted-foreground">Sua conta ainda não tem permissão de acesso. Solicite ao administrador.</p>
        </div>
      </div>
    );
  }

  // First access: force password change before using the CRM
  if (mustChange) {
    return <ChangePassword onDone={clear} />;
  }

  return (
    <LeadsProvider>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pipeline" element={isComercial ? <Navigate to="/" replace /> : <Pipeline />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/atendimento" element={<Atendimento />} />
        <Route path="/leads/:id" element={isComercial ? <Navigate to="/leads" replace /> : <LeadDetail />} />
        <Route path="/relatorios" element={isComercial ? <Navigate to="/" replace /> : <Relatorios />} />
        <Route path="/admin" element={isComercial ? <Navigate to="/" replace /> : <Admin />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </LeadsProvider>
  );
}

function AuthRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Auth />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthRoute />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
