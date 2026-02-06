import LayoutShell from "@/components/layout-shell";
import { usePatients, useCreatePatient } from "@/hooks/use-patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, User } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { z } from "zod";
import { format } from "date-fns";

export default function PatientDirectory() {
  const [search, setSearch] = useState("");
  const { data: patients, isLoading } = usePatients(search);
  const [open, setOpen] = useState(false);
  const createPatient = useCreatePatient();

  const form = useForm<z.infer<typeof insertPatientSchema>>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      cpf: "",
      birthDate: "",
      phone: "",
      email: "",
      gender: "",
      address: "",
      clinicId: 1, // Hardcoded for demo
    }
  });

  const onSubmit = async (data: z.infer<typeof insertPatientSchema>) => {
    await createPatient.mutateAsync(data);
    setOpen(false);
    form.reset();
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Patient Directory</h1>
            <p className="text-muted-foreground mt-1">Manage patient records and information</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="w-5 h-5 mr-2" />
                Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Register New Patient</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-2">
                          <FormLabel>Full Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cpf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF / ID</FormLabel>
                          <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createPatient.isPending}>
                      {createPatient.isPending ? "Creating..." : "Create Patient Record"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="border-none shadow-sm">
          <div className="p-4 border-b">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, CPF, or phone..." 
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 hover:bg-slate-50">
                  <TableHead className="w-[300px]">Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Birth Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients?.map((patient) => (
                  <TableRow key={patient.id} className="group hover:bg-blue-50/30">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <div>
                          <p>{patient.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {patient.cpf || "N/A"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{patient.phone}</p>
                        <p className="text-muted-foreground">{patient.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(patient.birthDate), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!patients?.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No patients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </LayoutShell>
  );
}
