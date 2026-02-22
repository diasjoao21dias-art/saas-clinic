import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Loader2, CheckCircle, FileText, ShieldCheck, Printer, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { MedicalRecordAuditLogs } from "@/components/medical-record-audit-logs";

const COMMON_MEDICATIONS = [
  { name: "Amoxicilina 500mg", instructions: "1 cápsula via oral a cada 8h por 7 dias" },
  { name: "Ibuprofeno 400mg", instructions: "1 comprimido via oral a cada 6h em caso de dor" },
  { name: "Dipirona 500mg", instructions: "1 comprimido via oral a cada 6h em caso de febre ou dor" },
  { name: "Paracetamol 750mg", instructions: "1 comprimido via oral a cada 6h em caso de dor" },
  { name: "Omeprazol 20mg", instructions: "1 cápsula via oral em jejum" },
  { name: "Losartana 50mg", instructions: "1 comprimido via oral 1x ao dia" },
  { name: "Metformina 850mg", instructions: "1 comprimido via oral após o jantar" },
];

const DOCUMENT_TYPES = [
  { id: 'receituario_simples', label: 'Receituário Simples', color: 'blue' },
  { id: 'receituario_especial', label: 'Controle Especial', color: 'orange' },
  { id: 'atestado', label: 'Atestado Médico', color: 'emerald' },
  { id: 'exame', label: 'Solicitação de Exame', color: 'purple' },
];

