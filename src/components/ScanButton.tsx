'use client';

import { useRef } from 'react';

interface ScanButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  label?: string;
}

export function ScanButton({ onFilesSelected, disabled, variant = 'primary', label = 'Scan Menu' }: ScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
      // Reset so the same files can be re-selected after an error
      e.target.value = '';
    }
  }

  const primaryClasses =
    'w-full min-h-[72px] text-2xl font-semibold bg-accent text-accent-foreground rounded-2xl shadow-lg hover:shadow-xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 active:bg-accent-hover active:scale-[0.98] transition-all';

  const secondaryClasses =
    'w-full min-h-[64px] text-xl font-medium bg-muted text-foreground border border-muted-foreground/30 rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 active:scale-[0.98] transition-all';

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={variant === 'primary' ? primaryClasses : secondaryClasses}
        aria-label={`${label} — tap to photograph a restaurant menu`}
      >
        {label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleChange}
      />
    </>
  );
}
