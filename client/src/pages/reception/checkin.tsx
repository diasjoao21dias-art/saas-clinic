import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  ClipboardList, 
  UserPlus, 
  ArrowRight, 
  CheckCircle2, 
  Loader2, 
  User, 
  Calendar, 
  Clock, 
  Phone,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode
} from "lucide-react";
import { useState } from "react";
import { usePatients } from "@/hooks/use-patients";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function CheckInPage() {
  const [search, setSearch] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [paymentPrice, setPaymentPrice] = useState<number>(0);
  
  const { toast } = useToast();
  const { data: patients, isLoading: isLoadingPatients } = usePatients(search);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments, isLoading: isLoadingAppointments } = useAppointments({ date: today });
  const updateStatus = useUpdateAppointmentStatus();

  const handleOpenPayment = (patientId: number) => {
    const appointment = appointments?.find(apt => 
      apt.patientId === patientId && 
      !['cancelado', 'finalizado', 'presente'].includes(apt.status)
    );

    if (appointment) {
      setSelectedAppointment(appointment);
      setPaymentPrice(appointment.price / 100);
      setIsPaymentModalOpen(true);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!selectedAppointment) return;

    try {
      await updateStatus.mutateAsync({ 
        id: selectedAppointment.id, 
        status: 'presente',
        paymentMethod,
        paymentStatus: 'pago',
        price: paymentPrice
      });
      
      setIsPaymentModalOpen(false);
      setSelectedAppointment(null);
      
      toast({
        title: "Check-in realizado",
        description: "O paciente foi marcado como presente e o pagamento registrado.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao realizar check-in",
        description: "Ocorreu um problema ao processar a solicitação.",
      });
    }
  };

  const getPatientAppointment = (patientId: number) => {
    return appointments?.find(apt => apt.patientId === patientId);
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    'agendado': { label: 'Agendado', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock },
    'presente': { label: 'Aguardando', color: 'bg-orange-50 text-orange-700 border-orange-200', icon: User },
    'em_atendimento': { label: 'Em Atendimento', color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Loader2 },
    'finalizado': { label: 'Finalizado', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
    'cancelado': { label: 'Cancelado', color: 'bg-red-50 text-red-700 border-red-200', icon: AlertCircle },
  };

  return (
    <LayoutShell>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">Check-in de Pacientes</h1>
          </div>
          <p className="text-slate-500 text-lg ml-11">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-8 pt-8">
            <div className="space-y-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                <Search className="w-5 h-5 text-primary" />
                Localizar Paciente
              </CardTitle>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Nome, CPF ou telefone do paciente..." 
                  className="pl-12 h-14 text-lg border-slate-200 focus:border-primary focus:ring-primary/20 bg-white shadow-sm rounded-2xl transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  data-testid="input-search-patient"
                />
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {isLoadingPatients || isLoadingAppointments ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="w-10 h-10 animate-spin text-primary/40" />
                  <p className="text-slate-400 font-medium">Sincronizando dados...</p>
                </div>
              ) : patients?.length ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  {patients.map((patient) => {
                    const apt = getPatientAppointment(patient.id);
                    const statusInfo = apt ? statusMap[apt.status] : null;
                    const canCheckIn = apt && !['presente', 'em_atendimento', 'finalizado', 'cancelado'].includes(apt.status);

                    return (
                      <div 
                        key={patient.id}
                        className="p-6 hover:bg-slate-50/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        data-testid={`row-patient-${patient.id}`}
                      >
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent flex items-center justify-center text-primary font-bold text-xl border border-primary/20 shadow-sm transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                              {patient.name.charAt(0)}
                            </div>
                            {apt && (
                              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-md">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">
                                {patient.name}
                              </h3>
                              {apt?.status === 'presente' && (
                                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {patient.phone || "Sem telefone"}
                              </span>
                              <span className="flex items-center gap-1.5 hover:text-primary transition-colors cursor-default">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                CPF: {patient.cpf || "---"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {apt ? (
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block border-r border-slate-100 pr-4">
                                <p className="text-sm font-bold text-slate-800 flex items-center justify-end gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                                  {apt.startTime}
                                </p>
                                <p className="text-xs text-slate-500 font-medium">Dr. {apt.doctor.name}</p>
                              </div>
                              
                              <Badge 
                                variant="outline"
                                className={cn(
                                  "px-3 py-1.5 rounded-xl border-2 font-bold flex items-center gap-1.5 transition-all duration-300", 
                                  apt.status === 'agendado' && "bg-blue-50/50 border-blue-200 text-blue-700",
                                  apt.status === 'presente' && "bg-orange-50/50 border-orange-200 text-orange-700 shadow-sm shadow-orange-100",
                                  apt.status === 'em_atendimento' && "bg-purple-50/50 border-purple-200 text-purple-700",
                                  apt.status === 'finalizado' && "bg-green-50/50 border-green-200 text-green-700",
                                  apt.status === 'cancelado' && "bg-red-50/50 border-red-200 text-red-700",
                                )}
                              >
                                {statusInfo && <statusInfo.icon className={cn("w-3.5 h-3.5", apt.status === 'em_atendimento' && "animate-spin")} />}
                                {statusInfo?.label}
                              </Badge>

                              {canCheckIn ? (
                                <Button 
                                  size="sm"
                                  className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 active:scale-95 transition-all font-bold group/btn"
                                  onClick={() => handleOpenPayment(patient.id)}
                                  disabled={updateStatus.isPending}
                                  data-testid={`button-checkin-${patient.id}`}
                                >
                                  {updateStatus.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      Confirmar Presença
                                      <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                                    </>
                                  )}
                                </Button>
                              ) : apt.status === 'presente' ? (
                                <div className="h-10 px-4 rounded-xl bg-green-50 text-green-600 flex items-center gap-2 font-bold text-sm border border-green-100 shadow-sm">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmado
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1.5">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-medium">Sem agendamento hoje</Badge>
                              <Button variant="ghost" className="h-auto p-0 text-xs text-primary font-bold hover:no-underline hover:text-primary/80 transition-colors" data-testid={`button-walkin-${patient.id}`}>
                                <UserPlus className="w-3 h-3 mr-1" />
                                Criar Encaixe
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : search ? (
                <div className="py-24 px-6 text-center animate-in fade-in zoom-in-95 duration-500">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserPlus className="w-10 h-10 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Paciente não localizado</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mb-8">
                    Não encontramos nenhum registro com os dados informados. Deseja realizar um novo cadastro?
                  </p>
                  <Button size="lg" variant="default" className="rounded-2xl px-8 shadow-xl shadow-primary/20" data-testid="button-register-patient">
                    <UserPlus className="w-5 h-5 mr-2" />
                    Cadastrar Novo Paciente
                  </Button>
                </div>
              ) : (
                <div className="py-24 px-6 text-center text-slate-400">
                  <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-10" />
                  <p className="text-lg font-medium">Aguardando busca para iniciar check-in</p>
                  <p className="text-sm">Busque por nome, CPF ou telefone acima</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend/Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800" data-testid="text-total-day">{appointments?.length || 0}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total do Dia</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800" data-testid="text-waiting-count">
                {appointments?.filter(a => a.status === 'presente').length || 0}
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Na Espera</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800" data-testid="text-completed-count">
                {appointments?.filter(a => a.status === 'finalizado').length || 0}
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Atendidos</p>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">Check-in e Pagamento</DialogTitle>
            <DialogDescription className="text-slate-500">
              Registre o pagamento para confirmar a presença de <strong>{selectedAppointment?.patient.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Médico:</span>
                <span className="font-bold text-slate-700">Dr. {selectedAppointment?.doctor.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Horário:</span>
                <span className="font-bold text-slate-700">{selectedAppointment?.startTime}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-slate-800">Valor da Consulta:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">R$</span>
                  <Input 
                    type="number" 
                    value={paymentPrice}
                    onChange={(e) => setPaymentPrice(Number(e.target.value))}
                    className="w-24 h-9 font-black text-primary text-lg text-right bg-white border-primary/20"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 ml-1">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  type="button" 
                  variant={paymentMethod === 'pix' ? 'default' : 'outline'}
                  className={cn("h-16 rounded-2xl flex flex-col gap-1 border-2", paymentMethod === 'pix' ? "border-primary" : "border-slate-100")}
                  onClick={() => setPaymentMethod('pix')}
                >
                  <QrCode className="w-5 h-5" />
                  <span className="text-xs font-bold">PIX</span>
                </Button>
                <Button 
                  type="button" 
                  variant={paymentMethod === 'cartao' ? 'default' : 'outline'}
                  className={cn("h-16 rounded-2xl flex flex-col gap-1 border-2", paymentMethod === 'cartao' ? "border-primary" : "border-slate-100")}
                  onClick={() => setPaymentMethod('cartao')}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold">Cartão</span>
                </Button>
                <Button 
                  type="button" 
                  variant={paymentMethod === 'dinheiro' ? 'default' : 'outline'}
                  className={cn("h-16 rounded-2xl flex flex-col gap-1 border-2", paymentMethod === 'dinheiro' ? "border-primary" : "border-slate-100")}
                  onClick={() => setPaymentMethod('dinheiro')}
                >
                  <Banknote className="w-5 h-5" />
                  <span className="text-xs font-bold">Dinheiro</span>
                </Button>
                <Button 
                  type="button" 
                  variant={paymentMethod === 'convenio' ? 'default' : 'outline'}
                  className={cn("h-16 rounded-2xl flex flex-col gap-1 border-2", paymentMethod === 'convenio' ? "border-primary" : "border-slate-100")}
                  onClick={() => setPaymentMethod('convenio')}
                >
                  <ClipboardList className="w-5 h-5" />
                  <span className="text-xs font-bold">Convênio</span>
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              className="rounded-xl h-11"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              className="rounded-xl h-11 px-8 shadow-lg shadow-primary/20"
              onClick={handleConfirmCheckin}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Finalizar Check-in"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
