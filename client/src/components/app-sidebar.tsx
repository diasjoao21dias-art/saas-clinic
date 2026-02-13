import * as React from "react";
import { 
  Calendar, 
  Home, 
  Inbox, 
  Search, 
  Settings, 
  Users, 
  Building2, 
  Clock, 
  UserPlus, 
  Activity,
  FileText,
  Package,
  CreditCard,
  Calculator,
  LogOut
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"
import { Link, useLocation } from "wouter"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function AppSidebar() {
  const { user, logout } = useAuth()
  const [location] = useLocation()
  const logoutMutation = React.useMemo(() => ({ mutate: logout }), [logout]);

  const receptionItems = [
    { title: "Dashboard", url: "/reception/dashboard", icon: Activity },
    { title: "Agenda", url: "/reception/schedule", icon: Calendar },
    { title: "Pacientes", url: "/reception/patients", icon: UserPlus },
    { title: "Check-in", url: "/reception/checkin", icon: Clock },
  ]

  const doctorItems = [
    { title: "Dashboard", url: "/doctor/dashboard", icon: Activity },
    { title: "Minha Agenda", url: "/doctor/appointments", icon: Calendar },
    { title: "Prescrições", url: "/doctor/prescriptions", icon: FileText },
    { title: "Calculadoras", url: "/doctor/calculators", icon: Calculator },
  ]

  const adminItems = [
    { title: "Usuários", url: "/admin/users", icon: Users },
    { title: "Clínicas", url: "/admin/clinics", icon: Building2 },
    { title: "Estoque", url: "/admin/inventory", icon: Package },
    { title: "Faturamento", url: "/admin/billing", icon: CreditCard },
  ]

  const nurseItems = [
    { title: "Dashboard", url: "/nurse/dashboard", icon: Activity },
    { title: "Agenda", url: "/reception/schedule", icon: Calendar },
    { title: "Pacientes", url: "/reception/patients", icon: UserPlus },
  ]

  const superAdminItems = [
    { title: "Gestão Global", url: "/super-admin", icon: Building2 },
  ]

  const menuItems = user?.role === 'super_admin' ? superAdminItems :
                    user?.role === 'doctor' ? doctorItems : 
                    user?.role === 'operator' ? receptionItems :
                    user?.role === 'nurse' ? nurseItems :
                    [...receptionItems, ...adminItems]

  return (
    <Sidebar>
      <SidebarHeader className="p-4 flex flex-row items-center gap-2 border-b">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold">
          M
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-none">MediFlow</span>
          <span className="text-xs text-muted-foreground mt-1">Gestão de Clínica</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{user?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-medium truncate">{user?.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start gap-2 h-9" 
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
