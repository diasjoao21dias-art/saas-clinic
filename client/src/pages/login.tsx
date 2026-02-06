import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Stethoscope, Activity, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login, isLoggingIn, user } = useAuth();
  const [, setLocation] = useLocation();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') setLocation('/admin/dashboard');
      else if (user.role === 'doctor') setLocation('/doctor/dashboard');
      else setLocation('/reception/dashboard');
    }
  }, [user, setLocation]);

  function onSubmit(values: z.infer<typeof loginSchema>) {
    login(values);
  }

  // Pre-fill helpers for demo
  const fillCredentials = (role: string) => {
    form.setValue("username", role);
    form.setValue("password", role); // Assuming password matches username for demo seeds
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Left Side - Visual */}
      <div className="hidden lg:flex flex-col justify-center items-center bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] opacity-10 bg-cover bg-center mix-blend-overlay" />
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-8 backdrop-blur-sm">
            <Stethoscope className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-display font-bold mb-6">MediFlow Clinic Management</h1>
          <p className="text-lg text-blue-100 leading-relaxed">
            Streamline your medical practice with our comprehensive solution for patient care, scheduling, and clinical records.
          </p>
          
          <div className="grid grid-cols-3 gap-4 mt-12">
            {[
              { icon: Activity, label: "Real-time Vitals" },
              { icon: ShieldCheck, label: "Secure Records" },
              { icon: Stethoscope, label: "Clinical Tools" }
            ].map((item, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                <item.icon className="w-6 h-6 mx-auto mb-2" />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-slate-900">Welcome back</h2>
            <p className="text-slate-500 mt-2">Please sign in to access your account</p>
          </div>

          <Card className="border-none shadow-xl shadow-slate-200/50">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>Use your staff credentials to continue</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter username" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                    disabled={isLoggingIn}
                  >
                    {isLoggingIn ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <div className="text-center space-y-4">
            <p className="text-sm text-slate-400 uppercase tracking-wider font-medium text-xs">Demo Accounts</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={() => fillCredentials('admin')}>Admin</Button>
              <Button variant="outline" size="sm" onClick={() => fillCredentials('doctor')}>Doctor</Button>
              <Button variant="outline" size="sm" onClick={() => fillCredentials('operator')}>Reception</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
