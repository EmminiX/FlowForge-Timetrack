/**
 * CSV generation and file download utilities.
 * Uses Tauri save dialog when available, browser blob fallback otherwise.
 */

export function generateCSV(headers: string[], rows: string[][]): string {
  const escape = (val: string): string => {
    if (val.includes(',') || val.includes('\n') || val.includes('"')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = headers.map(escape).join(',');
  const dataLines = rows.map((row) => row.map(escape).join(','));
  return [headerLine, ...dataLines].join('\n');
}

export async function downloadCSV(filename: string, csvContent: string): Promise<void> {
  const isTauri = '__TAURI__' in window || '__TAURI_INTERNALS__' in window;

  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');

    const filePath = await save({
      defaultPath: filename,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
    });

    if (filePath) {
      await writeTextFile(filePath, csvContent);
    }
  } else {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
