import * as React from "react";
import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

import LoginPage from "@/pages/login";
import ReceptionDashboard from "@/pages/reception/dashboard";
import AgendaPage from "@/pages/reception/agenda";
import PatientDirectory from "@/pages/reception/patients";
import CheckInPage from "@/pages/reception/checkin";
import TeamManagement from "@/pages/admin/users";
import ClinicsManagement from "@/pages/admin/clinics";
import DoctorDashboard from "@/pages/doctor/dashboard";
import DoctorAppointmentsPage from "@/pages/doctor/appointments";
import AttendPage from "@/pages/doctor/attend";
import PrescriptionsPage from "@/pages/doctor/prescriptions";
import CalculatorsPage from "@/pages/doctor/calculators";
import InventoryPage from "@/pages/admin/inventory";
import BillingPage from "@/pages/admin/billing";
import NotFound from "@/pages/not-found";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import NurseDashboard from "@/pages/nurse/dashboard";
import NurseTriagePage from "@/pages/nurse/triage";
import SuperAdminPage from "@/pages/super-admin";

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
  const { user } = useAuth();

  const sidebarContent = React.useMemo(() => {
    if (!user) return null;
    return <AppSidebar />;
  }, [user]);

  const headerContent = React.useMemo(() => {
    if (!user) return null;
    return (
      <header className="flex h-16 items-center justify-between px-4 border-b shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden md:inline-block">
            {user.clinicId ? "Unidade Principal" : "Administração Global"}
          </span>
        </div>
      </header>
    );
  }, [user]);

  return (
    <SidebarProvider>
      <TooltipProvider>
        <div className="flex h-screen w-full">
          {sidebarContent}
          <div className="flex flex-col flex-1 overflow-hidden">
            {headerContent}
            <main className="flex-1 overflow-y-auto bg-slate-50/30 p-4 md:p-6 lg:p-8">
              <Switch>
                <Route path="/login" component={LoginPage} />
                
                {/* Super Admin Routes */}
                <Route path="/super-admin">
                  <ProtectedRoute component={SuperAdminPage} allowedRoles={['super_admin', 'admin']} />
                </Route>

                {/* Reception Routes */}
                <Route path="/reception/dashboard">
                  <ProtectedRoute component={ReceptionDashboard} allowedRoles={['operator', 'admin']} />
                </Route>
                <Route path="/reception/schedule">
                  <ProtectedRoute component={AgendaPage} allowedRoles={['operator', 'admin', 'nurse']} />
                </Route>
                <Route path="/reception/patients">
                  <ProtectedRoute component={PatientDirectory} allowedRoles={['operator', 'admin', 'doctor', 'nurse']} />
                </Route>
                <Route path="/reception/checkin">
                  <ProtectedRoute component={CheckInPage} allowedRoles={['operator', 'admin']} />
                </Route>

                {/* Nurse Routes */}
                <Route path="/nurse/dashboard">
                  <ProtectedRoute component={NurseDashboard} allowedRoles={['nurse', 'admin']} />
                </Route>
                <Route path="/nurse/triage/:id">
                  <ProtectedRoute component={NurseTriagePage} allowedRoles={['nurse', 'admin']} />
                </Route>

                {/* Doctor Routes */}
                <Route path="/doctor/dashboard">
                  <ProtectedRoute component={DoctorDashboard} allowedRoles={['doctor', 'admin']} />
                </Route>
                <Route path="/doctor/appointments">
                  <ProtectedRoute component={DoctorAppointmentsPage} allowedRoles={['doctor', 'admin']} />
                </Route>
                <Route path="/doctor/attend/:id">
                  <ProtectedRoute component={AttendPage} allowedRoles={['doctor', 'admin']} />
                </Route>
                <Route path="/doctor/prescriptions">
                  <ProtectedRoute component={PrescriptionsPage} allowedRoles={['doctor', 'admin']} />
                </Route>
                <Route path="/doctor/calculators">
                  <ProtectedRoute component={CalculatorsPage} allowedRoles={['doctor', 'admin']} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin/dashboard">
                  <ProtectedRoute component={ReceptionDashboard} allowedRoles={['admin']} />
                </Route>
                <Route path="/admin/users">
                  <ProtectedRoute component={TeamManagement} allowedRoles={['admin']} />
                </Route>
                <Route path="/admin/clinics">
                  <ProtectedRoute component={ClinicsManagement} allowedRoles={['admin']} />
                </Route>
                <Route path="/admin/inventory">
                  <ProtectedRoute component={InventoryPage} allowedRoles={['admin', 'operator']} />
                </Route>
                <Route path="/admin/billing">
                  <ProtectedRoute component={BillingPage} allowedRoles={['admin', 'operator']} />
                </Route>

                <Route path="/">
                  <Redirect to="/login" />
                </Route>
                
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SidebarProvider>
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
