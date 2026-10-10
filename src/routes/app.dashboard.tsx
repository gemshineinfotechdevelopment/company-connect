import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { BirthdayPanel } from "@/components/birthday-panel";
import { BirthdayPopup } from "@/components/birthday-popup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, LogOut, Loader2 } from "lucide-react";
import { getUpcomingBirthdays, isBirthdayToday } from "@/lib/birthday";
import {
  checkIn,
  checkOut,
  fetchTodayAttendance,
  fetchCompanySettings,
} from "@/lib/attendanceService";
import { toast } from "sonner";

export const Route = createFileRoute("/app/dashboard")({
  component: EmployeeDashboard,
});

function formatTime(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function getClientMetadata() {
  const userAgent = navigator.userAgent;
  let browser = "Unknown Browser";
  let os = "Unknown OS";

  if (userAgent.indexOf("Firefox") > -1) browser = "Mozilla Firefox";
  else if (userAgent.indexOf("SamsungBrowser") > -1) browser = "Samsung Internet";
  else if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) browser = "Opera";
  else if (userAgent.indexOf("Trident") > -1) browser = "Microsoft Internet Explorer";
  else if (userAgent.indexOf("Edge") > -1) browser = "Microsoft Edge";
  else if (userAgent.indexOf("Chrome") > -1) browser = "Google Chrome";
  else if (userAgent.indexOf("Safari") > -1) browser = "Apple Safari";

  if (userAgent.indexOf("Windows") > -1) os = "Windows";
  else if (userAgent.indexOf("Macintosh") > -1) os = "macOS";
  else if (userAgent.indexOf("Android") > -1) os = "Android";
  else if (userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) os = "iOS";
  else if (userAgent.indexOf("Linux") > -1) os = "Linux";

  return {
    deviceInfo: `${os} Device`,
    browserDetails: browser,
  };
}