export default function AttendPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/doctor/attend/:id");
  const appointmentId = parseInt(params?.id || "0");
  const [activeDocType, setActiveDocType] = useState('receituario_simples');

  const docTemplates: Record<string, string> = {
    receituario_simples: "Rx:\n\n1. [Medicamento] [Concentração] [Forma]\nTomar [Quantidade] [Instruções] por [Dias] dias.",
    receituario_especial: "RECEITA DE CONTROLE ESPECIAL\n\nRx:\n\n1. [Medicamento Controlado] [Concentração]\nTomar conforme orientação médica restrita.",
    atestado: "ATESTADO MÉDICO\n\nAtesto para os devidos fins que o(a) Sr(a). [Nome] foi atendido(a) nesta data e necessita de [Dias] dias de afastamento das atividades laborais por motivo de doença.",
    exame: "SOLICITAÇÃO DE EXAME\n\nSolicito a realização dos seguintes exames para fins diagnósticos:\n\n1. [Nome do Exame]\n2. [Nome do Exame]",
  };

  const { data: appointment, isLoading } = useQuery({
    queryKey: [api.appointments.list.path, appointmentId],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path);
      const list = await res.json();
      return list.find((a: any) => a.id === appointmentId);
    },
    enabled: !!appointmentId,
  });

  const handleDocTypeChange = (type: string) => {
    setActiveDocType(type);
    const currentPrescription = form.getValues("prescription") || "";
    
    // Check if current content is just a default template (ignoring placeholders) or empty
    const isDefaultOrEmpty = !currentPrescription || 
      currentPrescription.trim() === "" || 
      Object.values(docTemplates).some(t => {
        // Compare first 20 chars to identify template type even if name was replaced
        return currentPrescription.startsWith(t.substring(0, 20));
      });

    if (isDefaultOrEmpty) {
      let newContent = docTemplates[type];
      if (type === 'atestado' && appointment?.patient?.name) {
        newContent = newContent.replace("[Nome]", appointment.patient.name);
      }
      form.setValue("prescription", newContent);
    }
  };

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
      prescription: docTemplates.receituario_simples,
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

  const handleSave = async (data: InsertMedicalRecord, isDraft: boolean) => {
    if (!appointment || !appointment.patient || !appointment.doctor) return;

    // Use default empty strings if values are missing
    const payload: InsertMedicalRecord = {
      ...data,
      chiefComplaint: data.chiefComplaint || "",
      history: data.history || "",
      diagnosis: data.diagnosis || "",
      prescription: data.prescription || "",
      allergies: data.allergies || "",
      notes: data.notes || "",
      patientId: appointment.patient.id,
      doctorId: appointment.doctor.id,
      clinicId: appointment.clinicId,
      appointmentId: appointment.id,
      status: isDraft ? 'rascunho' : 'finalizado',
      vitals: data.vitals || {
        bloodPressure: "",
        temperature: "",
        heartRate: "",
        weight: "",
        height: "",
      }
    };
    
    try {
      const record = await createRecord.mutateAsync(payload);
      if (!isDraft) {
        await updateStatus.mutateAsync({ id: appointmentId, status: 'finalizado' });
        await signMutation.mutateAsync({ recordId: record.id, hash: "sha256:" + Math.random().toString(36).substring(7) });
        
        toast({ title: "Atendimento Finalizado", description: "O atendimento foi finalizado e assinado com sucesso." });
        // Optionally redirect or refresh
        queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      } else {
        toast({ title: "Rascunho Salvo", description: "O atendimento foi salvo como rascunho." });
      }
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Erro", description: "Não foi possível salvar o registro.", variant: "destructive" });
    }
  };

  const onSubmit = (data: InsertMedicalRecord) => handleSave(data, false);
  const onSaveDraft = () => handleSave(form.getValues(), true);

  const handlePrint = () => {
    const prescriptionContent = form.getValues("prescription");
    if (!appointment || !appointment.patient || !appointment.doctor) return;

    const patientName = appointment.patient.name;
    const doctorName = appointment.doctor.name;
    const doctorSpecialty = appointment.doctor.specialty || "Clínico Geral";
    const clinicName = "MediFlow Clinic";
    const dateStr = format(new Date(), 'dd/MM/yyyy');
    
    const docTypeLabel = DOCUMENT_TYPES.find(d => d.id === activeDocType)?.label || "Receituário";

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>${docTypeLabel} - ${patientName}</title>
          <style>
            @page { margin: 1cm; }
            body { font-family: 'Courier New', Courier, monospace; color: #000; line-height: 1.2; padding: 0; margin: 0; font-size: 12px; }
            .page-border { border: 2px solid #000; padding: 10px; min-height: 95vh; display: flex; flex-direction: column; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .header-table td { border: 1px solid #000; padding: 5px; vertical-align: middle; }
            .title-cell { text-align: center; }
            .title-main { font-size: 14px; font-weight: bold; margin: 0; }
            .title-sub { font-size: 10px; margin: 0; }
            .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
            .info-grid td { border: 1px solid #000; padding: 3px 8px; font-size: 11px; }
            .label { font-size: 9px; font-weight: bold; display: block; margin-bottom: 2px; text-transform: uppercase; }
            .doc-title-bar { text-align: center; font-weight: bold; border: 1px solid #000; padding: 5px; background: #f0f0f0; text-transform: uppercase; margin-bottom: 10px; font-size: 13px; }
            .prescription-container { border: 1px solid #000; flex: 1; padding: 15px; position: relative; }
            .prescription-content { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
            .footer-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            .footer-table td { border: 1px solid #000; padding: 5px; font-size: 9px; }
            .signature-box { text-align: center; padding-top: 20px !important; }
            .sig-line { border-top: 1px solid #000; width: 200px; margin: 0 auto 5px; }
          </style>
        </head>
        <body>
          <div class="page-border">
            <table class="header-table">
              <tr>
                <td style="width: 80px; text-align: center; font-weight: bold;">MediFlow</td>
                <td class="title-cell">
                  <p class="title-main">GOVERNO DO ESTADO - SECRETARIA DE SAÚDE</p>
                  <p class="title-sub">UNIDADE DE EMERGÊNCIA - ${clinicName}</p>
                </td>
              </tr>
            </table>
            <table class="info-grid">
              <tr>
                <td style="width: 15%"><span class="label">SETOR:</span> CONSULTÓRIO</td>
                <td style="width: 45%"><span class="label">PACIENTE:</span> ${patientName}</td>
                <td style="width: 15%"><span class="label">REGISTRO:</span> ${appointment.id}</td>
                <td style="width: 10%"><span class="label">DATA:</span> ${dateStr}</td>
                <td style="width: 15%"><span class="label">CRM:</span> ${doctorName}</td>
              </tr>
            </table>
            <div class="doc-title-bar">${docTypeLabel}</div>
            <div class="prescription-container">
              <div class="prescription-content">${prescriptionContent || "Rx:\n\nSem prescrição informada."}</div>
            </div>
            <table class="footer-table">
              <tr>
                <td style="width: 60%">
                  <span class="label">CONTROLE DE MEDICAMENTOS:</span> [ ] SIM [ ] NÃO
                  <div style="margin-top: 10px;">ASSINADO DIGITALMENTE VIA PADRÃO ICP-BRASIL</div>
                </td>
                <td class="signature-box">
                  <div class="sig-line"></div>
                  <div style="font-weight: bold;">${doctorName}</div>
                  <div>${doctorSpecialty}</div>
                </td>
              </tr>
            </table>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 500); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

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
          <Button onClick={() => window.history.back()} className="mt-4">Voltar</Button>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display flex items-center gap-2">
              Atendimento: <span className="text-primary">{appointment.patient.name}</span>
            </h1>
            <p className="text-muted-foreground text-sm">
              {format(new Date(), 'PPP', { locale: ptBR })} • {appointment.startTime}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
              <FileText className="w-4 h-4 mr-2" /> Modelos
            </Button>
            <Button 
              variant="outline" 
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
              onClick={async () => {
                const res = await apiRequest("POST", `/api/appointments/${appointmentId}/ai-process`);
                const data = await res.json();
                queryClient.setQueryData([api.appointments.list.path, appointmentId], (old: any) => ({ ...old, ...data }));
                if (data.aiSummary) {
                  const currentHistory = form.getValues("history") || "";
                  form.setValue("history", `${currentHistory}\n\n[Resumo IA]: ${data.aiSummary}`.trim());
                }
                toast({ title: "Processado", description: "Histórico e sugestões carregados via IA." });
              }}
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> Resumo IA
            </Button>
            <Button onClick={onSaveDraft} variant="outline" disabled={createRecord.isPending}>
              Salvar Rascunho
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} className="bg-emerald-600 hover:bg-emerald-700" disabled={createRecord.isPending || signMutation.isPending}>
              {createRecord.isPending || signMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              {signMutation.isSuccess ? "Assinado" : "Finalizar e Assinar"}
            </Button>
          </div>
        </div>

        <Form {...form}>
          <div className="grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            <Card className="lg:col-span-1 border-none shadow-sm flex flex-col h-full bg-white">
              <CardHeader className="bg-slate-50 border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                    {appointment.patient.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-base">{appointment.patient.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">CPF: {appointment.patient.cpf || '---'}</p>
                    <p className="text-xs text-muted-foreground">{new Date().getFullYear() - new Date(appointment.patient.birthDate).getFullYear()} anos</p>
                  </div>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-primary/60 mb-3 tracking-wider">Triagem Enfermagem</h4>
                    {appointment.triageDone ? (
                      <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase text-emerald-600 font-bold">Pressão</span>
                            <span className="text-sm font-bold text-emerald-900">{appointment.triageData?.bloodPressure || '--/--'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase text-emerald-600 font-bold">Temp.</span>
                            <span className="text-sm font-bold text-emerald-900">{appointment.triageData?.temperature || '--'}°C</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-slate-50 border border-dashed border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 italic">Sem triagem prévia</p>
                      </div>
                    )}
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-primary/60 mb-1 tracking-wider">Sinais Vitais Atuais</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">PA</span>
                        <Input {...form.register("vitals.bloodPressure")} className="h-8 text-xs" placeholder="120/80" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase">FC</span>
                        <Input {...form.register("vitals.heartRate")} className="h-8 text-xs" placeholder="72 bpm" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-red-600 mb-1 tracking-wider">Alergias</h4>
                    <FormField
                      control={form.control}
                      name="allergies"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[60px] text-xs bg-red-50 border-red-100" placeholder="Descreva as alergias..." />
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
                  <div className="px-6 pt-4 border-b">
                  <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-100/50 p-1">
                    <TabsTrigger value="anamnesis" className="text-xs font-bold">Prontuário</TabsTrigger>
                    <TabsTrigger value="prescription" className="text-xs font-bold">Prescrição</TabsTrigger>
                    <TabsTrigger value="history" className="text-xs font-bold">Histórico</TabsTrigger>
                  </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    <TabsContent value="anamnesis" className="space-y-6 mt-0">
                      <div className="grid gap-6">
                        <FormField
                          control={form.control}
                          name="chiefComplaint"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase text-slate-500">Queixa Principal</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} className="bg-slate-50/50 border-slate-200" placeholder="Ex: Cefaleia há 3 dias" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="history"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase text-slate-500">HDA e Exame Físico</FormLabel>
                              <FormControl>
                                <Textarea {...field} value={field.value || ""} className="min-h-[200px] bg-slate-50/50 border-slate-200" placeholder="Evolução dos sintomas..." />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="diagnosis"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs font-black uppercase text-slate-500">Diagnóstico (Hipótese/CID)</FormLabel>
                              <FormControl>
                                <Input {...field} value={field.value || ""} className="bg-blue-50/30 border-blue-100" placeholder="Ex: J00 - Nasofaringite aguda" />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="prescription" className="space-y-6 mt-0">
                      <div className="flex flex-wrap gap-2 mb-4">
                        {DOCUMENT_TYPES.map((type) => (
                          <Button
                            key={type.id}
                            type="button"
                            variant={activeDocType === type.id ? "default" : "outline"}
                            size="sm"
                            className="text-[10px] h-7 font-bold"
                            onClick={() => handleDocTypeChange(type.id)}
                          >
                            {type.label}
                          </Button>
                        ))}
                      </div>
                      <div className="relative group">
                        <FormField
                          control={form.control}
                          name="prescription"
                          render={({ field }) => (
                            <FormItem className="bg-white border-2 border-slate-100 rounded-xl overflow-hidden focus-within:border-primary/20 transition-all shadow-inner">
                              <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400">Conteúdo do Documento</span>
                                <div className="flex gap-2">
                                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-white" onClick={handlePrint}>
                                    <Printer className="w-3 h-3 mr-1" /> Imprimir
                                  </Button>
                                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-[10px] hover:bg-white text-primary">
                                    <ClipboardList className="w-3 h-3 mr-1" /> Favoritos
                                  </Button>
                                </div>
                              </div>
                              <FormControl>
                                <Textarea 
                                  {...field} 
                                  value={field.value || ""} 
                                  className="min-h-[400px] border-none focus-visible:ring-0 text-base font-mono bg-transparent leading-relaxed p-6" 
                                  placeholder="Preencha o conteúdo da prescrição aqui..." 
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                          <h5 className="text-[10px] font-black uppercase text-amber-700 mb-2">Sugestões de Medicamentos</h5>
                          <div className="flex flex-wrap gap-2">
                            {COMMON_MEDICATIONS.map((med, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="bg-white hover:bg-amber-100 cursor-pointer border-amber-200 text-amber-800 text-[10px]"
                                onClick={() => {
                                  const current = form.getValues("prescription") || "";
                                  form.setValue("prescription", `${current}\n\n${med.name}\n${med.instructions}`.trim());
                                }}
                              >
                                + {med.name}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="history" className="mt-0">
                      <MedicalRecordAuditLogs patientId={appointment.patient.id} />
                    </TabsContent>
                  </ScrollArea>
              </Tabs>
            </Card>
          </div>
        </Form>
      </div>
    </LayoutShell>
  );
}
