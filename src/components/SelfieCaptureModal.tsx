import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, AlertCircle, ShieldCheck, Check } from "lucide-react";

interface SelfieCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (selfieBase64: string) => void;
  employeeName?: string;
}

export function SelfieCaptureModal({
  open,
  onOpenChange,
  onCapture,
  employeeName,
}: SelfieCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string>("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [startingCamera, setStartingCamera] = useState(false);

  // Start front camera
  const startCamera = async () => {
    setCameraError("");
    setCapturedImage(null);
    setStartingCamera(true);

    // Stop existing stream if any
    stopCamera();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      let msg = "Could not access front camera.";
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        msg = "Camera permission was denied. Please allow camera access in browser settings to verify your identity.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        msg = "No front camera found on this device.";
      }
      setCameraError(msg);
    } finally {
      setStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setCapturedImage(null);
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  // Capture frame and compress to 400x400 JPEG with timestamp watermark
  const handleCapture = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    const size = 480;
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Center crop square from video stream
    const vWidth = video.videoWidth || 640;
    const vHeight = video.videoHeight || 480;
    const minDim = Math.min(vWidth, vHeight);
    const startX = (vWidth - minDim) / 2;
    const startY = (vHeight - minDim) / 2;

    // Draw video frame to canvas
    ctx.drawImage(video, startX, startY, minDim, minDim, 0, 0, size, size);

    // Add subtle watermark with date, time, and company tag
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(0, size - 36, size, 36);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px sans-serif";
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const dateStr = now.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
    ctx.fillText(`${dateStr} ${timeStr} IST • Gemshine Verified`, 12, size - 14);

    // Compress to lightweight JPEG (quality 0.7 -> ~35-40 KB)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedImage(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    onCapture(capturedImage);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Photo Verification</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Take a quick live selfie to confirm your attendance
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {cameraError ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 text-center space-y-3">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
              <p className="text-sm font-medium text-destructive">{cameraError}</p>
              <p className="text-xs text-muted-foreground">
                Live photo capture is required to prevent proxy check-in.
              </p>
              <Button size="sm" variant="outline" onClick={startCamera}>
                <RefreshCw className="h-4 w-4 mr-2" /> Try Again
              </Button>
            </div>
          ) : (
            <div className="relative aspect-square w-full max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black shadow-inner border-2 border-border">
              {capturedImage ? (
                <img
                  src={capturedImage}
                  alt="Captured Selfie"
                  className="w-full h-full object-cover"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    autoPlay
                    className="w-full h-full object-cover -scale-x-100"
                  />
                  {/* Face outline guide */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-60 rounded-[50%] border-2 border-dashed border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                  </div>
                  <div className="absolute bottom-3 inset-x-0 text-center">
                    <span className="text-[11px] font-medium bg-black/60 text-white px-3 py-1 rounded-full backdrop-blur-sm">
                      Align your face inside the frame
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Encrypted • Auto-deleted after 30 days</span>
          </div>

          <DialogFooter className="flex sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>

            {capturedImage ? (
              <>
                <Button type="button" variant="outline" onClick={handleRetake}>
                  <RefreshCw className="h-4 w-4 mr-1.5" /> Retake
                </Button>
                <Button
                  type="button"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  onClick={handleConfirm}
                >
                  <Check className="h-4 w-4 mr-1.5" /> Use Photo
                </Button>
              </>
            ) : (
              <Button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                onClick={handleCapture}
                disabled={startingCamera || !!cameraError}
              >
                <Camera className="h-4 w-4 mr-1.5" /> Capture Selfie
              </Button>
            )}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
