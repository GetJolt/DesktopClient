// Tokens and the device signing key, encrypted with the OS keychain via safeStorage and kept in userData.

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { app, safeStorage } from 'electron';

const KEY_PATTERN = /^[\w.:-]{1,200}$/;

export class SecureStore {
  private readonly file = join(app.getPath('userData'), 'secure-store.json');
  private data: Record<string, string> = {};

  constructor() {
    if (existsSync(this.file)) {
      try {
        this.data = JSON.parse(readFileSync(this.file, 'utf8')) as Record<string, string>;
      } catch {
        this.data = {};
      }
    }
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('OS encryption unavailable; secrets are stored with weak obfuscation only.');
    }
  }

  get(key: string): string | null {
    if (!KEY_PATTERN.test(key)) return null;
    const value = this.data[key];
    if (value === undefined) return null;
    try {
      return safeStorage.decryptString(Buffer.from(value, 'base64'));
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    if (!KEY_PATTERN.test(key) || typeof value !== 'string' || value.length > 64 * 1024) return;
    this.data[key] = safeStorage.encryptString(value).toString('base64');
    this.flush();
  }

  delete(key: string): void {
    if (!(key in this.data)) return;
    delete this.data[key];
    this.flush();
  }

  private flush() {
    mkdirSync(dirname(this.file), { recursive: true });
    const tmp = `${this.file}.tmp`;
    writeFileSync(tmp, JSON.stringify(this.data), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
}
