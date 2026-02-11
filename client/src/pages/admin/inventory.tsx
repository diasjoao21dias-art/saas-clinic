import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Package, Plus, ArrowUpRight, ArrowDownRight, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function InventoryPage() {
  const { toast } = useToast();
  const { data: items, isLoading } = useQuery<any[]>({ queryKey: ["/api/inventory"] });

  const addTransactionMutation = useMutation({
    mutationFn: async (tx: any) => {
      await apiRequest("POST", "/api/inventory/transaction", tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({ title: "Sucesso", description: "Estoque atualizado." });
    },
  });

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Estoque e Insumos</h1>
        <Button data-testid="button-add-item">
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {items?.map((item) => (
          <Card key={item.id} className={item.quantity <= item.minQuantity ? "border-destructive/50" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{item.name}</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.quantity} {item.unit}</div>
              <div className="flex items-center mt-1">
                {item.quantity <= item.minQuantity && (
                  <Badge variant="destructive" className="text-[10px] py-0">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Estoque Baixo
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => addTransactionMutation.mutate({ inventoryId: item.id, type: 'entrada', quantity: 1 })}>
                  <Plus className="w-3 h-3 mr-1" /> Entrada
                </Button>
                <Button size="sm" variant="outline" className="flex-1" onClick={() => addTransactionMutation.mutate({ inventoryId: item.id, type: 'saida', quantity: 1 })}>
                  <ArrowDownRight className="w-3 h-3 mr-1" /> Saída
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Itens</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Quantidade</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="capitalize">{item.category}</TableCell>
                  <TableCell>{item.quantity} {item.unit}</TableCell>
                  <TableCell>{item.minQuantity} {item.unit}</TableCell>
                  <TableCell>
                    {item.quantity <= item.minQuantity ? (
                      <Badge variant="destructive">Reposição Necessária</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600">Normal</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