function EmployeeDashboard() {
  const { currentUser, state } = useStore();
  const [birthdayModalOpen, setBirthdayModalOpen] = useState(false);
  const [todayRecord, setTodayRecord] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [employeeCoords, setEmployeeCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number;
  } | null>(null);
  const [isInsideRadius, setIsInsideRadius] = useState<boolean | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const today = useMemo(() => new Date(), []);
  const todayKey = `gemshine.birthday-popup-seen.${currentUser?.id ?? ""}`;
  const employees = state.users.filter((u) => u.status !== "inactive");
  const upcomingBirthdays = useMemo(
    () => getUpcomingBirthdays(employees, 30, today),
    [employees, today],
  );
  const todayBirthdays = useMemo(
    () => employees.filter((u) => isBirthdayToday(u.dateOfBirth, today)),
    [employees, today],
  );

  const fetchToday = async () => {
    try {
      const res = await fetchTodayAttendance();
      if (res.data?.attendance) {
        setTodayRecord(res.data.attendance);
      } else {
        setTodayRecord(null);
      }
    } catch (e) {
      console.error("Failed to fetch today attendance", e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetchCompanySettings();
      if (res.data?.settings) {
        setCompanySettings(res.data.settings);
      }
    } catch (e) {
      console.error("Failed to fetch company settings", e);
    }
  };

  const acquireLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEmployeeCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        console.warn("Geolocation warning:", err);
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  useEffect(() => {
    fetchToday();
    fetchSettings();
    acquireLocation();
  }, []);

  useEffect(() => {
    if (employeeCoords && companySettings) {
      const dist = getDistanceFromLatLonInM(
        employeeCoords.latitude,
        employeeCoords.longitude,
        companySettings.latitude,
        companySettings.longitude,
      );
      setIsInsideRadius(dist <= companySettings.allowedRadius);
    }
  }, [employeeCoords, companySettings]);

  useEffect(() => {
    if (!currentUser || todayBirthdays.length === 0) return;
    try {
      const seenDate = localStorage.getItem(todayKey);
      const todayString = today.toISOString().slice(0, 10);
      if (seenDate !== todayString) {
        setBirthdayModalOpen(true);
      }
    } catch {
      setBirthdayModalOpen(true);
    }
  }, [currentUser, todayBirthdays.length, todayKey, today]);

  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === "admin") return <Navigate to="/app/admin" />;

  const closeBirthdayModal = () => {
    try {
      localStorage.setItem(todayKey, today.toISOString().slice(0, 10));
    } catch {
      // ignore
    }
    setBirthdayModalOpen(false);
  };

  const myLeaves = state.leaves.filter((l) => l.userId === currentUser.id);
  const myWfh = state.wfh.filter((w) => w.userId === currentUser.id);

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;

  const status = todayRecord
    ? hasCheckedOut
      ? "Completed"
      : hasCheckedIn
        ? todayRecord.status === "WFH"
          ? "WFH Active"
          : "Checked in"
        : "Not marked"
    : "Not marked";

  const handleCheckIn = async () => {
    if (companySettings && companySettings.enforceGeofencing && isInsideRadius === false) {
      toast.error("You are outside the company location. Check-In not allowed.");
      return;
    }

    setCheckingIn(true);
    try {
      const metadata = getClientMetadata();
      const payload = {
        latitude: employeeCoords?.latitude ?? 0,
        longitude: employeeCoords?.longitude ?? 0,
        accuracy: employeeCoords?.accuracy ?? 0,
        ...metadata,
      };

      await checkIn(payload);
      toast.success("Checked in successfully!");
      await fetchToday();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to check in");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    setCheckingOut(true);
    try {
      const metadata = getClientMetadata();
      const payload = {
        latitude: employeeCoords?.latitude ?? 0,
        longitude: employeeCoords?.longitude ?? 0,
        accuracy: employeeCoords?.accuracy ?? 0,
        ...metadata,
      };

      await checkOut(payload);
      toast.success("Checked out successfully!");
      await fetchToday();
    } catch (e: any) {
      toast.error(e.response?.data?.message || e.message || "Failed to check out");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <PageHeader
        title={`Hello, ${currentUser.name.split(" ")[0]}`}
        description="Here's a snapshot of your day."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Today"
          value={status}
          icon={<Clock className="h-4 w-4" />}
          tone={
            status === "Completed"
              ? "success"
              : status === "Checked in" || status === "WFH Active"
                ? "primary"
                : "muted"
          }
        />
        <StatCard
          label="Check-in"
          value={formatTime(todayRecord?.checkInTime)}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <StatCard
          label="Check-out"
          value={formatTime(todayRecord?.checkOutTime)}
          icon={<LogOut className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Today's attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-row gap-4">
              <div className="flex-1 rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">Check in</div>
                <div className="text-xl font-semibold mt-1">
                  {formatTime(todayRecord?.checkInTime)}
                </div>
              </div>
              <div className="flex-1 rounded-lg border border-border p-4">
                <div className="text-xs text-muted-foreground">Check out</div>
                <div className="text-xl font-semibold mt-1">
                  {formatTime(todayRecord?.checkOutTime)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCheckIn} disabled={hasCheckedIn || checkingIn}>
                {checkingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check in
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut || checkingOut}
              >
                {checkingOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Check out
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {myLeaves.slice(0, 3).map((l) => (
              <div key={l.id} className="flex items-start justify-between gap-3">
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-medium">Leave · {l.fromDate}</div>
                  <div
                    className="text-xs text-muted-foreground break-words line-clamp-2"
                    title={l.reason}
                  >
                    {l.reason}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  <StatusBadge status={l.status} />
                </div>
              </div>
            ))}
            {myWfh.slice(0, 2).map((w) => (
              <div key={w.id} className="flex items-start justify-between gap-3">
                <div className="text-sm flex-1 min-w-0">
                  <div className="font-medium">WFH · {w.date}</div>
                  <div
                    className="text-xs text-muted-foreground break-words line-clamp-2"
                    title={w.reason}
                  >
                    {w.reason}
                  </div>
                </div>
                <div className="shrink-0 mt-0.5">
                  <StatusBadge status={w.status} />
                </div>
              </div>
            ))}
            {myLeaves.length === 0 && myWfh.length === 0 && (
              <div className="text-sm text-muted-foreground">No requests yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <BirthdayPanel title="Upcoming Birthdays" employees={upcomingBirthdays} highlightToday />
      </div>

      <BirthdayPopup
        open={birthdayModalOpen}
        onOpenChange={(open) => {
          if (!open) closeBirthdayModal();
          else setBirthdayModalOpen(true);
        }}
        birthdaysToday={todayBirthdays}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "primary" | "success" | "muted";
}) {
  const toneCls = {
    default: "bg-card",
    primary: "bg-primary-soft",
    success: "bg-[color:var(--success)]/10",
    muted: "bg-muted",
  }[tone];

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div
          className={`h-7 w-7 rounded-md flex items-center justify-center text-accent-foreground ${toneCls}`}
        >
          {icon}
        </div>
      </div>
      <div className="text-xl font-semibold mt-2 tracking-tight">{value}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending: { label: "Pending", cls: "bg-warning/15 text-warning-foreground border-warning/30" },
    approved: { label: "Approved", cls: "bg-success/15 text-success border-success/30" },
    rejected: {
      label: "Rejected",
      cls: "bg-destructive/15 text-destructive border-destructive/30",
    },
  } as const;
  const { label, cls } = map[status];
  return (
    <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${cls}`}>
      {label}
    </Badge>
  );
}

