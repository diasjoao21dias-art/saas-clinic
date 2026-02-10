import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function PrescriptionsPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [templates, setTemplates] = useState([
    { title: "Receituário Simples", description: "Modelo padrão para medicamentos comuns.", content: "Rx:\n\n1. [Medicamento] [Dose]\nTomar 1 comprimido VO a cada [Horas]h por [Dias] dias." },
    { title: "Controle Especial", description: "Para medicamentos de tarja preta ou controlados.", content: "RECEITA DE CONTROLE ESPECIAL\n\nRx:\n\n1. [Medicamento Controlado] [Dose]\nTomar conforme orientação médica." },
    { title: "Atestado Médico", description: "Modelo para emissão de atestados de afastamento.", content: "ATESTADO MÉDICO\n\nAtesto para os devidos fins que o(a) Sr(a). [Nome] necessita de [Dias] dias de afastamento das atividades laborais por motivo de doença." },
  ]);

  const handleUseTemplate = (content: string) => {
    localStorage.setItem("selected_template", content);
    alert("Modelo selecionado! Vá para uma consulta para utilizá-lo.");
  };

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
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            Novo Modelo
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template, i) => (
            <Card key={i} className="hover-elevate cursor-pointer group">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-500" />
                  {template.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Button 
                  variant="ghost" 
                  className="w-full mt-4 text-primary font-bold group-hover:bg-primary group-hover:text-white"
                  onClick={() => handleUseTemplate(template.content)}
                >
                  Usar Modelo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Modelo de Prescrição</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título do Modelo</Label>
              <Input placeholder="Ex: Receita Hipertensão" />
            </div>
            <div className="space-y-2">
              <Label>Descrição Curta</Label>
              <Input placeholder="Ex: Padronização para pacientes hipertensos" />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo da Prescrição</Label>
              <Textarea className="min-h-[200px] font-mono" placeholder="Rx: ..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={() => setIsCreateOpen(false)}>Salvar Modelo</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
