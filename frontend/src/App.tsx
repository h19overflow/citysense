import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "@/lib/appContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDataStream } from "@/lib/useDataStream";
import Splash from "./pages/Splash";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

function DataStreamConnector() {
  useDataStream();
  return null;
}

const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MayorChat = lazy(() => import("./pages/MayorChat"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppProvider>
          <DataStreamConnector />
          <ErrorBoundary>
            <Suspense fallback={<div className="flex h-screen items-center justify-center text-muted-foreground text-sm">Loading…</div>}>
              <Routes>
                <Route path="/" element={<Splash />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/app" element={<Navigate to="/app/services" replace />} />
                <Route path="/app/:view" element={<CommandCenter />} />
                <Route path="/chat" element={<Navigate to="/app/services" replace />} />
                <Route path="/onboarding" element={<Navigate to="/app/services" replace />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/chat" element={<MayorChat />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AppProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
