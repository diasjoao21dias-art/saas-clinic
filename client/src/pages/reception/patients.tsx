import LayoutShell from "@/components/layout-shell";
import { usePatients, useCreatePatient, usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useMedicalRecords } from "@/hooks/use-medical-records";
import { useAppointments } from "@/hooks/use-appointments";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, User, ArrowLeft, Phone, Mail, Calendar, MapPin, Contact, FileText, Activity, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function PatientDirectory() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = usePatients(search);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const { toast } = useToast();

  const { data: selectedPatient, isLoading: isLoadingPatient } = usePatient(selectedPatientId || 0);
  const { data: medicalRecords } = useMedicalRecords(selectedPatientId || 0);
  const { data: appointments } = useAppointments({ patientId: selectedPatientId || undefined });

  const form = useForm<z.infer<typeof insertPatientSchema>>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
      email: "",
      gender: "",
      address: "",
      clinicId: 1, 
    }
  });

  const editForm = useForm<z.infer<typeof insertPatientSchema>>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
      email: "",
      gender: "",
      address: "",
      clinicId: 1,
    }
  });

  useEffect(() => {
    if (selectedPatient && editOpen) {
      editForm.reset({
        name: selectedPatient.name,
        cpf: selectedPatient.cpf || "",
        birthDate: selectedPatient.birthDate,
        phone: selectedPatient.phone || "",
        email: selectedPatient.email || "",
        gender: selectedPatient.gender || "",
        address: selectedPatient.address || "",
        clinicId: selectedPatient.clinicId,
      });
    }
  }, [selectedPatient, editOpen, editForm]);

  const onSubmit = async (data: z.infer<typeof insertPatientSchema>) => {
    await createPatient.mutateAsync(data);
    setOpen(false);
    form.reset();
  };

  const onEditSubmit = async (data: z.infer<typeof insertPatientSchema>) => {
    if (!selectedPatientId) return;
    try {
      await updatePatient.mutateAsync({ id: selectedPatientId, patient: data });
      setEditOpen(false);
      toast({
        title: "Sucesso",
        description: "Dados do paciente atualizados com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar os dados do paciente.",
        variant: "destructive",
      });
    }
  };

  const handlePrintPrescription = (prescription: string, doctorName: string) => {
    const patientName = selectedPatient?.name || "";
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
            ${prescription || "Rx:\n\nSem medicamentos prescritos."}
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

  if (selectedPatientId && selectedPatient) {
    return (
      <LayoutShell>
        <div className="space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => setSelectedPatientId(null)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para lista
          </Button>

          <div className="grid lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1 border-none shadow-sm h-fit">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                      {selectedPatient.name.charAt(0)}
                    </div>
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                      <DialogTrigger asChild>
                        <Button 
                          size="icon" 
                          variant="secondary" 
                          className="absolute bottom-0 right-0 rounded-full shadow-md"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Editar Paciente</DialogTitle>
                          <DialogDescription>Atualize as informações cadastrais do paciente.</DialogDescription>
                        </DialogHeader>
                        <Form {...editForm}>
                          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="cpf"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>CPF</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="birthDate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Data de Nascimento</FormLabel>
                                    <FormControl><Input type="date" {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Telefone</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="gender"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Gênero</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={editForm.control}
                                name="address"
                                render={({ field }) => (
                                  <FormItem className="col-span-2">
                                    <FormLabel>Endereço</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            <DialogFooter>
                              <Button type="submit" disabled={updatePatient.isPending}>
                                {updatePatient.isPending ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                    <p className="text-muted-foreground capitalize">{selectedPatient.gender || "Gênero não informado"}</p>
                  </div>
                </div>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedPatient.phone || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="truncate">{selectedPatient.email || "N/A"}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4 bg-slate-100/50 p-1">
                  <TabsTrigger value="overview">Informações</TabsTrigger>
                  <TabsTrigger value="appointments">Consultas</TabsTrigger>
                  <TabsTrigger value="records">Prontuários</TabsTrigger>
                  <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Informações Detalhadas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                          <Contact className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">CPF</p>
                            <p className="font-medium">{selectedPatient.cpf || "N/A"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                          <MapPin className="w-5 h-5 text-primary" />
                          <div>
                            <p className="text-xs text-muted-foreground uppercase font-semibold">Endereço</p>
                            <p className="font-medium">{selectedPatient.address || "Não informado"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appointments" className="mt-6">
                  <Card className="border-none shadow-sm">
                    <CardHeader>
                      <CardTitle>Histórico de Agendamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Médico</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments?.map((apt) => (
                            <TableRow key={apt.id}>
                              <TableCell className="font-medium">
                                {format(new Date(apt.date), 'dd/MM/yyyy')} às {apt.startTime}
                              </TableCell>
                              <TableCell>{apt.doctor.name}</TableCell>
                              <TableCell>
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  apt.status === 'finalizado' ? 'bg-green-100 text-green-700' :
                                  apt.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {apt.status}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                          {!appointments?.length && (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                Nenhum agendamento encontrado.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="records" className="mt-6">
                  <div className="space-y-4">
                    {medicalRecords?.map((record: any) => (
                      <Card key={record.id} className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Atendimento em {format(new Date(record.createdAt || ""), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground">Dr(a). {record.doctor.name}</span>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4">
                          {record.chiefComplaint && (
                            <div>
                              <p className="text-xs font-semibold text-primary uppercase mb-1">Queixa Principal</p>
                              <p className="text-sm">{record.chiefComplaint}</p>
                            </div>
                          )}
                          {record.diagnosis && (
                            <div className="p-3 bg-slate-50 rounded-lg border">
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Diagnóstico</p>
                              <p className="text-sm font-medium">{record.diagnosis}</p>
                            </div>
                          )}
                          {record.notes && (
                            <div>
                              <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Evolução</p>
                              <p className="text-sm whitespace-pre-wrap">{record.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                    {!medicalRecords?.length && (
                      <Card className="border-none shadow-sm">
                        <CardContent className="py-8 text-center text-muted-foreground">
                          Nenhum prontuário encontrado para este paciente.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="prescriptions" className="mt-6">
                  <div className="space-y-4">
                    {medicalRecords?.filter((r: any) => r.prescription).map((record: any) => (
                      <Card key={record.id} className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">
                            Prescrição de {format(new Date(record.createdAt || ""), 'dd/MM/yyyy', { locale: ptBR })}
                          </CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handlePrintPrescription(record.prescription || "", record.doctor.name)}
                          >
                            <FileText className="w-4 h-4" />
                            Imprimir
                          </Button>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="p-4 bg-slate-50 rounded-lg font-mono text-sm whitespace-pre-wrap border border-dashed">
                            {record.prescription}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {!medicalRecords?.some((r: any) => r.prescription) && (
                      <Card className="border-none shadow-sm">
                        <CardContent className="py-8 text-center text-muted-foreground">
                          Nenhuma prescrição encontrada para este paciente.
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Diretório de Pacientes</h1>
            <p className="text-muted-foreground mt-1">Gerencie registros e informações dos pacientes</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Paciente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Registrar Novo Paciente</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF</FormLabel>
                          <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Nascimento</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createPatient.isPending}>
                      {createPatient.isPending ? "Criando..." : "Criar Registro do Paciente"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm">
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, CPF ou telefone..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[300px]">Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Nascimento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients?.map((patient) => (
                  <TableRow key={patient.id} className="group hover:bg-blue-50/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p>{patient.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {patient.cpf || "N/A"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{patient.phone}</p>
                        <p className="text-muted-foreground">{patient.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(patient.birthDate), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100"
                        onClick={() => setSelectedPatientId(patient.id)}
                      >
                        Ver Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!patients?.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhum paciente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
