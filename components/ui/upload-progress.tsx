"use client";
import React from 'react';
import { cn } from '@/lib/utils';

interface UploadProgressProps {
  progress: number; // 0-100
  className?: string;
  label?: string;
  size?: 'sm' | 'md';
  showPercent?: boolean;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({ progress, className, label='Uploading...', size='md', showPercent=true }) => {
  const clamped = Math.max(0, Math.min(100, progress));
  const height = size==='sm'? 'h-1.5' : 'h-2.5';
  return (
    <div className={cn('w-full space-y-1', className)} aria-live="polite" aria-label={label}>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        {showPercent && <span>{clamped.toFixed(0)}%</span>}
      </div>
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', height)}>
        <div className={cn('bg-primary transition-all duration-200 ease-linear', height)} style={{ width: clamped + '%' }} />
      </div>
    </div>
  );
};

export function useUploadProgress() {
  const [progress, setProgress] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);

  const track = async <T,>(files: File[], uploader: (file: File, onChunk: (loaded:number, total:number)=>void)=>Promise<T>): Promise<T[]> => {
    setIsUploading(true); setProgress(0);
    const results: T[] = [];
    let completed = 0;
    for(const f of files) {
      const result = await uploader(f, (loaded,total)=>{
        // simple per-file progress aggregated
        const filePortion = (loaded/total) * (1/files.length);
        // naive aggregation: completed full files + current portion
        const overall = (completed / files.length) * 100 + filePortion*100;
        setProgress(Math.min(99, overall));
      });
      results.push(result);
      completed++;
      setProgress(Math.min(99, (completed/files.length)*100));
    }
    setProgress(100); setTimeout(()=> setIsUploading(false), 600);
    return results;
  };

  return { progress, isUploading, track };
}
