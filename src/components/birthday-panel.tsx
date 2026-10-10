import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatBirthday, isBirthdayToday } from "@/lib/birthday";

interface BirthdayItem {
  id: string;
  name: string;
  designation?: string;
  dateOfBirth?: string;
  avatarUrl?: string;
}

interface BirthdayPanelProps {
  title: string;
  employees: BirthdayItem[];
  highlightToday?: boolean;
}

export function BirthdayPanel({ title, employees, highlightToday = false }: BirthdayPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <span>🎂</span> {title}
        </CardTitle>
        {employees.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {employees.length} {employees.length === 1 ? "person" : "persons"}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {employees.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            No upcoming birthdays.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {employees.map((employee) => {
              const isToday = highlightToday && isBirthdayToday(employee.dateOfBirth);

              return (
                <div
                  key={employee.id}
                  className={`flex items-center justify-between rounded-xl border p-3 transition-all ${
                    isToday
                      ? "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-sm ring-1 ring-emerald-500/30"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 shrink-0">
                      {employee.avatarUrl && (
                        <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {employee.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate" title={employee.name}>
                        {employee.name}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {employee.designation ?? "Employee"}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                      {formatBirthday(employee.dateOfBirth)}
                    </span>
                    {isToday && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                        Today 🎉
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

