// Update check service - checks for new app versions
// Privacy-focused: only fetches a static JSON file, no user data transmitted

const UPDATE_CHECK_URL =
  'https://raw.githubusercontent.com/EmminiX/FlowForge-Timetrack/main/latest.json';

export interface UpdateInfo {
  version: string;
  releaseUrl: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  releaseUrl: string;
  currentVersion: string;
}

// Compare semantic versions: returns true if v1 > v2
// Compare semantic versions: returns true if v1 > v2
function isNewerVersion(remote: string, local: string): boolean {
  // Remove 'v' prefix if present
  const clean = (v: string) => v.replace(/^v/, '');
  const parse = (v: string) =>
    clean(v)
      .split('.')
      .map((n) => parseInt(n, 10));

  const [r, l] = [parse(remote), parse(local)];

  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rVal = r[i] || 0;
    const lVal = l[i] || 0;
    if (rVal > lVal) return true;
    if (rVal < lVal) return false;
  }
  return false;
}

// Get current app version from package.json (injected at build time)
function getCurrentVersion(): string {
  // Vite injects this from package.json
  return import.meta.env.VITE_APP_VERSION || '0.0.0';
}

export const updateService = {
  /**
   * Check if a new version is available
   * Returns null if check fails (network error, etc.)
   */
  async checkForUpdate(): Promise<UpdateCheckResult | null> {
    try {
      const response = await fetch(UPDATE_CHECK_URL, {
        cache: 'no-store', // Don't cache - always get fresh version info
      });

      if (!response.ok) {
        console.warn('Update check failed:', response.status);
        return null;
      }

      const data: UpdateInfo = await response.json();
      const currentVersion = getCurrentVersion();

      return {
        hasUpdate: isNewerVersion(data.version, currentVersion),
        latestVersion: data.version,
        releaseUrl: data.releaseUrl,
        currentVersion,
      };
    } catch (error) {
      console.warn('Update check failed:', error);
      return null;
    }
  },

  /** Get current app version */
  getCurrentVersion,
};
