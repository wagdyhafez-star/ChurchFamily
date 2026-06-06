/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A safe, try-catch protected wrapper around localStorage to shield the application
 * against browser SecurityErrors (common inside iframe-sandboxed preview players).
 */
export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Read blocked for key "${key}":`, e);
    }
    return null;
  },

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Write blocked for key "${key}":`, e);
    }
  },

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {
      console.warn(`[SafeLocalStorage] Delete blocked for key "${key}":`, e);
    }
  },

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {
      console.warn('[SafeLocalStorage] Clear blocked:', e);
    }
  }
};
