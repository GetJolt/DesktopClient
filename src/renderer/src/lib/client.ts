import { JoltSession } from '@getjolt/sdk';

export const DEFAULT_INSTANCE =
  import.meta.env.VITE_DEFAULT_INSTANCE ?? (import.meta.env.DEV ? 'localhost:4000' : 'host.joltapp.org');

const deviceName = await window.jolt.deviceName().catch(() => 'Jolt Desktop');

/** The desktop app is a thin UI over the SDK session; any other frontend can be built the same way. */
export const session = new JoltSession({
  storage: window.jolt.secureStore,
  deviceName,
});

export const client = session.client;
