import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Camera, ShieldCheck } from "lucide-react";
import { ApprovalRequest } from "@/lib/approvalService";
import { StatusBadge } from "@/routes/app.dashboard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL !== undefined
    ? import.meta.env.VITE_API_BASE_URL
    : import.meta.env.DEV
      ? "http://localhost:5009"
      : "";

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  isPending: boolean;
}

export function ApprovalCard({ request, onApprove, onReject, isPending }: ApprovalCardProps) {
  const [showSelfieModal, setShowSelfieModal] = useState(false);
  const empName = request.employeeId?.name || "Unknown";
  const empDesignation = request.employeeId?.designation || "Employee";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border bg-card hover:bg-accent/30 transition-colors shadow-sm gap-4">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {empName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4 className="text-sm font-semibold">{empName}</h4>
            <p className="text-xs text-muted-foreground">{empDesignation}</p>
          </div>
          <div className="ml-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                request.requestType === "LEAVE"
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                  : request.requestType === "WFH"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300/50"
              }`}
            >
              {request.requestType === "LATE_CHECKIN" ? "LATE CHECK-IN" : request.requestType}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
          {request.requestType === "LATE_CHECKIN" ? (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date</p>
                <p className="text-sm font-medium">
                  {new Date(request.fromDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Time Requested</p>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {new Date(request.fromDate).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {request.selfieUrl && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Live Photo</p>
                  <button
                    type="button"
                    onClick={() => setShowSelfieModal(true)}
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-card hover:bg-accent text-xs font-medium text-foreground transition-all shadow-xs cursor-pointer group"
                    title="Click to view verified selfie"
                  >
                    <img
                      src={`${API_BASE}${request.selfieUrl}`}
                      alt="Selfie"
                      className="w-5 h-5 rounded-full object-cover border border-border group-hover:scale-105 transition-transform"
                    />
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                      View Photo
                    </span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="text-xs text-muted-foreground mb-1">From Date</p>
                <p className="text-sm font-medium">
                  {new Date(request.fromDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">To Date</p>
                <p className="text-sm font-medium">
                  {new Date(request.toDate).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
          <div className={request.requestType === "LATE_CHECKIN" && request.selfieUrl ? "col-span-2 sm:col-span-1" : "col-span-2 sm:col-span-2"}>
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <p className="text-sm truncate" title={request.reason}>
              {request.reason || "N/A"}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          {isPending ? (
            <span>Applied: {new Date(request.appliedDate).toLocaleDateString()}</span>
          ) : (
            <>
              {request.status === "REJECTED" ? (
                <>
                  <span>
                    Rejected:{" "}
                    {request.approvedDate
                      ? new Date(request.approvedDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span>By: {request.approvedBy?.name || "Admin"}</span>
                </>
              ) : (
                <>
                  <span>
                    Approved:{" "}
                    {request.approvedDate
                      ? new Date(request.approvedDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                  <span>By: {request.approvedBy?.name || "Admin"}</span>
                </>
              )}
              <StatusBadge status={request.status.toLowerCase() as any} />
            </>
          )}
        </div>
      </div>

      {isPending && onApprove && onReject && (
        <div className="flex sm:flex-col gap-2 mt-2 sm:mt-0 border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-4">
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto border-success/40 text-success hover:bg-success/10 bg-success/5"
            onClick={() => onApprove(request._id)}
          >
            <Check className="h-4 w-4 mr-1" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full sm:w-auto border-destructive/40 text-destructive hover:bg-destructive/10 bg-destructive/5"
            onClick={() => onReject(request._id)}
          >
            <X className="h-4 w-4 mr-1" /> Reject
          </Button>
        </div>
      )}

      {/* Selfie Preview Modal */}
      {request.selfieUrl && (
        <Dialog open={showSelfieModal} onOpenChange={setShowSelfieModal}>
          <DialogContent className="sm:max-w-md p-6">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Camera className="h-4 w-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold">
                    Verified Check-In Selfie
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    {empName} • Late Check-In Request
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="mt-2 space-y-3">
              <div className="relative rounded-xl overflow-hidden border border-border bg-black aspect-square flex items-center justify-center shadow-inner">
                <img
                  src={`${API_BASE}${request.selfieUrl}`}
                  alt={`${empName} selfie`}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-2.5 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Captured live via device camera with timestamp watermark.</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
