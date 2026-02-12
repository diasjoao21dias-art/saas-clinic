import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, History, User, Clock, FileText } from "lucide-react";

export function MedicalRecordAuditLogs({ patientId }: { patientId: number }) {
  const { data: records, isLoading } = useQuery({
    queryKey: [api.medicalRecords.listByPatient.path, patientId],
    queryFn: async () => {
      const res = await fetch(api.medicalRecords.listByPatient.path.replace(':patientId', patientId.toString()));
      if (!res.ok) throw new Error("Falha ao buscar registros");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-bold">Histórico de Alterações e Auditoria</h3>
      </div>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-4">
          {records && records.length > 0 ? (
            records.map((record: any) => (
              <Card key={record.id} className="border-l-4 border-l-primary shadow-sm">
                <CardHeader className="py-3 px-4 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                        Registro #{record.id}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(record.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-medium text-slate-700">
                      <User className="w-3 h-3" />
                      Dr(a). {record.doctor?.name || 'Médico'}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {record.diagnosis && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Diagnóstico</span>
                      <p className="text-sm font-medium">{record.diagnosis}</p>
                    </div>
                  )}
                  {record.chiefComplaint && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Queixa Principal</span>
                      <p className="text-sm text-slate-700 italic">"{record.chiefComplaint}"</p>
                    </div>
                  )}
                  <div className="pt-2 flex justify-end">
                     <Badge variant="outline" className="text-[10px] gap-1 opacity-70">
                        <FileText className="w-3 h-3" /> Visualizar Log Completo
                     </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum registro histórico encontrado para este paciente.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
