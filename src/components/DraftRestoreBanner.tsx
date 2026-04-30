import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, X } from "lucide-react";

interface DraftRestoreBannerProps {
  updatedAt: number;
  onRestore: () => void;
  onDismiss: () => void;
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const DraftRestoreBanner = ({ updatedAt, onRestore, onDismiss }: DraftRestoreBannerProps) => (
  <Alert className="mb-4 flex items-center justify-between gap-3 border-primary/40">
    <div className="flex items-center gap-2">
      <Clock className="h-4 w-4 text-primary" />
      <AlertDescription className="m-0">
        We saved a draft of your previous work ({formatRelative(updatedAt)}). Restore it?
      </AlertDescription>
    </div>
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={onRestore}>Restore draft</Button>
      <Button size="sm" variant="ghost" onClick={onDismiss} aria-label="Dismiss">
        <X className="h-4 w-4" />
      </Button>
    </div>
  </Alert>
);

interface DraftSavingIndicatorProps {
  isSaving: boolean;
  lastSavedAt: number | null;
}

export const DraftSavingIndicator = ({ isSaving, lastSavedAt }: DraftSavingIndicatorProps) => {
  if (isSaving) return <span className="text-xs text-muted-foreground">Saving draft…</span>;
  if (lastSavedAt) return <span className="text-xs text-muted-foreground">Draft saved</span>;
  return null;
};