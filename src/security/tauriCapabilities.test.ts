import { describe, expect, it } from 'vitest';
import defaultCapability from '../../src-tauri/capabilities/default.json';

type ScopedPath = {
  path: string;
};

type CapabilityPermission =
  | string
  | {
      identifier: string;
      allow?: ScopedPath[];
    };

const permissions = defaultCapability.permissions as CapabilityPermission[];

function permissionIdentifier(permission: CapabilityPermission): string {
  return typeof permission === 'string' ? permission : permission.identifier;
}

function scopedPaths(identifier: string): string[] {
  const permission = permissions.find((candidate) => permissionIdentifier(candidate) === identifier);

  if (!permission || typeof permission === 'string') {
    return [];
  }

  return permission.allow?.map(({ path }) => path) ?? [];
}

describe('Tauri filesystem capability', () => {
  it('does not expose broad filesystem defaults or all-write permissions', () => {
    const permissionIds = permissions.map(permissionIdentifier);

    expect(permissionIds).not.toContain('fs:default');
    expect(permissionIds).not.toContain('fs:write-all');
    expect(permissionIds).not.toContain('fs:read-all');
  });

  it('scopes backup copy access to app data and explicit user export directories', () => {
    expect(scopedPaths('fs:allow-copy-file')).toEqual([
      '$APPDATA/flowforge.db',
      '$APPDATA/flowforge.db.backup',
      '$DOWNLOAD/*.db',
      '$DOWNLOAD/**/*.db',
      '$DESKTOP/*.db',
      '$DESKTOP/**/*.db',
      '$DOCUMENT/*.db',
      '$DOCUMENT/**/*.db',
    ]);
  });

  it('scopes CSV writes to explicit user export directories', () => {
    expect(scopedPaths('fs:allow-write-text-file')).toEqual([
      '$DOWNLOAD/*.csv',
      '$DOWNLOAD/**/*.csv',
      '$DESKTOP/*.csv',
      '$DESKTOP/**/*.csv',
      '$DOCUMENT/*.csv',
      '$DOCUMENT/**/*.csv',
    ]);
  });

  it('scopes invoice PDF writes to explicit user export directories', () => {
    expect(scopedPaths('fs:allow-write-file')).toEqual([
      '$DOWNLOAD/*.pdf',
      '$DOWNLOAD/**/*.pdf',
      '$DESKTOP/*.pdf',
      '$DESKTOP/**/*.pdf',
      '$DOCUMENT/*.pdf',
      '$DOCUMENT/**/*.pdf',
    ]);
  });
});
