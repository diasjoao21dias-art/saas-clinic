import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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

import NurseDashboard from "@/pages/nurse/dashboard";
import NurseTriagePage from "@/pages/nurse/triage";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
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
