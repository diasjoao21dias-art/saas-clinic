import LayoutShell from "@/components/layout-shell";
import { StatCard } from "@/components/stat-card";
import { Calendar, Users, Clock, AlertCircle, Plus, CalendarDays, ClipboardList } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ReceptionDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments } = useAppointments({ date: today });

  const totalToday = appointments?.length || 0;
  const pending = appointments?.filter(a => a.status === 'scheduled').length || 0;

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Painel de Recepção</h1>
          <p className="text-muted-foreground mt-2">Visão geral para {format(new Date(), 'PPPP', { locale: ptBR })}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Agendamentos Hoje" 
            value={totalToday} 
            icon={Calendar} 
            color="primary"
          />
          <StatCard 
            title="Sala de Espera" 
            value={appointments?.filter(a => a.status === 'arrived').length || 0} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Médicos Ativos" 
            value="3" 
            icon={Users} 
            color="accent"
          />
          <StatCard 
            title="Check-ins Pendentes" 
            value={pending} 
            icon={AlertCircle} 
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Próximos Agendamentos</CardTitle>
              <Button variant="outline" size="sm">Ver Agenda Completa</Button>
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
                        {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'arrived' ? 'Presente' : apt.status === 'completed' ? 'Concluído' : apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {!appointments?.length && (
                  <p className="text-center text-muted-foreground py-8">Nenhum agendamento para hoje</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-white">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" /> Novo Paciente
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2">
                <CalendarDays className="w-5 h-5" /> Agendar Consulta
              </button>
              <button className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2">
                <ClipboardList className="w-5 h-5" /> Imprimir Agenda
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </LayoutShell>
  );
}
