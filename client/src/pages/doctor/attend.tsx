import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertMedicalRecord } from "@shared/schema";
import LayoutShell from "@/components/layout-shell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMedicalRecordSchema } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { useCreateMedicalRecord } from "@/hooks/use-medical-records";
import { useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, CheckCircle, History, FileText, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ptBR } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";

export default function AttendPage() {
  const { toast } = useToast();
  const [, params] = useRoute("/doctor/attend/:id");
  const appointmentId = parseInt(params?.id || "0");

  const { data: appointment, isLoading } = useQuery({
    queryKey: [api.appointments.list.path, appointmentId],
    queryFn: async () => {
      // In a real app we'd have a specific endpoint for single appointment with relations
      // For now, we fetch list and find (inefficient but works for this demo scope)
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

  const onSubmit = async (data: InsertMedicalRecord) => {
    const payload = {
      ...data,
      patientId: appointment.patient.id,
      doctorId: appointment.doctor.id,
      clinicId: appointment.clinicId,
      appointmentId: appointment.id
    };
    
    const record = await createRecord.mutateAsync(payload);
    await updateStatus.mutateAsync({ id: appointmentId, status: 'completed' });
    
    // Auto-sign after saving (simulated)
    await signMutation.mutateAsync({ recordId: record.id, hash: "sha256:" + Math.random().toString(36).substring(7) });
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
          <title>Receituário - ${patientName}</title>
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
            <p><strong>Médico:</strong> ${doctorName}</p>
            <p><strong>Data:</strong> ${dateStr}</p>
          </div>
          <div class="patient-info">
            Para: ${patientName}
          </div>
          <div class="prescription-body">
            ${prescriptionContent || "Rx:\n\nSem medicamentos prescritos."}
          </div>
          <div class="signature">
            Assinatura do Médico
          </div>
          <div class="footer">
            Gerado eletronicamente via MediFlow em ${new Date().toLocaleString()}
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
        {/* Header */}
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

        {/* Workspace */}
        <Form {...form}>
          <div className="grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            {/* Patient Sidebar Info */}
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
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Informações de Contato</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Telefone</p>
                        <p className="font-medium">{appointment.patient.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Email</p>
                        <p className="font-medium truncate" title={appointment.patient.email || ""}>{appointment.patient.email || "N/A"}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3">Triagem e Sinais Vitais</h4>
                    {appointment.triageDone && (
                      <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-xs text-emerald-800">
                        <p className="font-bold mb-1">Dados da Triagem:</p>
                        <div className="grid grid-cols-2 gap-2">
                          <p>PA: {appointment.triageData?.bloodPressure || '-'}</p>
                          <p>Temp: {appointment.triageData?.temperature || '-'}</p>
                          <p>Peso: {appointment.triageData?.weight || '-'}</p>
                          <p>SatO2: {appointment.triageData?.oxygenSaturation || '-'}</p>
                        </div>
                      </div>
                    )}
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

            {/* Main Clinical Form */}
            <Card className="lg:col-span-2 border-none shadow-sm flex flex-col h-full overflow-hidden bg-white">
              <Tabs defaultValue="anamnesis" className="h-full flex flex-col">
                <div className="px-6 pt-6 border-b">
                  <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/50 p-1">
                    <TabsTrigger value="anamnesis">Anamnese</TabsTrigger>
                    <TabsTrigger value="diagnosis">Diagnóstico e Plano</TabsTrigger>
                    <TabsTrigger value="prescription">Receituário</TabsTrigger>
                  </TabsList>
                </div>

                <ScrollArea className="flex-1 p-6">
                  <TabsContent value="anamnesis" className="space-y-6 mt-0">
                    <FormField
                      control={form.control}
                      name="chiefComplaint"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Queixa Principal</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[100px] text-lg" placeholder="O paciente relata..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="history"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Histórico da Doença Atual</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[200px]" placeholder="Histórico detalhado..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="diagnosis" className="space-y-6 mt-0">
                    <FormField
                      control={form.control}
                      name="diagnosis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Diagnóstico (CID-10)</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ""} className="text-lg" placeholder="ex: J00 Nasofaringite aguda" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-slate-900">Notas de Evolução Clínica</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ""} className="min-h-[250px]" placeholder="Avaliação e plano..." />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TabsContent>

                  <TabsContent value="prescription" className="space-y-6 mt-0">
                    <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-300">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-primary" />
                        <h3 className="font-display font-bold text-lg">Receituário Eletrônico</h3>
                        {signMutation.isSuccess && (
                          <Badge variant="outline" className="ml-auto bg-green-50 text-green-700 border-green-200 gap-1">
                            <ShieldCheck className="w-3 h-3" /> Assinado Digitalmente
                          </Badge>
                        )}
                      </div>
                      <FormField
                        control={form.control}
                        name="prescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                value={field.value || ""}
                                className="min-h-[300px] font-mono text-sm leading-relaxed border-0 bg-transparent focus-visible:ring-0 resize-none" 
                                placeholder="Rx:&#10;&#10;Amoxicilina 500mg&#10;1 cápsula via oral a cada 8h por 7 dias&#10;&#10;Ibuprofeno 400mg&#10;1 comprimido via oral a cada 6h em caso de dor" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button variant="outline" className="gap-2" onClick={handlePrint}>
                        <FileText className="w-4 h-4" />
                        Imprimir Receita
                      </Button>
                    </div>
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
