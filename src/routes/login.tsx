import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { login, currentUser } = useStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@gemshine.dev");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      navigate({ to: currentUser.role === "admin" ? "/app/admin" : "/app/dashboard" });
    }
  }, [currentUser, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const u = await login(email, password);
    setLoading(false);
    if (!u) {
      toast.error("Invalid credentials");
      return;
    }
    toast.success(`Welcome, ${u.name.split(" ")[0]}`);
    navigate({ to: u.role === "admin" ? "/app/admin" : "/app/dashboard" });
  };

  const fillDemo = (role: "admin" | "employee") => {
    if (role === "admin") {
      setEmail("admin@example.com");
      setPassword("password123");
    } else {
      setEmail("employee@example.com");
      setPassword("password123");
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-md bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold tracking-tight">Gemshine Infotech</span>
        </div>
        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            One portal for your team's day.
          </h1>
          <p className="text-sm text-primary-foreground/80 leading-relaxed">
            Attendance, leave, work-from-home requests and team chat — all in one crisp, modern
            workspace built for IT teams.
          </p>
          <div className="grid grid-cols-3 gap-3 pt-4">
            {["Attendance", "Leave & WFH", "Team Chat"].map((label) => (
              <div
                key={label}
                className="rounded-lg border border-primary-foreground/15 bg-primary-foreground/5 px-3 py-2.5 text-xs font-medium"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} Gemshine Infotech
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm space-y-7">
          <div className="lg:hidden flex items-center gap-2.5 mb-2">
            <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-semibold tracking-tight">Gemshine Infotech</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your work email to access the portal.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@gemshine.dev"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="rounded-lg border border-border bg-muted/40 p-3.5 space-y-2">
            <div className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
              Demo accounts
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fillDemo("admin")}
                className="flex-1 text-left rounded-md bg-background border border-border px-2.5 py-2 text-xs hover:border-primary transition-colors"
              >
                <div className="font-medium">Admin</div>
                <div className="text-muted-foreground truncate">admin@example.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillDemo("employee")}
                className="flex-1 text-left rounded-md bg-background border border-border px-2.5 py-2 text-xs hover:border-primary transition-colors"
              >
                <div className="font-medium">Employee</div>
                <div className="text-muted-foreground truncate">employee@example.com </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
