import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Calculator, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CalculatorsPage() {
  const calculators = [
    { title: "IMC", description: "Cálculo do Índice de Massa Corporal." },
    { title: "Filtração Glomerular", description: "Estimativa da taxa de filtração renal (CKD-EPI)." },
    { title: "Dose Pediátrica", description: "Cálculo de dosagem por peso (mg/kg)." },
    { title: "Risco Cardiovascular", description: "Escore de Framingham ou similar." },
  ];

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Calculadoras Médicas</h1>
          <p className="text-muted-foreground mt-1">Ferramentas de suporte à decisão clínica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculators.map((calc, i) => (
            <Card key={i} className="hover-elevate cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-500" />
                  {calc.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{calc.description}</p>
                <Button variant="outline" className="w-full gap-2">
                  Abrir <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </LayoutShell>
  );
}
