import LayoutShell from "@/components/layout-shell";
import { usePatients, useCreatePatient, usePatient } from "@/hooks/use-patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, User, ArrowLeft, Phone, Mail, Calendar, MapPin, Contact } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

export default function PatientDirectory() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = usePatients(search);
  const [open, setOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const createPatient = useCreatePatient();

  const { data: selectedPatient, isLoading: isLoadingPatient } = usePatient(selectedPatientId || 0);

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

  const onSubmit = async (data: z.infer<typeof insertPatientSchema>) => {
    await createPatient.mutateAsync(data);
    setOpen(false);
    form.reset();
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

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 border-none shadow-sm">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                    <p className="text-muted-foreground capitalize">{selectedPatient.gender || "Gênero não informado"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
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
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Nascimento</p>
                      <p className="font-medium">{format(new Date(selectedPatient.birthDate), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Phone className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Telefone</p>
                      <p className="font-medium">{selectedPatient.phone || "N/A"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                    <Mail className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-semibold">Email</p>
                      <p className="font-medium">{selectedPatient.email || "N/A"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50">
                  <MapPin className="w-5 h-5 text-primary mt-1" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Endereço</p>
                    <p className="font-medium">{selectedPatient.address || "Endereço não informado"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
