import type { JoltBridge } from '../shared/bridge';

declare global {
  interface Window {
    jolt: JoltBridge;
  }
}

export {};
