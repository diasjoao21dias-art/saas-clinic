import { useAuth } from "@/hooks/use-auth";
import LayoutShell from "@/components/layout-shell";
import { Calendar, Users, Clock, AlertCircle, Plus, Trash2, Edit2, Loader2, Sparkles, Mic, MicOff } from "lucide-react";
import { useAppointments } from "@/hooks/use-appointments";
import { format, addMinutes, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertAppointmentSchema, type User, type AppointmentWithDetails } from "@shared/schema";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatients } from "@/hooks/use-patients";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/stat-card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useVoiceRecorder, useVoiceStream } from "@/replit_integrations/audio";

import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { DateRangePicker } from "@/components/ui/date-range-picker";
import { eachDayOfInterval } from "date-fns";
import { DateRange } from "react-day-picker";

function AIScheduler({ onAppointmentCreated }: { onAppointmentCreated: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const recorder = useVoiceRecorder();
  
  const stream = useVoiceStream({
    onUserTranscript: (text) => setTranscript(`Você: ${text}`),
    onTranscript: (text, full) => setTranscript(prev => `${prev}\n\nIA: ${full}`),
    onComplete: async (fullText) => {
      setIsProcessing(false);
      // Aqui poderíamos processar o JSON retornado se o prompt fosse específico
      // Por agora, apenas notificamos
      toast({ title: "Processamento concluído", description: "A IA analisou seu pedido." });
    },
    onError: (err) => {
      setIsProcessing(false);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  });

  const [conversationId, setConversationId] = useState<number | null>(null);

  const startConversation = async () => {
    const res = await apiRequest("POST", "/api/conversations", { title: "Agendamento Inteligente" });
    const data = await res.json();
    setConversationId(data.id);
    setIsOpen(true);
  };

  const handleMicClick = async () => {
    if (!conversationId) return;
    
    if (recorder.state === "recording") {
      setIsProcessing(true);
      const blob = await recorder.stopRecording();
      await stream.streamVoiceResponse(`/api/conversations/${conversationId}/messages`, blob);
    } else {
      await recorder.startRecording();
    }
  };

  return (
    <>
      <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary/5" onClick={startConversation}>
        <Sparkles className="w-4 h-4" /> Agenda IA
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Assistente de Agendamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-sm border">
              {transcript || "Diga algo como: 'Agende uma consulta para João Silva com o Dr. House amanhã às 14h'"}
            </div>
            
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                className={`w-20 h-20 rounded-full shadow-lg transition-all ${
                  recorder.state === "recording" ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90"
                }`}
                onClick={handleMicClick}
                disabled={isProcessing}
              >
                {recorder.state === "recording" ? (
                  <MicOff className="w-8 h-8 text-white" />
                ) : isProcessing ? (
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                ) : (
                  <Mic className="w-8 h-8 text-white" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground font-medium">
                {recorder.state === "recording" ? "Ouvindo... Clique para parar" : isProcessing ? "IA está pensando..." : "Clique no microfone para falar"}
              </p>
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <p className="text-xs text-muted-foreground italic">
              Dica: A IA pode entender nomes de pacientes, médicos e horários naturais.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
      clinicId: 1,
      price: 150,
      type: "consulta",
      examType: "",
      procedure: "",
      insurance: "",
      isPrivate: false
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
        clinicId: editingAppointment.clinicId,
        price: editingAppointment.price / 100,
        type: (editingAppointment as any).type || "consulta",
        examType: (editingAppointment as any).examType || "",
        procedure: (editingAppointment as any).procedure || "",
        insurance: (editingAppointment as any).insurance || "",
        isPrivate: (editingAppointment as any).isPrivate || false
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
        clinicId: 1,
        price: 150,
        type: "consulta",
        examType: "",
        procedure: "",
        insurance: "",
        isPrivate: false
      });
    }
  }, [editingAppointment]);

  const onAptSubmit = async (data: any) => {
    try {
      const formattedData = {
        ...data,
        price: Math.round(data.price * 100)
      };
      if (editingAppointment) {
        await updateAppointment.mutateAsync(formattedData);
      } else {
        await createAppointment.mutateAsync(formattedData);
        setIsAptDialogOpen(false);
      }
      aptForm.reset();
    } catch (error: any) {
      // Error handled by mutation onError
    }
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");

  const calendarEvents = allAppointments?.map(apt => {
    const startStr = `${apt.date}T${apt.startTime}`;
    const startDate = parseISO(startStr);
    const endDate = addMinutes(startDate, apt.duration);
    
    let bgColor = '#3b82f6'; // default blue
    let textColor = '#ffffff';
    let borderColor = 'transparent';
    
    if (apt.status === 'finalizado') { bgColor = '#dcfce7'; textColor = '#166534'; borderColor = '#bbf7d0'; } // green-100/green-800
    if (apt.status === 'presente') { bgColor = '#fef3c7'; textColor = '#92400e'; borderColor = '#fde68a'; } // amber-100/amber-800
    if (apt.status === 'cancelado') { bgColor = '#fee2e2'; textColor = '#991b1b'; borderColor = '#fecaca'; } // red-100/red-800
    if (apt.status === 'em_atendimento') { bgColor = '#f3e8ff'; textColor = '#6b21a8'; borderColor = '#e9d5ff'; } // purple-100/purple-800
    if (apt.status === 'confirmado') { bgColor = '#dbeafe'; textColor = '#1e40af'; borderColor = '#bfdbfe'; } // blue-100/blue-800
    
    return {
      id: apt.id.toString(),
      title: `${apt.patient.name} (Dr. ${apt.doctor.name})`,
      start: startStr,
      end: format(endDate, "yyyy-MM-dd'T'HH:mm:ss"),
      backgroundColor: bgColor,
      textColor: textColor,
      borderColor: borderColor,
      extendedProps: { appointment: apt }
    };
  }) || [];

  const filteredEvents = calendarEvents.filter(e => {
    const apt = e.extendedProps.appointment;
    const matchesDoctor = !selectedDoctorId || apt.doctorId === selectedDoctorId;
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    return matchesDoctor && matchesStatus;
  });

  const { user } = useAuth();
  const isReadOnly = user?.role === 'nurse';

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Agenda Completa</h1>
            <p className="text-muted-foreground mt-2">
              {isReadOnly 
                ? "Visualize os agendamentos da clínica" 
                : "Visualize e gerencie todos os agendamentos da clínica"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select 
              onValueChange={(v) => setSelectedDoctorId(v === "all" ? undefined : Number(v))} 
              value={selectedDoctorId?.toString() || "all"}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Médico" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Médicos</SelectItem>
                {doctors?.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={setStatusFilter} 
              value={statusFilter}
            >
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="agendado">Agendado</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="presente">Aguardando</SelectItem>
                <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                <SelectItem value="finalizado">Finalizado</SelectItem>
              </SelectContent>
            </Select>
            {!isReadOnly && (
              <>
                <AIScheduler onAppointmentCreated={() => queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] })} />
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
              </>
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
                  if (isReadOnly) return;
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
                  if (isReadOnly) return;
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">
              {editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
            </DialogTitle>
          </DialogHeader>
          <Form {...aptForm}>
            <form onSubmit={aptForm.handleSubmit(onAptSubmit)} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="basic">Informações Básicas</TabsTrigger>
                  <TabsTrigger value="details">Detalhes</TabsTrigger>
                  <TabsTrigger value="payment">Financeiro</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aptForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={aptForm.control}
                        name="startTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
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
                            <FormControl>
                              <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aptForm.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Agendamento</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="consulta">Consulta</SelectItem>
                              <SelectItem value="retorno">Retorno</SelectItem>
                              <SelectItem value="exame">Exame</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {aptForm.watch("type") === "exame" && (
                      <FormField
                        control={aptForm.control}
                        name="examType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Exame</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Hemograma" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <FormField
                    control={aptForm.control}
                    name="procedure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Procedimento</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Limpeza, Canal, etc." {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={aptForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Notas adicionais sobre o agendamento..." 
                            className="resize-none"
                            {...field} 
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="payment" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aptForm.control}
                      name="isPrivate"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => {
                                field.onChange(checked);
                                if (checked) {
                                  aptForm.setValue("insurance", "");
                                }
                              }}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Particular</FormLabel>
                            <FormDescription>
                              Sem uso de convênio
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={aptForm.control}
                      name="insurance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Convênio</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Nome do convênio" 
                              {...field} 
                              value={field.value || ""} 
                              disabled={aptForm.watch("isPrivate")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={aptForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={aptForm.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione o status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="agendado">Agendado</SelectItem>
                              <SelectItem value="confirmado">Confirmado</SelectItem>
                              <SelectItem value="cancelado">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter className="flex gap-2 pt-4 border-t">
                {editingAppointment && (
                  <Button 
                    type="button" 
                    variant="destructive" 
                    className="flex-1"
                    onClick={() => {
                      if (confirm("Deseja realmente excluir este agendamento?")) {
                        deleteAppointment.mutate(editingAppointment.id);
                      }
                    }}
                    disabled={deleteAppointment.isPending}
                  >
                    Excluir
                  </Button>
                )}
                <Button 
                  type="submit" 
                  className="flex-[2]" 
                  disabled={createAppointment.isPending || updateAppointment.isPending}
                >
                  {(createAppointment.isPending || updateAppointment.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  )}
                  {editingAppointment ? "Salvar Alterações" : "Criar Agendamento"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
