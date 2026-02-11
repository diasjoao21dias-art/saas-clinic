import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { InsertAppointment } from "@shared/schema";

interface AppointmentFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  doctorId?: number;
  status?: string;
}

export function useAppointments(filters?: AppointmentFilters) {
  return useQuery({
    queryKey: [api.appointments.list.path, filters],
    queryFn: async () => {
      let url = api.appointments.list.path;
      if (filters) {
        const params = new URLSearchParams();
        if (filters.date) params.append("date", filters.date);
        if (filters.startDate) params.append("startDate", filters.startDate);
        if (filters.endDate) params.append("endDate", filters.endDate);
        if (filters.doctorId) params.append("doctorId", filters.doctorId.toString());
        if (filters.status) params.append("status", filters.status);
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return api.appointments.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertAppointment) => {
      const res = await fetch(api.appointments.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to schedule appointment");
      }
      return api.appointments.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Success", description: "Appointment scheduled" });
    },
  });
}

export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      id, 
      status, 
      paymentMethod, 
      paymentStatus 
    }: { 
      id: number, 
      status: string,
      paymentMethod?: string,
      paymentStatus?: string
    }) => {
      const url = buildUrl(api.appointments.updateStatus.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, paymentMethod, paymentStatus }),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      return api.appointments.updateStatus.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
    },
  });
}
