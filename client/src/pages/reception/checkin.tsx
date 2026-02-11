import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ClipboardList, UserPlus, ArrowRight } from "lucide-react";
import { useState } from "react";
import { usePatients } from "@/hooks/use-patients";

export default function CheckInPage() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = usePatients(search);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Check-in Rápido</h1>
          <p className="text-muted-foreground mt-1">Localize o paciente para iniciar o atendimento</p>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              Buscar Paciente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input 
                placeholder="Digite o nome, CPF ou telefone do paciente..." 
                className="pl-11 h-12 text-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="grid gap-4">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando pacientes...</div>
              ) : patients?.length ? (
                patients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-100 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-primary font-bold text-lg border border-slate-100">
                        {patient.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">CPF: {patient.cpf || "Não informado"}</p>
                      </div>
                    </div>
                    <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                      Confirmar Presença
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                ))
              ) : search ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                  <UserPlus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Paciente não encontrado</p>
                  <p className="text-sm text-muted-foreground mb-4">Verifique os dados ou cadastre um novo paciente</p>
                  <Button variant="outline">Cadastrar Novo Paciente</Button>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p>Inicie a busca para realizar o check-in</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
