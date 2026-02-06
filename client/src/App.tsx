import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import ReceptionDashboard from "@/pages/reception/dashboard";
import PatientDirectory from "@/pages/reception/patients";
import DoctorDashboard from "@/pages/doctor/dashboard";
import AttendPage from "@/pages/doctor/attend";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ 
  component: Component, 
  allowedRoles 
}: { 
  component: React.ComponentType, 
  allowedRoles: string[] 
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Redirect to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Redirect to="/login" />;

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      {/* Reception Routes */}
      <Route path="/reception/dashboard">
        <ProtectedRoute component={ReceptionDashboard} allowedRoles={['operator', 'admin']} />
      </Route>
      <Route path="/reception/patients">
        <ProtectedRoute component={PatientDirectory} allowedRoles={['operator', 'admin', 'doctor']} />
      </Route>

      {/* Doctor Routes */}
      <Route path="/doctor/dashboard">
        <ProtectedRoute component={DoctorDashboard} allowedRoles={['doctor', 'admin']} />
      </Route>
      <Route path="/doctor/attend/:id">
        <ProtectedRoute component={AttendPage} allowedRoles={['doctor', 'admin']} />
      </Route>

      {/* Admin Routes - reuse reception for demo simplicity */}
      <Route path="/admin/dashboard">
        <ProtectedRoute component={ReceptionDashboard} allowedRoles={['admin']} />
      </Route>

      <Route path="/">
        <Redirect to="/login" />
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}

export default App;
