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
  AlertCircle
} from "lucide-react";
import { useState, useMemo } from "react";
import { usePatients } from "@/hooks/use-patients";
import { useAppointments, useUpdateAppointmentStatus } from "@/hooks/use-appointments";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export default function CheckInPage() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading: isLoadingPatients } = usePatients(search);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointments, isLoading: isLoadingAppointments } = useAppointments({ date: today });
  const updateStatus = useUpdateAppointmentStatus();

  const handleConfirmPresence = async (patientId: number) => {
    const appointment = appointments?.find(apt => 
      apt.patientId === patientId && 
      !['cancelado', 'finalizado', 'presente'].includes(apt.status)
    );

    if (appointment) {
      await updateStatus.mutateAsync({ 
        id: appointment.id, 
        status: 'presente' 
      });
    }
  };

  const getPatientAppointment = (patientId: number) => {
    return appointments?.find(apt => apt.patientId === patientId);
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    'agendado': { label: 'Agendado', color: 'bg-blue-100 text-blue-700', icon: Clock },
    'presente': { label: 'Aguardando', color: 'bg-orange-100 text-orange-700', icon: User },
    'em_atendimento': { label: 'Em Atendimento', color: 'bg-purple-100 text-purple-700', icon: Loader2 },
    'finalizado': { label: 'Finalizado', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    'cancelado': { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: AlertCircle },
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
                      >
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-primary font-bold text-xl border border-primary/10 shadow-sm">
                              {patient.name.charAt(0)}
                            </div>
                            {apt && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-slate-100 flex items-center justify-center shadow-sm">
                                <Calendar className="w-3 h-3 text-primary" />
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-1">
                            <h3 className="font-bold text-slate-900 text-lg group-hover:text-primary transition-colors">
                              {patient.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5" />
                                {patient.phone || "Sem telefone"}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                CPF: {patient.cpf || "---"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {apt ? (
                            <div className="flex items-center gap-4">
                              <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-slate-700">{apt.startTime}</p>
                                <p className="text-xs text-slate-400">Dr. {apt.doctor.name}</p>
                              </div>
                              
                              <Badge className={cn("px-3 py-1 rounded-lg border-none shadow-none font-semibold flex items-center gap-1.5", statusInfo?.color)}>
                                {statusInfo && <statusInfo.icon className="w-3.5 h-3.5" />}
                                {statusInfo?.label}
                              </Badge>

                              {canCheckIn ? (
                                <Button 
                                  size="sm"
                                  className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 active:scale-95 transition-all"
                                  onClick={() => handleConfirmPresence(patient.id)}
                                  disabled={updateStatus.isPending}
                                >
                                  {updateStatus.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      Confirmar Presença
                                      <ArrowRight className="w-4 h-4 ml-2" />
                                    </>
                                  )}
                                </Button>
                              ) : apt.status === 'presente' ? (
                                <div className="h-10 px-4 rounded-xl bg-green-50 text-green-600 flex items-center gap-2 font-bold text-sm border border-green-100">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmado
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <div className="flex flex-col items-end gap-1">
                              <Badge variant="outline" className="text-slate-400 border-slate-200">Sem agendamento hoje</Badge>
                              <Button variant="link" className="h-auto p-0 text-xs text-primary font-bold">Criar Encaixe</Button>
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
                  <Button size="lg" className="rounded-2xl px-8 shadow-xl shadow-primary/20">
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
              <p className="text-2xl font-bold text-slate-800">{appointments?.length || 0}</p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total do Dia</p>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">
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
              <p className="text-2xl font-bold text-slate-800">
                {appointments?.filter(a => a.status === 'finalizado').length || 0}
              </p>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Atendidos</p>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
