'use client';

import { useCallback } from 'react';
import { resizeImage } from '@/lib/image-utils';
import { saveSession } from '@/lib/indexeddb';
import type { AppAction } from '@/lib/app-state';
import type { Menu } from '@/lib/menu-schema';

export function useMenuExtraction(dispatch: React.Dispatch<AppAction>) {
  const extract = useCallback(async (files: File[], attemptCount: number = 1) => {
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

      // Step 3: Quality detection — dispatch EXTRACTION_LOW_QUALITY for low-confidence or warned extractions
      // Filter out warnings that are just about the restaurant name — that's not worth a retake
      const significantWarnings = (menu.warnings ?? []).filter(w => !/restaurant\s*name/i.test(w));
      const isLowQuality = menu.extractionConfidence < 0.3 || significantWarnings.length > 0;

      // Step 4: Save to IndexedDB (non-blocking — don't let storage failure hide a good extraction)
      let sessionId = 0;
      try {
        sessionId = await saveSession({
          restaurantName: menu.restaurantName,
          menuType: menu.menuType,
          timestamp: Date.now(),
          menu,
        });
      } catch {
        // IndexedDB can fail on mobile (private browsing, storage full) — continue anyway
      }

      if (isLowQuality) {
        const guidanceText = significantWarnings.length > 0
          ? `${significantWarnings[0]} Please retake for a better result.`
          : 'The photo was difficult to read clearly. Please try retaking in better lighting.';
        dispatch({
          type: 'EXTRACTION_LOW_QUALITY',
          menu,
          sessionId,
          guidance: guidanceText,
          attemptCount,
        });
        return;
      }

      // Step 5: Update app state to results
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
