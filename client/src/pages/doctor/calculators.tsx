import LayoutShell from "@/components/layout-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function IMCCalculator() {
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const weightNum = parseFloat(weight);
  const heightNum = parseFloat(height) / 100;
  const imc = weightNum && heightNum ? (weightNum / (heightNum * heightNum)).toFixed(1) : null;

  const getIMCStatus = (val: number) => {
    if (val < 18.5) return { label: "Abaixo do peso", color: "text-blue-500" };
    if (val < 25) return { label: "Peso normal", color: "text-green-500" };
    if (val < 30) return { label: "Sobrepeso", color: "text-yellow-500" };
    return { label: "Obesidade", color: "text-red-500" };
  };

  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Peso (kg)</Label>
          <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex: 70" />
        </div>
        <div className="space-y-2">
          <Label>Altura (cm)</Label>
          <Input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="ex: 175" />
        </div>
      </div>
      {imc && (
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">Seu IMC é</p>
          <p className="text-4xl font-bold text-primary my-1">{imc}</p>
          <p className={cn("font-medium", getIMCStatus(parseFloat(imc)).color)}>
            {getIMCStatus(parseFloat(imc)).label}
          </p>
        </div>
      )}
    </div>
  );
}

function GFRCalculator() {
  const [creatinine, setCreatinine] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  
  // Simplified CKD-EPI
  const calculateGFR = () => {
    const cr = parseFloat(creatinine);
    const a = parseFloat(age);
    if (!cr || !a) return null;
    
    let gfr = 141 * Math.min(cr / (gender === 'female' ? 0.7 : 0.9), 1) ** (gender === 'female' ? -0.329 : -0.411) *
              Math.max(cr / (gender === 'female' ? 0.7 : 0.9), 1) ** -1.209 *
              0.993 ** a * (gender === 'female' ? 1.018 : 1);
    return gfr.toFixed(1);
  };

  const gfr = calculateGFR();

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Creatinina Sérica (mg/dL)</Label>
        <Input type="number" value={creatinine} onChange={(e) => setCreatinine(e.target.value)} placeholder="ex: 1.0" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Idade</Label>
          <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="ex: 45" />
        </div>
        <div className="space-y-2">
          <Label>Sexo</Label>
          <select 
            className="w-full h-10 px-3 rounded-md border border-input bg-background"
            value={gender} 
            onChange={(e) => setGender(e.target.value)}
          >
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>
      </div>
      {gfr && (
        <div className="p-4 bg-slate-50 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">TFG Estimada</p>
          <p className="text-4xl font-bold text-primary my-1">{gfr}</p>
          <p className="text-xs text-muted-foreground">mL/min/1.73m² (CKD-EPI)</p>
        </div>
      )}
    </div>
  );
}

import { cn } from "@/lib/utils";

export default function CalculatorsPage() {
  const [activeCalc, setActiveCalc] = useState<string | null>(null);

  const calculators = [
    { id: "imc", title: "IMC", description: "Cálculo do Índice de Massa Corporal.", component: <IMCCalculator /> },
    { id: "gfr", title: "Filtração Glomerular", description: "Estimativa da taxa de filtração renal (CKD-EPI).", component: <GFRCalculator /> },
    { id: "ped", title: "Dose Pediátrica", description: "Cálculo de dosagem por peso (mg/kg).", component: <div className="py-8 text-center text-muted-foreground">Calculadora em desenvolvimento</div> },
    { id: "cv", title: "Risco Cardiovascular", description: "Escore de Framingham ou similar.", component: <div className="py-8 text-center text-muted-foreground">Calculadora em desenvolvimento</div> },
  ];

  return (
    <LayoutShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900">Calculadoras Médicas</h1>
          <p className="text-muted-foreground mt-1">Ferramentas de suporte à decisão clínica.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {calculators.map((calc) => (
            <Card key={calc.id} className="hover-elevate cursor-pointer group" onClick={() => setActiveCalc(calc.id)}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-green-500" />
                  {calc.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{calc.description}</p>
                <Button variant="outline" className="w-full gap-2 group-hover:bg-primary group-hover:text-white transition-colors">
                  Abrir <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={!!activeCalc} onOpenChange={(open) => !open && setActiveCalc(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{calculators.find(c => c.id === activeCalc)?.title}</DialogTitle>
          </DialogHeader>
          {calculators.find(c => c.id === activeCalc)?.component}
        </DialogContent>
      </Dialog>
    </LayoutShell>
  );
}
