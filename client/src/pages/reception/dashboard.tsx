import LayoutShell from "@/components/layout-shell";
import { StatCard } from "@/components/stat-card";
import { Calendar, Users, Clock, AlertCircle, CalendarDays, ClipboardList } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";
import { Link } from "wouter";

export default function ReceptionDashboard() {
  const selectedDate = format(new Date(), 'yyyy-MM-dd');
  
  const { data: allAppointments } = useAppointments({ date: selectedDate });
  const { data: doctors } = useQuery<User[]>({ 
    queryKey: [api.users.list.path, { role: 'doctor' }],
    queryFn: async () => {
      const res = await fetch(`${api.users.list.path}?role=doctor`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    }
  });

  const recentAppointments = allAppointments?.slice(0, 5) || [];

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Visão geral da clínica para hoje</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Agendamentos Hoje" 
            value={allAppointments?.length || 0} 
            icon={Calendar} 
            color="primary"
          />
          <StatCard 
            title="Aguardando" 
            value={allAppointments?.filter(a => a.status === 'presente').length || 0} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Médicos" 
            value={doctors?.length || 0} 
            icon={Users} 
            color="accent"
          />
          <StatCard 
            title="Pendentes" 
            value={allAppointments?.filter(a => a.status === 'agendado').length || 0} 
            icon={AlertCircle} 
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="border-none shadow-md bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-4">
              <CardTitle className="text-xl font-bold">Próximas Consultas</CardTitle>
              <Link href="/reception/schedule">
                <span className="text-sm text-primary hover:underline font-medium cursor-pointer">Ver Agenda Completa</span>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAppointments.length > 0 ? (
                  recentAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-50 bg-slate-50/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-primary font-bold shadow-sm">
                          {apt.startTime.split(':')[0]}h
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{apt.patient.name}</p>
                          <p className="text-sm text-muted-foreground">Dr. {apt.doctor.name}</p>
                        </div>
                      </div>
                      <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'}>
                        {apt.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-8">Nenhuma consulta agendada para hoje.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-md bg-white">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <Link href="/reception/schedule">
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group">
                  <CalendarDays className="w-8 h-8 text-slate-400 group-hover:text-primary mb-3" />
                  <span className="font-semibold text-slate-700 group-hover:text-primary">Novo Agendamento</span>
                </div>
              </Link>
              <Link href="/reception/patients">
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-100 hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer group">
                  <Users className="w-8 h-8 text-slate-400 group-hover:text-primary mb-3" />
                  <span className="font-semibold text-slate-700 group-hover:text-primary">Cadastrar Paciente</span>
                </div>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}