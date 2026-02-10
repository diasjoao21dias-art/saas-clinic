import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import LayoutShell from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, User, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function DoctorAppointmentsPage() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: [api.appointments.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path);
      if (!res.ok) throw new Error("Falha ao buscar agenda");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="h-[80vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  const sortedAppointments = appointments?.sort((a: any, b: any) => {
    return a.startTime.localeCompare(b.startTime);
  }) || [];

  return (
    <LayoutShell>
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900">Minha Agenda</h1>
        <p className="text-muted-foreground mt-1">Veja seus atendimentos programados para hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="grid gap-4">
        {sortedAppointments.length === 0 ? (
          <Card className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum agendamento para hoje</h3>
            <p className="text-muted-foreground">Você está livre no momento.</p>
          </Card>
        ) : (
          sortedAppointments.map((apt: any) => (
            <Card key={apt.id} className="hover-elevate transition-all border-none shadow-sm overflow-hidden group">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-6 md:w-32 bg-slate-50 flex md:flex-col items-center justify-center gap-2 border-r">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="text-xl font-bold text-primary">{apt.startTime}</span>
                </div>
                <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {apt.patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{apt.patient.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {apt.patient.gender || "Não informado"}
                        </span>
                        <span>•</span>
                        <span>{apt.duration} min</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium capitalize",
                      apt.status === 'agendado' ? "bg-blue-100 text-blue-700" :
                      apt.status === 'presente' ? "bg-green-100 text-green-700" :
                      apt.status === 'em_atendimento' ? "bg-amber-100 text-amber-700" :
                      "bg-slate-100 text-slate-700"
                    )}>
                      {apt.status.replace('_', ' ')}
                    </span>
                    
                    <Link href={`/doctor/attend/${apt.id}`}>
                      <Button className="gap-2 group-hover:bg-primary/90 transition-colors">
                        Iniciar Atendimento
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </LayoutShell>
  );
}
