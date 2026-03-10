import { Upload } from "lucide-react";

interface DropZoneAreaProps {
  isDragging: boolean;
  compact: boolean;
  onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onClick: () => void;
}

function buildDropzoneClass(compact: boolean, isDragging: boolean): string {
  const sizeClasses = compact
    ? "w-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-6 px-4"
    : "w-full h-full min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl";

  if (isDragging) return `${sizeClasses} border-primary bg-primary/5 transition-colors cursor-default`;
  return `${sizeClasses} border-border/50 cursor-pointer transition-colors hover:border-primary/40 hover:bg-primary/5`;
}

export function DropZoneArea({ isDragging, compact, onDrop, onDragOver, onDragLeave, onClick }: DropZoneAreaProps) {
  const iconSize = compact ? "w-8 h-8" : "w-12 h-12";
  const headingSize = compact ? "text-sm" : "text-base";

  return (
    <div
      onClick={isDragging ? undefined : onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={buildDropzoneClass(compact, isDragging)}
    >
      <Upload className={`${iconSize} ${isDragging ? "text-primary" : "text-muted-foreground/50"} mb-3`} />
      <p className={`${headingSize} font-medium ${isDragging ? "text-primary" : "text-foreground"} mb-1`}>
        {isDragging ? "Release to upload" : "Drop your CV here"}
      </p>
      {!isDragging && (
        <>
          <p className="text-xs text-muted-foreground mb-2">or click to browse</p>
          <p className="text-[10px] text-muted-foreground/70">PDF, DOCX, TXT · Max 10MB</p>
        </>
      )}
    </div>
  );
}
