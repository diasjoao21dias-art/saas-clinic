import LayoutShell from "@/components/layout-shell";
import { StatCard } from "@/components/stat-card";
import { Calendar, Users, Clock, AlertCircle, Plus, CalendarDays, ClipboardList } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type Patient, type User } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients } from "@/hooks/use-patients";
import { useAppointments as useAppointmentsList, useCreateAppointment } from "@/hooks/use-appointments";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export default function ReceptionDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: allAppointments } = useAppointments({ date: today });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>();
  const { data: appointments } = useAppointments({ 
    date: today,
    doctorId: selectedDoctorId 
  });
  const { data: patients } = usePatients();
  const { data: doctors } = useQuery<User[]>({ 
    queryKey: [api.users.list.path, { role: 'doctor' }],
    queryFn: async () => {
      const res = await fetch(`${api.users.list.path}?role=doctor`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    }
  });
  
  const [isAptDialogOpen, setIsAptDialogOpen] = useState(false);
  const [isPatientDialogOpen, setIsPatientDialogOpen] = useState(false);
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();

  const aptForm = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientId: 0,
      doctorId: 0,
      date: today,
      startTime: "09:00",
      duration: 30,
      status: "agendado",
      notes: "",
      clinicId: 1
    }
  });

  const onAptSubmit = async (data: any) => {
    try {
      await createAppointment.mutateAsync(data);
      setIsAptDialogOpen(false);
      aptForm.reset();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao agendar consulta", variant: "destructive" });
    }
  };

  const totalToday = allAppointments?.length || 0;
  const pending = allAppointments?.filter(a => a.status === 'agendado').length || 0;

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Painel de Recepção</h1>
          <p className="text-muted-foreground mt-2">Visão geral para {format(new Date(), 'PPPP', { locale: ptBR })}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Agendamentos Hoje" 
            value={totalToday} 
            icon={Calendar} 
            color="primary"
          />
          <StatCard 
            title="Sala de Espera" 
            value={appointments?.filter(a => a.status === 'presente').length || 0} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Médicos Ativos" 
            value={doctors?.length || 0} 
            icon={Users} 
            color="accent"
          />
          <StatCard 
            title="Check-ins Pendentes" 
            value={pending} 
            icon={AlertCircle} 
            color="purple"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-2 border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <CardTitle>Agenda do Dia</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Select 
                    onValueChange={(v) => setSelectedDoctorId(v === "all" ? undefined : Number(v))} 
                    value={selectedDoctorId?.toString() || "all"}
                  >
                    <SelectTrigger className="w-[200px] h-8 text-xs">
                      <SelectValue placeholder="Todos os Médicos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Médicos</SelectItem>
                      {doctors?.map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsAptDialogOpen(true)}>
                <CalendarDays className="w-4 h-4 mr-2" /> Agendar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments?.sort((a, b) => a.startTime.localeCompare(b.startTime)).map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-primary">
                        {apt.patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{apt.patient.name}</p>
                        <p className="text-sm text-slate-500">Dr. {apt.doctor.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-slate-900">{apt.startTime}</p>
                      <Badge variant={apt.status === 'completed' ? 'default' : 'secondary'} className="mt-1 capitalize">
                        {apt.status === 'agendado' ? 'Agendado' : apt.status === 'presente' ? 'Presente' : apt.status === 'completed' ? 'Concluído' : apt.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {!appointments?.length && (
                  <p className="text-center text-muted-foreground py-8">Nenhum agendamento para hoje</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-primary text-primary-foreground">
            <CardHeader>
              <CardTitle className="text-white">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/reception/patients">
                <button 
                  data-testid="button-new-patient"
                  className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Novo Paciente
                </button>
              </Link>
              <button 
                data-testid="button-schedule-appointment"
                onClick={() => setIsAptDialogOpen(true)}
                className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2"
              >
                <CalendarDays className="w-5 h-5" /> Agendar Consulta
              </button>
              <button 
                data-testid="button-print-agenda"
                onClick={() => window.print()}
                className="w-full text-left px-4 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-medium flex items-center gap-2"
              >
                <ClipboardList className="w-5 h-5" /> Imprimir Agenda
              </button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAptDialogOpen} onOpenChange={setIsAptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
          </DialogHeader>
          <Form {...aptForm}>
            <form onSubmit={aptForm.handleSubmit(onAptSubmit)} className="space-y-4">
              <FormField
                control={aptForm.control}
                name="patientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paciente</FormLabel>
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um paciente" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {patients?.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={aptForm.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Médico</FormLabel>
                    <Select 
                      onValueChange={(v) => {
                        field.onChange(Number(v));
                        aptForm.trigger("date");
                      }} 
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um médico" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {doctors?.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {aptForm.watch("doctorId") > 0 && aptForm.watch("date") && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Horários Ocupados</p>
                  <div className="flex flex-wrap gap-2">
                    {allAppointments
                      ?.filter(a => a.doctorId === aptForm.watch("doctorId") && a.date === aptForm.watch("date"))
                      .sort((a, b) => a.startTime.localeCompare(b.startTime))
                      .map(a => (
                        <Badge key={a.id} variant="outline" className="bg-white">
                          <Clock className="w-3 h-3 mr-1" /> {a.startTime}
                        </Badge>
                      ))}
                    {!allAppointments?.some(a => a.doctorId === aptForm.watch("doctorId") && a.date === aptForm.watch("date")) && (
                      <p className="text-xs text-slate-400 italic">Nenhum horário agendado</p>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={aptForm.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={aptForm.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" className="w-full" disabled={createAppointment.isPending}>
                {createAppointment.isPending ? "Agendando..." : "Confirmar Agendamento"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
