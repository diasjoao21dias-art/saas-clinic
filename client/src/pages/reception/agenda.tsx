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

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { eachDayOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";

export default function AgendaPage() {
  const [viewRange, setViewRange] = useState({ 
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | undefined>();
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithDetails | null>(null);
  const [isAptDialogOpen, setIsAptDialogOpen] = useState(false);
  const [isAvailabilityDialogOpen, setIsAvailabilityDialogOpen] = useState(false);
  const [availabilityDateRange, setAvailabilityDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  
  const { data: allAppointments, isLoading: isLoadingAppointments } = useAppointments({ 
    startDate: viewRange.start, 
    endDate: viewRange.end 
  });
  
  const getUnavailableTimes = (date: string, doctorId: number) => {
    if (!allAppointments) return [];
    return allAppointments
      .filter(apt => apt.date === date && apt.doctorId === doctorId && apt.status !== 'cancelado')
      .map(apt => apt.startTime);
  };

  const isTimeSlotOccupied = (time: string, date: string, doctorId: number) => {
    const unavailable = getUnavailableTimes(date, doctorId);
    return unavailable.includes(time);
  };
  const { data: patients } = usePatients();
  const { data: doctors } = useQuery<User[]>({ 
    queryKey: [api.users.list.path, { role: 'doctor' }],
    queryFn: async () => {
      const res = await fetch(`${api.users.list.path}?role=doctor`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch doctors");
      return res.json();
    }
  });

  const { data: availabilityExceptions } = useQuery<any[]>({
    queryKey: ["/api/availability-exceptions", selectedDoctorId],
    queryFn: async () => {
      const url = selectedDoctorId 
        ? `/api/availability-exceptions?doctorId=${selectedDoctorId}`
        : "/api/availability-exceptions";
      const res = await fetch(url, { credentials: "include" });
      return res.json();
    }
  });

  const toggleAvailability = useMutation({
    mutationFn: async ({ doctorId, dates, isAvailable }: any) => {
      if (isAvailable) {
        // If we are making it available, we delete existing exceptions
        await apiRequest("POST", "/api/availability-exceptions/bulk-delete", { doctorId, dates });
      } else {
        // Blocking it
        await apiRequest("POST", "/api/availability-exceptions", { doctorId, dates, isAvailable: false });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability-exceptions"] });
      toast({ title: "Agenda atualizada", description: "Disponibilidade alterada com sucesso." });
      setIsAvailabilityDialogOpen(false);
    }
  });

  const { toast } = useToast();
  const createAppointment = useCreateAppointment();
  const [selectedAppointmentForCheckin, setSelectedAppointmentForCheckin] = useState<AppointmentWithDetails | null>(null);
  const [isCheckinDialogOpen, setIsCheckinDialogOpen] = useState(false);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, paymentMethod, paymentStatus }: any) => {
      const res = await apiRequest("PATCH", `/api/appointments/${id}/status`, { 
        status, 
        paymentMethod, 
        paymentStatus 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Sucesso", description: "Status do agendamento atualizado" });
      setIsCheckinDialogOpen(false);
      setSelectedAppointmentForCheckin(null);
    }
  });

  const checkinForm = useForm({
    defaultValues: {
      paymentMethod: "dinheiro",
      paymentStatus: "pendente",
      confirmData: false
    }
  });

  const onCheckinSubmit = (data: any) => {
    if (!selectedAppointmentForCheckin) return;
    updateStatusMutation.mutate({
      id: selectedAppointmentForCheckin.id,
      status: "presente",
      paymentMethod: data.paymentMethod,
      paymentStatus: data.paymentStatus
    });
  };

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
            {selectedDoctorId && (
              <Button 
                variant="outline" 
                onClick={() => setIsAvailabilityDialogOpen(true)}
              >
                Bloquear/Desbloquear Agenda
              </Button>
            )}
          </div>
        </div>

        <Dialog open={isAvailabilityDialogOpen} onOpenChange={setIsAvailabilityDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Gerenciar Disponibilidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Período</label>
                <DateRangePicker 
                  date={availabilityDateRange}
                  setDate={setAvailabilityDateRange}
                />
              </div>
              <div className="flex gap-4">
                <Button 
                  className="flex-1"
                  variant="destructive"
                  onClick={() => {
                    if (!availabilityDateRange?.from || !selectedDoctorId) return;
                    const dates = eachDayOfInterval({
                      start: availabilityDateRange.from,
                      end: availabilityDateRange.to || availabilityDateRange.from
                    }).map(d => format(d, 'yyyy-MM-dd'));
                    
                    toggleAvailability.mutate({
                      doctorId: selectedDoctorId,
                      dates,
                      isAvailable: false
                    });
                  }}
                  disabled={toggleAvailability.isPending}
                >
                  Fechar Agenda
                </Button>
                <Button 
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    if (!availabilityDateRange?.from || !selectedDoctorId) return;
                    const dates = eachDayOfInterval({
                      start: availabilityDateRange.from,
                      end: availabilityDateRange.to || availabilityDateRange.from
                    }).map(d => format(d, 'yyyy-MM-dd'));
                    
                    toggleAvailability.mutate({
                      doctorId: selectedDoctorId,
                      dates,
                      isAvailable: true
                    });
                  }}
                  disabled={toggleAvailability.isPending}
                >
                  Abrir Agenda
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                dayCellClassNames={(arg) => {
                  const dateStr = format(arg.date, 'yyyy-MM-dd');
                  const isBlocked = availabilityExceptions?.some(ex => 
                    ex.date === dateStr && 
                    (!selectedDoctorId || ex.doctorId === selectedDoctorId) &&
                    !ex.isAvailable
                  );
                  return isBlocked ? 'bg-slate-100 opacity-60 cursor-not-allowed blocked-day' : '';
                }}
                datesSet={(arg) => {
                  setViewRange({
                    start: format(arg.start, 'yyyy-MM-dd'),
                    end: format(arg.end, 'yyyy-MM-dd')
                  });
                }}
                eventClick={(info) => {
                  const apt = info.event.extendedProps.appointment;
                  if (apt.status === 'confirmado') {
                    setSelectedAppointmentForCheckin(apt);
                    setIsCheckinDialogOpen(true);
                  } else {
                    setEditingAppointment(apt);
                    setIsAptDialogOpen(true);
                  }
                }}
                dateClick={(info) => {
                  const dateStr = info.dateStr.split('T')[0];
                  const isBlocked = availabilityExceptions?.some(ex => 
                    ex.date === dateStr && 
                    (!selectedDoctorId || ex.doctorId === selectedDoctorId) &&
                    !ex.isAvailable
                  );

                  if (isBlocked) {
                    toast({ 
                      title: "Agenda Fechada", 
                      description: "Esta data está bloqueada para agendamentos.",
                      variant: "destructive"
                    });
                    return;
                  }

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

      <Dialog open={isCheckinDialogOpen} onOpenChange={setIsCheckinDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Check-in do Paciente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-4 rounded-md space-y-2">
              <p className="text-sm font-medium">Paciente: <span className="font-bold">{selectedAppointmentForCheckin?.patient.name}</span></p>
              <p className="text-sm">CPF: {selectedAppointmentForCheckin?.patient.cpf || 'Não informado'}</p>
              <p className="text-sm">Telefone: {selectedAppointmentForCheckin?.patient.phone || 'Não informado'}</p>
            </div>
            
            <Form {...checkinForm}>
              <form onSubmit={checkinForm.handleSubmit(onCheckinSubmit)} className="space-y-4">
                <FormField
                  control={checkinForm.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forma de Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="convenio">Convênio</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={checkinForm.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status do Pagamento</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status do pagamento" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="pendente">Pendente</SelectItem>
                          <SelectItem value="pago">Pago</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={updateStatusMutation.isPending}>
                  Confirmar Dados e Check-in
                </Button>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
      
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
                  render={({ field }) => {
                    const selectedDate = aptForm.watch("date");
                    const selectedDoctor = aptForm.watch("doctorId");
                    const isOccupied = isTimeSlotOccupied(field.value, selectedDate, selectedDoctor);
                    
                    return (
                      <FormItem>
                        <FormLabel className="flex justify-between items-center">
                          Horário 
                          {isOccupied && <span className="text-[10px] text-destructive font-bold uppercase">Indisponível</span>}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            type="time" 
                            {...field} 
                            className={isOccupied ? "border-destructive text-destructive" : ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={aptForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="agendado">Agendado</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="presente">Presente</SelectItem>
                          <SelectItem value="remarcado">Remarcado</SelectItem>
                          <SelectItem value="ausente">Faltou</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={aptForm.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (min)</FormLabel>
                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} /></FormControl>
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
        .blocked-day { background-image: repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px); }
      `}</style>
    </LayoutShell>
  );
}