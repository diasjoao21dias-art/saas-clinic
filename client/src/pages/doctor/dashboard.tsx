import LayoutShell from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlayCircle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "wouter";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments } = useAppointments({ 
    date: today,
    doctorId: user?.id 
  });

  const nextUp = appointments?.find(a => a.status === 'arrived' || a.status === 'scheduled');

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Dr. {user?.name}</h1>
            <p className="text-muted-foreground mt-2">
              Você tem {appointments?.filter(a => a.status !== 'completed').length} pacientes restantes hoje
            </p>
          </div>
          <div className="flex gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border shadow-sm text-sm">
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 font-semibold text-green-600 flex items-center gap-1 inline-flex">
                <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                Disponível
              </span>
            </div>
          </div>
        </div>

        {nextUp && (
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-2xl p-8 text-white shadow-xl shadow-primary/20">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-sm font-medium mb-4">
                  <Clock className="w-4 h-4" />
                  Próximo Paciente • {nextUp.startTime}
                </div>
                <h2 className="text-3xl font-bold mb-2">{nextUp.patient.name}</h2>
                <p className="text-blue-100 opacity-90 max-w-xl">
                  {nextUp.notes || "Sem notas pré-atendimento disponíveis."}
                </p>
              </div>
              <Link href={`/doctor/attend/${nextUp.id}`}>
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold shadow-lg border-0 h-14 px-8 text-lg rounded-xl">
                  Iniciar Consulta
                  <PlayCircle className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Agenda de Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {appointments?.map((apt) => (
                <div 
                  key={apt.id} 
                  className="group flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 transition-colors border-b border-border last:border-0"
                >
                  <div className="w-16 font-mono font-medium text-slate-500">{apt.startTime}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{apt.patient.name}</h3>
                      <Badge variant="outline" className={
                        apt.status === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                        apt.status === 'arrived' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-50 text-slate-600'
                      }>
                        {apt.status === 'completed' ? 'Concluído' : 
                         apt.status === 'arrived' ? 'Presente' : 
                         apt.status === 'scheduled' ? 'Agendado' : apt.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{apt.notes || "Consulta de Rotina"}</p>
                  </div>
                  {apt.status !== 'completed' && (
                    <Link href={`/doctor/attend/${apt.id}`}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver
                      </Button>
                    </Link>
                  )}
                  {apt.status === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                  )}
                </div>
              ))}
              {!appointments?.length && (
                <div className="text-center py-12 text-muted-foreground">
                  Nenhum agendamento para hoje
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
