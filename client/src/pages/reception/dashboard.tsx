import LayoutShell from "@/components/layout-shell";
import { StatCard } from "@/components/stat-card";
import { Calendar, Users, Clock, AlertCircle } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ReceptionDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments } = useAppointments({ date: today });

  const totalToday = appointments?.length || 0;
  const pending = appointments?.filter(a => a.status === 'scheduled').length || 0;
  const completed = appointments?.filter(a => a.status === 'completed').length || 0;

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Reception Dashboard</h1>
          <p className="text-muted-foreground mt-2">Overview for {format(new Date(), 'EEEE, MMMM do, yyyy')}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Today's Appointments" 
            value={totalToday} 
            icon={Calendar} 
            color="primary"
          />
          <StatCard 
            title="Waiting Room" 
            value={appointments?.filter(a => a.status === 'arrived').length || 0} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Doctors Active" 
            value="3" 
            icon={Users} 
            color="accent"
          />
          <StatCard 
            title="Pending Check-ins" 
            value={pending} 
            icon={AlertCircle} 
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader>
              <CardTitle>Upcoming Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments?.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-primary">
                        {apt.patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{apt.patient.name}</p>
                        <p className="text-sm text-slate-500">Dr. {apt.doctor.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-slate-900">{apt.startTime}</p>
                      <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'} className="mt-1 capitalize">
                        {apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {!appointments?.length && (
                  <p className="text-center text-muted-foreground py-8">No appointments today</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium">
                + New Patient
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium">
                + Schedule Appointment
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium">
                Print Daily Schedule
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
