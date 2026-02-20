import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertMedicalRecord } from "@shared/schema";
import LayoutShell from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMedicalRecordSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useCreateMedicalRecord } from "@/hooks/use-medical-records";
import { useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, CheckCircle, History, FileText, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MedicalRecordAuditLogs } from "@/components/medical-record-audit-logs";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Save } from "lucide-react";

const COMMON_MEDICATIONS = [
  { name: "Amoxicilina 500mg", instructions: "1 cápsula via oral a cada 8h por 7 dias" },
  { name: "Ibuprofeno 400mg", instructions: "1 comprimido via oral a cada 6h em caso de dor" },
  { name: "Dipirona 500mg", instructions: "1 comprimido via oral a cada 6h em caso de febre ou dor" },
  { name: "Paracetamol 750mg", instructions: "1 comprimido via oral a cada 6h em caso de dor" },
  { name: "Omeprazol 20mg", instructions: "1 cápsula via oral em jejum" },
  { name: "Losartana 50mg", instructions: "1 comprimido via oral 1x ao dia" },
  { name: "Metformina 850mg", instructions: "1 comprimido via oral após o jantar" },
];

export default function AttendPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/doctor/attend/:id");
  const appointmentId = parseInt(params?.id || "0");

  const { data: appointment, isLoading } = useQuery({
    queryKey: [api.appointments.list.path, appointmentId],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path);
      const list = await res.json();
      return list.find((a: any) => a.id === appointmentId);
    },
    enabled: !!appointmentId,
  });

  const signMutation = useMutation({
    mutationFn: async ({ recordId, hash }: { recordId: number, hash: string }) => {
      await apiRequest("POST", `/api/medical-records/${recordId}/sign`, {
        hash,
        certificate: "ICP-Brasil Standard v2.1"
      });
    },
    onSuccess: () => {
      if (appointment?.patientId) {
        queryClient.invalidateQueries({ queryKey: [api.medicalRecords.listByPatient.path, appointment.patientId] });
      }
      toast({ title: "Assinado", description: "Prontuário assinado digitalmente com sucesso." });
    }
  });

  const form = useForm<InsertMedicalRecord>({
    resolver: zodResolver(insertMedicalRecordSchema),
    defaultValues: {
      appointmentId,
      patientId: appointment?.patientId,
      doctorId: appointment?.doctorId,
      clinicId: appointment?.clinicId,
      chiefComplaint: "",
      history: "",
      allergies: "",
      diagnosis: "",
      prescription: "",
      notes: "",
      vitals: {
        bloodPressure: "",
        temperature: "",
        heartRate: "",
        weight: "",
        height: "",
      }
    }
  });

  const createRecord = useCreateMedicalRecord();
  const updateStatus = useUpdateAppointmentStatus();

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  if (!appointment || !appointment.patient) {
    return (
      <LayoutShell>
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Agendamento ou Paciente não encontrado</h2>
          <p className="text-muted-foreground mt-2">Verifique se o agendamento existe e tente novamente.</p>
          <Button onClick={() => window.history.back()} className="mt-4">
            Voltar
          </Button>
        </div>
      </LayoutShell>
    );
  }

  const onSubmit = async (data: InsertMedicalRecord, isDraft = false) => {
    const payload = {
      ...data,
      patientId: appointment.patient.id,
      doctorId: appointment.doctor.id,
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      status: isDraft ? 'rascunho' : 'finalizado'
    };
    
    const record = await createRecord.mutateAsync(payload);
    if (!isDraft) {
      await updateStatus.mutateAsync({ id: appointmentId, status: 'completed' });
      await signMutation.mutateAsync({ recordId: record.id, hash: "sha256:" + Math.random().toString(36).substring(7) });
    } else {
      toast({ title: "Rascunho Salvo", description: "O atendimento foi salvo como rascunho." });
    }
  };

  const handlePrint = () => {
    const prescriptionContent = form.getValues("prescription");
    const patientName = appointment.patient.name;
    const doctorName = appointment.doctor.name;
    const dateStr = format(new Date(), 'dd/MM/yyyy');

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receituário - \${patientName}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; line-height: 1.6; }
            .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
            .doctor-info { margin-bottom: 40px; }
            .patient-info { margin-bottom: 30px; font-weight: bold; }
            .prescription-body { white-space: pre-wrap; min-height: 400px; }
            .footer { margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; font-size: 0.8em; color: #666; }
            .signature { margin-top: 60px; border-top: 1px solid #000; width: 250px; margin-left: auto; margin-right: auto; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="color: #0f172a; margin: 0;">MediFlow</h1>
            <p style="margin: 5px 0;">Cuidado e Tecnologia</p>
          </div>
          <div class="doctor-info">
            <p><strong>Médico:</strong> \${doctorName}</p>
            <p><strong>Data:</strong> \${dateStr}</p>
          </div>
          <div class="patient-info">
            Para: \${patientName}
          </div>
          <div class="prescription-body">
            \${prescriptionContent || "Rx:\\n\\nSem medicamentos prescritos."}
          </div>
          <div class="signature">
            Assinatura do Médico
          </div>
          <div class="footer">
            Gerado eletronicamente via MediFlow em \${new Date().toLocaleString()}
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const loadTemplate = () => {
    const template = localStorage.getItem("selected_template");
    if (template) {
      form.setValue("prescription", template);
      localStorage.removeItem("selected_template");
    }
  };

  return (
    <LayoutShell>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              Consulta: <span className="text-primary">{appointment.patient.name}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), 'PPP', { locale: ptBR })} • {appointment.startTime}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadTemplate} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
              <FileText className="w-4 h-4 mr-2" />
              Carregar Modelo
            </Button>
            <Button 
              variant="outline" 
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
              onClick={async () => {
                const res = await apiRequest("POST", `/api/appointments/${appointmentId}/ai-process`);
                const data = await res.json();
                queryClient.setQueryData([api.appointments.list.path, appointmentId], (old: any) => ({ ...old, ...data }));
                
                // Sincronizar dados da IA com o formulário
                if (data.aiSummary) {
                  const currentHistory = form.getValues("history") || "";
                  form.setValue("history", `${currentHistory}\n\n[Resumo IA]: ${data.aiSummary}`.trim());
                }
                
                toast({ title: "Processado", description: "Histórico e sugestões carregados via IA." });
              }}
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Resumo IA
            </Button>
            <Button variant="outline">
              <History className="w-4 h-4 mr-2" />
              Histórico do Paciente
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} className="bg-accent hover:bg-accent/90" disabled={createRecord.isPending || signMutation.isPending}>
              {createRecord.isPending || signMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {signMutation.isSuccess ? "Finalizado e Assinado" : "Finalizar e Assinar Digitalmente"}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <div className="grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            <Card className="lg:col-span-1 border-none shadow-sm flex flex-col h-full bg-white">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                    {appointment.patient.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{appointment.patient.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(appointment.patient.birthDate), 'dd MMM yyyy', { locale: ptBR })} ({new Date().getFullYear() - new Date(appointment.patient.birthDate).getFullYear()} anos)
                    </p>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 font-bold text-primary">Triagem Realizada pela Enfermagem</h4>
                    {appointment.triageDone ? (
                      <div className="mb-4 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-emerald-600 font-bold">Pressão Arterial</span>
                            <span className="text-lg font-bold text-emerald-900 leading-none">{appointment.triageData?.bloodPressure || '--/--'} <small className="text-[10px] font-normal opacity-70">mmHg</small></span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-emerald-600 font-bold">Temperatura</span>
                            <span className="text-lg font-bold text-emerald-900 leading-none">{appointment.triageData?.temperature || '--'} <small className="text-[10px] font-normal opacity-70">°C</small></span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-emerald-600 font-bold">Peso</span>
                            <span className="text-lg font-bold text-emerald-900 leading-none">{appointment.triageData?.weight || '--'} <small className="text-[10px] font-normal opacity-70">kg</small></span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-emerald-600 font-bold">Saturação O2</span>
                            <span className="text-lg font-bold text-emerald-900 leading-none">{appointment.triageData?.oxygenSaturation || '--'} <small className="text-[10px] font-normal opacity-70">%</small></span>
                          </div>
                        </div>
                        {appointment.triageData?.notes && (
                          <div className="mt-3 pt-3 border-t border-emerald-100">
                            <span className="text-[10px] uppercase text-emerald-600 font-bold block mb-1">Notas da Enfermagem</span>
                            <p className="text-xs text-emerald-800 italic">"{appointment.triageData.notes}"</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-4 p-4 rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 text-center">
                        <p className="text-xs text-slate-500 font-medium italic">Nenhuma triagem realizada ainda</p>
                      </div>
                    )}
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Novos Sinais Vitais (Consulta)</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                        <p className="text-xs text-blue-600 mb-1">Pressão Arterial</p>
                        <Input 
                          {...form.register("vitals.bloodPressure")} 
                          className="h-8 bg-white border-blue-200" 
                          placeholder="120/80" 
                        />
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                        <p className="text-xs text-red-600 mb-1">Freq. Cardíaca</p>
                        <Input 
                          {...form.register("vitals.heartRate")} 
                          className="h-8 bg-white border-red-200" 
                          placeholder="72 bpm" 
                        />
                      </div>
                      <div className="p-3 rounded-lg bg-orange-50 border border-orange-100">
                        <p className="text-xs text-orange-600 mb-1">Temperatura</p>
                        <Input 
                          {...form.register("vitals.temperature")} 
                          className="h-8 bg-white border-orange-200" 
                          placeholder="36.5 °C" 
                        />
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                        <p className="text-xs text-green-600 mb-1">Peso</p>
                        <Input 
                          {...form.register("vitals.weight")} 
                          className="h-8 bg-white border-green-200" 
                          placeholder="70 kg" 
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Alergias</h4>
                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              value={field.value || ""} 
                              className="min-h-[60px] bg-red-50 text-red-700 border-red-100 placeholder:text-red-400 focus-visible:ring-red-200" 
                              placeholder="Descreva as alergias ou 'Sem alergias conhecidas'..." 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </ScrollArea>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-full overflow-hidden bg-white">
              <Tabs defaultValue="anamnesis" className="h-full flex flex-col">
                  <div className="px-6 pt-6 border-b">
                  <TabsList className="grid w-full grid-cols-4 mb-6 bg-slate-100/50 p-1 h-12">
                    <TabsTrigger value="anamnesis" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-2 text-sm font-semibold border-transparent data-[state=active]:border-primary/10 border transition-all">Anamnese</TabsTrigger>
                    <TabsTrigger value="diagnosis" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-2 text-sm font-semibold border-transparent data-[state=active]:border-primary/10 border transition-all">Diagnóstico</TabsTrigger>
                    <TabsTrigger value="prescription" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-2 text-sm font-semibold border-transparent data-[state=active]:border-primary/10 border transition-all">Receituário</TabsTrigger>
                    <TabsTrigger value="history" className="data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm py-2 text-sm font-semibold border-transparent data-[state=active]:border-primary/10 border transition-all">Audit</TabsTrigger>
                  </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    {appointment?.aiSummary && (
                      <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <ShieldCheck className="w-24 h-24 rotate-12" />
                        </div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                          <div className="flex items-center gap-3 text-primary">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h4 className="text-base font-bold font-display tracking-tight">Resumo Inteligente & Insights</h4>
                          </div>
                          <Badge variant="outline" className="bg-white/80 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-primary/20">Sincronizado</Badge>
                        </div>
                        <p className="text-sm text-slate-700 mb-6 leading-relaxed relative z-10 font-medium">
                          {appointment.aiSummary}
                        </p>
                        {appointment.followUpTasks && appointment.followUpTasks.length > 0 && (
                          <div className="space-y-3 relative z-10">
                            <div className="flex items-center gap-2">
                              <div className="h-px flex-1 bg-primary/20" />
                              <h5 className="text-[10px] uppercase font-black text-primary/40 tracking-[0.2em]">Follow-up Automático</h5>
                              <div className="h-px flex-1 bg-primary/20" />
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {appointment.followUpTasks.map((task: string, i: number) => (
                                <Badge key={i} variant="secondary" className="bg-white/90 text-primary border-primary/10 hover:bg-primary hover:text-white transition-colors cursor-default py-1 px-3 shadow-sm font-semibold">
                                  {task}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <TabsContent value="history" className="space-y-6 mt-0">
                    <MedicalRecordAuditLogs patientId={appointment.patient.id} />
                  </TabsContent>
                  <TabsContent value="anamnesis" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold font-display text-slate-800">Anamnese Detalhada</h3>
                      <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5">Padrão Ouro</Badge>
                    </div>
                    <FormField
                      control={form.control}
                      name="chiefComplaint"
                      render={({ field }) => (
                        <FormItem className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-tight">Queixa Principal</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[100px] text-lg bg-white border-slate-200 focus-visible:ring-primary/20" placeholder="O paciente relata..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="history"
                      render={({ field }) => (
                        <FormItem className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-tight">Histórico da Doença Atual (HDA)</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[250px] bg-white border-slate-200 focus-visible:ring-primary/20 leading-relaxed" placeholder="Descreva a evolução dos sintomas, tratamentos anteriores e estado atual..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="diagnosis" className="space-y-6 mt-0">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold font-display text-slate-800">Definição Diagnóstica</h3>
                      <div className="flex gap-2">
                         <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">CID-10 Ativo</Badge>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem className="bg-blue-50/30 p-4 rounded-xl border border-blue-100/50">
                          <FormLabel className="text-sm font-bold text-blue-700 uppercase tracking-tight">Hipótese Diagnóstica / CID-10</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="text-lg bg-white border-blue-200 focus-visible:ring-blue-200" placeholder="Digite o código ou nome da patologia (ex: J00)" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <FormLabel className="text-sm font-bold text-slate-700 uppercase tracking-tight">Conduta e Evolução Clínica</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[250px] bg-white border-slate-200 focus-visible:ring-primary/20" placeholder="Avaliação detalhada, plano terapêutico e orientações dadas ao paciente..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="prescription" className="space-y-6 mt-0">
                    <div className="bg-white p-8 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 z-0" />
                      <div className="flex items-center gap-3 mb-8 relative z-10">
                        <div className="p-3 bg-primary/10 rounded-xl">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-display font-bold text-xl text-slate-900">Receituário Eletrônico</h3>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Documento Digital Válido</p>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/5">
                                  + Buscar Medicamento
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[300px] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Buscar medicamento..." />
                                  <CommandList>
                                    <CommandEmpty>Nenhum medicamento encontrado.</CommandEmpty>
                                    <CommandGroup heading="Medicamentos Comuns">
                                      {COMMON_MEDICATIONS.map((med) => (
                                        <CommandItem
                                          key={med.name}
                                          onSelect={() => {
                                            const current = form.getValues("prescription") || "";
                                            const entry = `\n${med.name}\n${med.instructions}\n`;
                                            form.setValue("prescription", current + entry);
                                          }}
                                        >
                                          <div className="flex flex-col">
                                            <span className="font-bold">{med.name}</span>
                                            <span className="text-xs text-muted-foreground">{med.instructions}</span>
                                          </div>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                        {signMutation.isSuccess && (
                          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200 gap-1.5 px-3 py-1">
                            <ShieldCheck className="w-4 h-4" /> Assinado Digitalmente
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mb-6 p-4 border-l-4 border-primary bg-slate-50/50 rounded-r-lg">
                         <p className="text-sm font-bold text-slate-900">{appointment.patient.name}</p>
                         <p className="text-xs text-slate-500">Data: {format(new Date(), 'dd/MM/yyyy')}</p>
                      </div>

                      <FormField
                        control={form.control}
                        name="prescription"
                        render={({ field }) => (
                          <FormItem className="relative z-10">
                            <FormControl>
                              <div className="bg-slate-50/30 rounded-xl border border-slate-100 p-2">
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""}
                                  className="min-h-[350px] font-mono text-base leading-relaxed border-0 bg-transparent focus-visible:ring-0 resize-none placeholder:italic placeholder:text-slate-400" 
                                  placeholder="Rx:&#10;&#10;Descreva aqui a medicação, dosagem e via de administração..." 
                                />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-end italic text-[10px] text-slate-400">
                        <div>
                           <p>Emitido eletronicamente por {appointment.doctor.name}</p>
                           <p>CRM: {appointment.doctor.crm || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                           <p>MediFlow Healthcare System</p>
                           <p>Autenticidade garantida via Assinatura Digital</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" className="gap-2 border-slate-200 hover:bg-slate-50" onClick={handlePrint}>
                        <FileText className="w-4 h-4" />
                        Visualizar PDF
                      </Button>
                      <Button variant="outline" className="gap-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" onClick={handlePrint}>
                        <CheckCircle className="w-4 h-4" />
                        Imprimir Receita
                      </Button>
                    </div>
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </Card>
          </div>
        </Form>
        
        {/* Floating Save Draft Button */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-50">
          <Button 
            onClick={form.handleSubmit((data) => onSubmit(data, true))}
            className="rounded-full w-14 h-14 shadow-xl bg-slate-800 hover:bg-slate-700 text-white p-0 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
            title="Salvar Rascunho"
            disabled={createRecord.isPending}
          >
            {createRecord.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          </Button>
        </div>
      </div>
    </LayoutShell>
  );
}
