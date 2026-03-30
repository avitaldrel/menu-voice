'use client';

import { useCallback } from 'react';
import { resizeImage } from '@/lib/image-utils';
import { saveSession } from '@/lib/indexeddb';
import type { AppAction } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

export function useMenuExtraction(dispatch: React.Dispatch<AppAction>) {
  const extract = useCallback(async (files: File[]) => {
    dispatch({ type: 'FILES_SELECTED', fileCount: files.length });

    try {
      // Step 1: Resize all images client-side (strips EXIF, reduces 8-12MB -> ~500KB)
      const images = await Promise.all(
        files.map(async (file) => ({
          base64: await resizeImage(file),
          mimeType: 'image/jpeg',
        }))
      );

      // Step 2: Send to API route for Claude Vision extraction
      const res = await fetch('/api/menu/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        const errorMsg = (errorBody as { error?: string }).error
          || `Menu extraction failed (${res.status})`;
        throw new Error(errorMsg);
      }

      const menu: Menu = await res.json();

      // Step 3: Save to IndexedDB for the recent sessions list (D-18)
      const sessionId = await saveSession({
        restaurantName: menu.restaurantName,
        menuType: menu.menuType,
        timestamp: Date.now(),
        menu,
      });

      // Step 4: Update app state to results
      dispatch({ type: 'EXTRACTION_SUCCESS', menu, sessionId });
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Something went wrong while reading the menu. Please try again.';
      dispatch({ type: 'EXTRACTION_ERROR', message });
    }
  }, [dispatch]);

  return { extract };
}
