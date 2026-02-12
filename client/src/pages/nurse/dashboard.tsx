import LayoutShell from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Loader2, ClipboardCheck, Clock, User } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NurseDashboard() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: [api.appointments.list.path, { status: 'presente' }],
    queryFn: async () => {
      const res = await fetch(`${api.appointments.list.path}?status=presente`);
      if (!res.ok) throw new Error("Falha ao buscar fila");
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

  const waitingList = appointments?.filter((a: any) => !a.triageDone) || [];

  return (
    <LayoutShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-slate-900">Painel de Enfermagem</h1>
          <p className="text-muted-foreground mt-1">Pacientes aguardando triagem para hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
        </div>

        <div className="grid gap-4">
          {waitingList.length === 0 ? (
            <Card className="p-12 text-center border-none shadow-sm bg-slate-50/50">
              <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">Nenhum paciente aguardando triagem</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">Todos os pacientes presentes já foram triados ou não há pacientes na fila de espera no momento.</p>
            </Card>
          ) : (
            waitingList.map((apt: any) => (
              <Card key={apt.id} className="hover-elevate transition-all border border-slate-200/60 shadow-sm overflow-hidden group">
                <div className="flex flex-col md:flex-row md:items-stretch">
                  <div className="p-6 md:w-32 bg-emerald-50/50 flex md:flex-col items-center justify-center gap-2 border-b md:border-b-0 md:border-r border-slate-200/60">
                    <Clock className="w-5 h-5 text-emerald-600" />
                    <span className="text-2xl font-bold text-emerald-700 tracking-tight">{apt.startTime}</span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xl border border-slate-200/50 shadow-sm">
                        {apt.patient.name.charAt(0)}
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-bold text-slate-900 leading-tight">{apt.patient.name}</h3>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="w-4 h-4" />
                          <span className="text-sm font-medium">Médico: <span className="text-slate-700">Dr. {apt.doctor.name}</span></span>
                        </div>
                      </div>
                    </div>
                    
                    <Link href={`/nurse/triage/${apt.id}`}>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-sm h-11 px-6 font-semibold transition-colors">
                        Iniciar Triagem
                        <ClipboardCheck className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </LayoutShell>
  );
}
