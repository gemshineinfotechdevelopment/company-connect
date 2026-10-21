import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, AlertCircle, Loader2 } from "lucide-react";

interface LateCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
  loading: boolean;
}

const QUICK_REASONS = [
  "Traffic Delay",
  "Personal Emergency",
  "Medical / Doctor Appointment",
  "Public Transport Delay",
  "Bad Weather / Rain",
];

export function LateCheckInModal({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: LateCheckInModalProps) {
  const [reason, setReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onConfirm(reason.trim());
    setReason("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Late Check-In Request</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Current time is past 10:15 AM cut-off
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            <p className="leading-relaxed">
              Check-ins after <strong>10:15 AM</strong> cannot be recorded directly. Your request
              will be sent to the <strong>Admin</strong> for verification and approval.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground mb-1.5 block">
              Reason for Late Arrival <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                    reason === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <Textarea
              placeholder="Explain why you are checking in late..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[80px] resize-none text-sm"
              required
            />
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium"
              disabled={loading || !reason.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit to Admin
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
