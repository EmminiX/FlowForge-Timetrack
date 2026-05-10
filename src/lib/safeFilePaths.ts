import { desktopDir, documentDir, downloadDir, normalize, sep } from '@tauri-apps/api/path';

export type SafeUserFileExtension = '.csv' | '.db' | '.pdf';

const ALLOWED_USER_DIR_LABEL = 'Desktop, Documents, or Downloads';

function stripTrailingSeparators(path: string, separator: string): string {
  let trimmed = path;

  while (trimmed.length > 1 && trimmed.endsWith(separator)) {
    trimmed = trimmed.slice(0, -1);
  }

  return trimmed;
}

function isWithinDirectory(filePath: string, directoryPath: string): boolean {
  const separator = sep();
  const normalizedDirectory = stripTrailingSeparators(directoryPath, separator);
  const compareFilePath = separator === '\\' ? filePath.toLowerCase() : filePath;
  const compareDirectoryPath =
    separator === '\\' ? normalizedDirectory.toLowerCase() : normalizedDirectory;

  return compareFilePath.startsWith(`${compareDirectoryPath}${separator}`);
}

async function getAllowedUserDirectories(): Promise<string[]> {
  const directories = await Promise.all([desktopDir(), documentDir(), downloadDir()]);
  return Promise.all(directories.map((directory) => normalize(directory)));
}

export async function assertSafeUserFilePath(
  filePath: string,
  extension: SafeUserFileExtension,
  operation: string,
): Promise<string> {
  const normalizedPath = await normalize(filePath);
  const normalizedPathForExtension = normalizedPath.toLowerCase();

  if (!normalizedPathForExtension.endsWith(extension)) {
    throw new Error(`${operation} must use a ${extension} file extension`);
  }

  const allowedDirectories = await getAllowedUserDirectories();
  const isAllowedDirectory = allowedDirectories.some((directory) =>
    isWithinDirectory(normalizedPath, directory),
  );

  if (!isAllowedDirectory) {
    throw new Error(`${operation} is only supported from ${ALLOWED_USER_DIR_LABEL}`);
  }

  return normalizedPath;
}
