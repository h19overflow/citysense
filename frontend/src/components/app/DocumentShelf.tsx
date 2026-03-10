import { FileText } from "lucide-react";
import type { Artifact } from "@/lib/types";
import { useApp } from "@/lib/appContext";

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ArtifactRow({
  artifact,
  isActive,
  onSelect,
}: {
  artifact: Artifact;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left flex items-start gap-2 px-2.5 py-2 rounded-md border transition-colors ${
        isActive
          ? "border-primary/60 bg-primary/5"
          : "border-transparent hover:border-border/60 hover:bg-muted/50"
      }`}
    >
      <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{artifact.title}</p>
        <p className="text-[10px] text-muted-foreground">{formatTimeAgo(artifact.createdAt)}</p>
      </div>
    </button>
  );
}

export function DocumentShelf() {
  const { state, dispatch } = useApp();

  if (state.artifacts.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        Documents will appear here as we work through your plan.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {state.artifacts.map((artifact) => (
        <ArtifactRow
          key={artifact.id}
          artifact={artifact}
          isActive={state.activeArtifactId === artifact.id}
          onSelect={() => dispatch({ type: "SET_ACTIVE_ARTIFACT", id: artifact.id })}
        />
      ))}
    </div>
  );
}
