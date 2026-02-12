import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Stethoscope, 
  LogOut, 
  UserCircle,
  Menu,
  X,
  Building2,
  ClipboardList,
  FileText,
  Calculator
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {children}
    </div>
  );
}
