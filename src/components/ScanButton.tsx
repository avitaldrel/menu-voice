'use client';

import { useRef } from 'react';

interface ScanButtonProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function ScanButton({ onFilesSelected, disabled }: ScanButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) {
      onFilesSelected(files);
      // Reset so the same files can be re-selected after an error
      e.target.value = '';
    }
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full min-h-[56px] text-xl font-semibold bg-black text-white rounded-2xl focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50 active:bg-gray-800 transition-colors"
        aria-label="Scan Menu — tap to photograph a restaurant menu"
      >
        Scan Menu
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleChange}
      />
    </>
  );
}
