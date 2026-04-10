const STORAGE_KEY = 'streamer-graph-data';
const AUTOSAVE_KEY = 'streamer-graph-autosave';
const POSITIONS_KEY = 'streamer-graph-positions';

// --- Layout positions ---

export function saveGraphPositions(positions: Record<string, { x: number; y: number }>): void {
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {}
}

export function loadGraphPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(POSITIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveToStorage(data: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, data);
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function loadFromStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function autoSave(data: string): void {
  try {
    // Save to main key (same as loadFromStorage reads)
    localStorage.setItem(STORAGE_KEY, data);
    // Also save timestamped backup
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.error('Auto-save failed:', e);
  }
}

export function loadAutoSave(): { data: string; timestamp: number } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function exportJSON(data: object, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importJSON(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    };
    input.click();
  });
}
