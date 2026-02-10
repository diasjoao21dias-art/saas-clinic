import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function PrescriptionsPage() {
  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Modelos de Receita</h1>
          <p className="text-muted-foreground mt-1">Gerencie e utilize seus modelos de prescrição médica.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar modelos..." className="pl-10" />
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Modelo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: "Receituário Simples", description: "Modelo padrão para medicamentos comuns." },
            { title: "Controle Especial", description: "Para medicamentos de tarja preta ou controlados." },
            { title: "Atestado Médico", description: "Modelo para emissão de atestados de afastamento." },
          ].map((template, i) => (
            <Card key={i} className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {template.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Button variant="ghost" className="w-full mt-4 text-primary font-bold">Usar Modelo</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LayoutShell>
  );
}
