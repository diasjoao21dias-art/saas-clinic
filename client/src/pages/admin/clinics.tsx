import LayoutShell from "@/components/layout-shell";
import { useQuery } from "@tanstack/react-query";
import { Clinic } from "@shared/schema";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2, Plus, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClinicsManagement() {
  // In a real app, we'd have an endpoint for this. 
  // For the demo, we'll fetch from the users list to get the clinic or use a mock if not available.
  const { data: clinics, isLoading } = useQuery<Clinic[]>({
    queryKey: ["/api/clinics"], // Assuming this endpoint exists or we'll need to mock/stub
    // Mocking for demo if endpoint not found
    initialData: [
      {
        id: 1,
        name: "Clínica Saúde Total",
        address: "Av. Paulista, 1000",
        phone: "(11) 5555-0123",
        subscriptionStatus: "active",
        createdAt: null
      }
    ]
  });

  if (isLoading) {
    return (
      <LayoutShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Gestão de Clínicas</h1>
            <p className="text-muted-foreground mt-1">Gerencie as unidades e assinaturas do sistema</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Clínica
          </Button>
        </div>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle>Unidades Cadastradas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(clinics) && clinics.map((clinic: Clinic) => (
                  <TableRow key={clinic.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          <Building2 className="w-4 h-4" />
                        </div>
                        {clinic.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {clinic.address}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="w-3 h-3" />
                        {clinic.phone}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={clinic.subscriptionStatus === 'active' ? 'default' : 'secondary'} className="capitalize">
                        {clinic.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">Configurar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
