import LayoutShell from "@/components/layout-shell";
import { Calendar, Users, Clock, AlertCircle, Plus, Trash2, Edit2 } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format, addMinutes, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAppointmentSchema, type User, type AppointmentWithDetails } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients } from "@/hooks/use-patients";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/stat-card";
import { apiRequest, queryClient } from "@/lib/queryClient";

import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function AgendaPage() {
  const [viewRange, setViewRange] = useState({ 
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>();
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isAptDialogOpen, setIsAptDialogOpen] = useState(false);
  
  const { data: allAppointments } = useAppointments({ 
    startDate: viewRange.start, 
    endDate: viewRange.end 
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
  
  const { toast } = useToast();
  const createAppointment = useCreateAppointment();

  const updateAppointment = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/appointments/${editingAppointment?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Sucesso", description: "Agendamento atualizado" });
      setIsAptDialogOpen(false);
      setEditingAppointment(null);
    },
    onError: (error: Error) => {
      toast({ 
        title: "Conflito de Horário", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const deleteAppointment = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/appointments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Sucesso", description: "Agendamento excluído" });
      setIsAptDialogOpen(false);
      setEditingAppointment(null);
    }
  });

  const aptForm = useForm({
    resolver: zodResolver(insertAppointmentSchema),
    defaultValues: {
      patientId: 0,
      doctorId: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      startTime: "09:00",
      duration: 30,
      status: "agendado",
      notes: "",
      clinicId: 1
    }
  });

  useEffect(() => {
    if (editingAppointment) {
      aptForm.reset({
        patientId: editingAppointment.patientId,
        doctorId: editingAppointment.doctorId,
        date: editingAppointment.date,
        startTime: editingAppointment.startTime,
        duration: editingAppointment.duration,
        status: editingAppointment.status,
        notes: editingAppointment.notes || "",
        clinicId: editingAppointment.clinicId
      });
    } else {
      aptForm.reset({
        patientId: 0,
        doctorId: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: "09:00",
        duration: 30,
        status: "agendado",
        notes: "",
        clinicId: 1
      });
    }
  }, [editingAppointment]);

  const onAptSubmit = async (data: any) => {
    try {
      if (editingAppointment) {
        await updateAppointment.mutateAsync(data);
      } else {
        await createAppointment.mutateAsync(data);
        setIsAptDialogOpen(false);
      }
      aptForm.reset();
    } catch (error: any) {
      // Error handled by mutation onError
    }
  };

  const calendarEvents = allAppointments?.map(apt => {
    const startStr = `${apt.date}T${apt.startTime}`;
    const startDate = parseISO(startStr);
    const endDate = addMinutes(startDate, apt.duration);
    
    return {
      id: apt.id.toString(),
      title: `${apt.patient.name} (Dr. ${apt.doctor.name})`,
      start: startStr,
      end: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
      backgroundColor: apt.status === 'completed' ? '#10b981' : '#3b82f6',
      extendedProps: { appointment: apt }
    };
  }) || [];

  const filteredEvents = selectedDoctorId 
    ? calendarEvents.filter(e => e.extendedProps.appointment.doctorId === selectedDoctorId)
    : calendarEvents;

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Agenda Completa</h1>
            <p className="text-muted-foreground mt-2">Visualize e gerencie todos os agendamentos da clínica</p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              onValueChange={(v) => setSelectedDoctorId(v === "all" ? undefined : Number(v))} 
              value={selectedDoctorId?.toString() || "all"}
            >
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Todos os Médicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Médicos</SelectItem>
                {doctors?.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>Dr. {d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { setEditingAppointment(null); setIsAptDialogOpen(true); }} className="gap-2">
              <Plus className="w-4 h-4" /> Agendar Consulta
            </Button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Agendamentos no Período" 
            value={allAppointments?.length || 0} 
            icon={Calendar} 
            color="primary"
          />
          <StatCard 
            title="Aguardando" 
            value={allAppointments?.filter(a => a.status === 'presente').length || 0} 
            icon={Clock} 
            color="orange"
          />
          <StatCard 
            title="Médicos" 
            value={doctors?.length || 0} 
            icon={Users} 
            color="accent"
          />
          <StatCard 
            title="Pendentes" 
            value={allAppointments?.filter(a => a.status === 'agendado').length || 0} 
            icon={AlertCircle} 
            color="purple"
          />
        </div>

        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardContent className="p-6">
            <div className="calendar-container">
              <FullCalendar
                plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                events={filteredEvents}
                locale="pt-br"
                buttonText={{
                  today: 'Hoje',
                  month: 'Mês',
                  week: 'Semana',
                  day: 'Dia'
                }}
                slotMinTime="08:00:00"
                slotMaxTime="20:00:00"
                allDaySlot={false}
                height="auto"
                nowIndicator={true}
                datesSet={(arg) => {
                  setViewRange({
                    start: format(arg.start, 'yyyy-MM-dd'),
                    end: format(arg.end, 'yyyy-MM-dd')
                  });
                }}
                eventClick={(info) => {
                  setEditingAppointment(info.event.extendedProps.appointment);
                  setIsAptDialogOpen(true);
                }}
                dateClick={(info) => {
                  setEditingAppointment(null);
                  aptForm.reset({
                    patientId: 0,
                    doctorId: selectedDoctorId || 0,
                    date: info.dateStr.split('T')[0],
                    startTime: info.dateStr.split('T')[1]?.substring(0, 5) || "09:00",
                    duration: 30,
                    status: "agendado",
                    notes: "",
                    clinicId: 1
                  });
                  setIsAptDialogOpen(true);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAptDialogOpen} onOpenChange={setIsAptDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}</DialogTitle>
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
                    <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
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
              
              <div className="flex gap-2 pt-4">
                {editingAppointment && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    className="flex-1 gap-2"
                    onClick={() => {
                      if (confirm("Tem certeza que deseja excluir este agendamento?")) {
                        deleteAppointment.mutate(editingAppointment.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Excluir
                  </Button>
                )}
                <Button type="submit" className="flex-[2]" disabled={createAppointment.isPending || updateAppointment.isPending}>
                  {(createAppointment.isPending || updateAppointment.isPending) ? "Processando..." : (editingAppointment ? "Salvar Alterações" : "Confirmar Agendamento")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <style>{`
        .fc { --fc-border-color: #e2e8f0; --fc-button-bg-color: #3b82f6; --fc-button-border-color: #3b82f6; --fc-button-hover-bg-color: #2563eb; }
        .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: 700; color: #0f172a; text-transform: capitalize; }
        .fc .fc-col-header-cell-cushion { padding: 8px; color: #64748b; font-weight: 600; font-size: 0.875rem; }
        .fc-timegrid-slot { height: 3rem !important; border-bottom: 1px solid #f1f5f9 !important; }
        .fc-event { border-radius: 6px; border: none; padding: 2px 4px; font-size: 0.75rem; cursor: pointer; }
      `}</style>
    </LayoutShell>
  );
}