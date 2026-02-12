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
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display text-slate-900">Painel de Enfermagem</h1>
        <p className="text-muted-foreground mt-1">Pacientes aguardando triagem para hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</p>
      </div>

      <div className="grid gap-4">
        {waitingList.length === 0 ? (
          <Card className="p-12 text-center border-none shadow-sm">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Nenhum paciente aguardando triagem</h3>
            <p className="text-muted-foreground">Todos os pacientes presentes já foram triados ou não há pacientes na fila.</p>
          </Card>
        ) : (
          waitingList.map((apt: any) => (
            <Card key={apt.id} className="hover-elevate transition-all border-none shadow-sm overflow-hidden group">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="p-6 md:w-32 bg-emerald-50 flex md:flex-col items-center justify-center gap-2 border-r">
                  <Clock className="w-5 h-5 text-emerald-600" />
                  <span className="text-xl font-bold text-emerald-700">{apt.startTime}</span>
                </div>
                <div className="p-6 flex-1 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                      {apt.patient.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{apt.patient.name}</h3>
                      <p className="text-sm text-muted-foreground">Médico: Dr. {apt.doctor.name}</p>
                    </div>
                  </div>
                  
                  <Link href={`/nurse/triage/${apt.id}`}>
                    <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
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
    </LayoutShell>
  );
}
