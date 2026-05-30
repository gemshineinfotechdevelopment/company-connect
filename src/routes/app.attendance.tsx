import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  checkIn,
  checkOut,
  fetchTodayAttendance,
  fetchMonthlyAttendance,
  fetchAllAttendance,
  fetchMonthlySummaries
} from "@/lib/attendanceService";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStatusBadgeClass } from "@/lib/attendanceUtils";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export const Route = createFileRoute("/app/attendance")({
  component: AttendancePage,
});

function fmt(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function AttendancePage() {
  const { currentUser } = useStore();
  
  if (!currentUser) return <Navigate to="/login" />;
  if (currentUser.role === "admin") return <Navigate to="/app/admin/attendance" />;

  const [todayRecord, setTodayRecord] = useState<any>(null);
  
  // Tabs & Views
  const [tab, setTab] = useState("list");
  
  // Filters
  const [viewMode, setViewMode] = useState<"month" | "all">("all");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [statusFilter, setStatusFilter] = useState<"all" | "PRESENT" | "ABSENT" | "WFH" | "LEAVE">("all");
  
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Summaries
  const [summaries, setSummaries] = useState<any[]>([]);
  const [summaryMonth, setSummaryMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [summaryYear, setSummaryYear] = useState(String(new Date().getFullYear()));

  // Calendar logic
  const [calendarRecords, setCalendarRecords] = useState<any[]>([]);

  const fetchToday = async () => {
    try {
      const res = await fetchTodayAttendance();
      if (res.data?.attendance) {
        setTodayRecord(res.data.attendance);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchToday();
  }, []);

  const handleCheckIn = async () => {
    try {
      await checkIn();
      toast.success("Checked in successfully!");
      fetchToday();
      if (tab === "list") loadRecords();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to check in");
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut();
      toast.success("Checked out successfully!");
      fetchToday();
      if (tab === "list") loadRecords();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Failed to check out");
    }
  };

  const hasCheckedIn = !!todayRecord?.checkInTime;
  const hasCheckedOut = !!todayRecord?.checkOutTime;

  // List View Loading
  const loadRecords = async () => {
    setLoading(true);
    try {
      if (viewMode === "month") {
        const data = await fetchMonthlyAttendance(month, year);
        setRecords(data.data?.records || data.records || []);
      } else {
        const data = await fetchAllAttendance();
        setRecords(data.data?.records || data.records || []);
      }
      setPage(1);
    } catch (err: any) {
      toast.error(err.message || "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "list") {
      loadRecords();
    }
  }, [viewMode, month, year, tab]);

  // Summaries Loading
  const loadSummaries = async () => {
    try {
      const data = await fetchMonthlySummaries(summaryMonth, summaryYear);
      setSummaries(data.data?.summaries || data.summaries || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load summaries");
    }
  };

  useEffect(() => {
    if (tab === "summary") {
      loadSummaries();
    }
  }, [tab, summaryMonth, summaryYear]);

  // Calendar Loading
  const loadCalendarMonth = async (m: string, y: string) => {
    try {
      const data = await fetchMonthlyAttendance(m, y);
      setCalendarRecords(data.data?.records || data.records || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDatesSet = (arg: any) => {
    const d = arg.view.currentStart;
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const y = String(d.getFullYear());
    loadCalendarMonth(m, y);
  };

  const calendarEvents = useMemo(() => {
    return calendarRecords.map(r => {
      let color = "#9ca3af"; // default gray
      if (r.status === "PRESENT") color = "#22c55e";
      if (r.status === "WFH") color = "#3b82f6";
      if (r.status === "LEAVE") color = "#eab308";
      
      return {
        title: r.status,
        date: r.date,
        allDay: true,
        color
      };
    });
  }, [calendarRecords]);

  // Pagination
  const filteredByStatus = useMemo(() => {
    if (statusFilter === "all") return records;
    return records.filter(r => r.status === statusFilter);
  }, [records, statusFilter]);

  const totalPages = Math.ceil(filteredByStatus.length / itemsPerPage);
  const paginatedRecords = filteredByStatus.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return (
    <div className="p-6 sm:p-8 max-w-6xl mx-auto space-y-6">
      <PageHeader 
        title="Attendance Management" 
        description="View your attendance history and manage records." 
      />

      <Card className="shadow-md border-0 ring-1 ring-black/5 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="flex gap-8">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Today's Status</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{todayRecord?.status || "NOT MARKED"}</span>
                  {todayRecord?.status && (
                    <span className={`w-3 h-3 rounded-full ${todayRecord.status === 'PRESENT' ? 'bg-green-500' : todayRecord.status === 'WFH' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Check In</p>
                <p className="text-xl font-bold">{fmt(todayRecord?.checkInTime)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Check Out</p>
                <p className="text-xl font-bold">{fmt(todayRecord?.checkOutTime)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-xl font-bold">{todayRecord?.totalHours !== undefined ? `${todayRecord.totalHours} hrs` : "—"}</p>
              </div>
            </div>
            
            <div className="flex gap-4 w-full md:w-auto">
              <Button
                onClick={handleCheckIn}
                disabled={hasCheckedIn}
                className="flex-1 md:flex-none w-32"
                size="lg"
              >
                Check In
              </Button>
              <Button
                variant="outline"
                onClick={handleCheckOut}
                disabled={!hasCheckedIn || hasCheckedOut}
                className="flex-1 md:flex-none w-32 bg-white"
                size="lg"
              >
                Check Out
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
          <TabsTrigger value="summary">Monthly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-1.5">
                <Label>Filter By</Label>
                <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Records</SelectItem>
                    <SelectItem value="month">Month & Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="PRESENT">Present</SelectItem>
                    <SelectItem value="ABSENT">Absent</SelectItem>
                    <SelectItem value="WFH">Work From Home</SelectItem>
                    <SelectItem value="LEAVE">Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {viewMode === "month" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Month</Label>
                    <Select value={month} onValueChange={setMonth}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 12}).map((_, i) => {
                          const m = String(i + 1).padStart(2, "0");
                          return <SelectItem key={m} value={m}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Year</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Array.from({length: 5}).map((_, i) => {
                          const y = String(new Date().getFullYear() - 2 + i);
                          return <SelectItem key={y} value={y}>{y}</SelectItem>
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Total Hrs</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                        No attendance records found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedRecords.map((r: any) => (
                      <TableRow key={r._id}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell>{fmt(r.checkInTime)}</TableCell>
                        <TableCell>{fmt(r.checkOutTime)}</TableCell>
                        <TableCell>{r.totalHours ? `${r.totalHours}h` : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getStatusBadgeClass(r.status)}`}>
                            {r.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              
              {!loading && totalPages > 1 && (
                <div className="p-4 border-t flex justify-end gap-2 items-center">
                  <span className="text-xs text-muted-foreground mr-4">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardContent className="p-4">
              <div className="min-h-[600px]">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  events={calendarEvents}
                  datesSet={handleDatesSet}
                  height="auto"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth'
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-end justify-start">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={summaryMonth} onValueChange={setSummaryMonth}>
                  <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 12}).map((_, i) => {
                      const m = String(i + 1).padStart(2, "0");
                      return <SelectItem key={m} value={m}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={summaryYear} onValueChange={setSummaryYear}>
                  <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({length: 5}).map((_, i) => {
                      const y = String(new Date().getFullYear() - 2 + i);
                      return <SelectItem key={y} value={y}>{y}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-center">Worked Days</TableHead>
                    <TableHead className="text-center">Present</TableHead>
                    <TableHead className="text-center">WFH</TableHead>
                    <TableHead className="text-center">Leave</TableHead>
                    <TableHead className="text-center">Absent</TableHead>
                    <TableHead className="text-right">Total Hrs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        No monthly summary generated yet for this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    summaries.map((s: any) => (
                      <TableRow key={s._id}>
                        <TableCell className="text-center font-bold">{s.totalWorkedDays}</TableCell>
                        <TableCell className="text-center text-green-600">{s.totalPresent}</TableCell>
                        <TableCell className="text-center text-blue-600">{s.totalWfh}</TableCell>
                        <TableCell className="text-center text-yellow-600">{s.totalLeave}</TableCell>
                        <TableCell className="text-center text-red-600">{s.totalAbsent}</TableCell>
                        <TableCell className="text-right font-medium">{s.totalHours ? `${s.totalHours}h` : "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
