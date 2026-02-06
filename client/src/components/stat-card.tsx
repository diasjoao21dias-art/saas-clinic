import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  color?: "primary" | "accent" | "purple" | "orange";
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  className,
  color = "primary"
}: StatCardProps) {
  
  const colors = {
    primary: "bg-blue-50 text-blue-600 border-blue-100",
    accent: "bg-teal-50 text-teal-600 border-teal-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
  };

  return (
    <Card className={cn("overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-3xl font-display font-bold text-foreground">{value}</h3>
            {trend && (
              <p className={cn(
                "text-xs mt-2 font-medium flex items-center gap-1",
                trendUp ? "text-green-600" : "text-red-500"
              )}>
                {trendUp ? "↑" : "↓"} {trend}
              </p>
            )}
          </div>
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", colors[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
