export type PublicRuntimeEnv = {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_GEOIP_ENDPOINT?: string;
  VITE_GOOGLE_MAPS_API_KEY?: string;
};

declare global {
  interface Window {
    __CARAMELO_PUBLIC_ENV__?: PublicRuntimeEnv;
  }
}

function readInjectedEnv(): Partial<PublicRuntimeEnv> {
  if (typeof window === 'undefined') return {};
  return window.__CARAMELO_PUBLIC_ENV__ || {};
}

function readProcessEnv(name: keyof PublicRuntimeEnv): string {
  const processEnv = (globalThis as any)?.process?.env as Record<string, string | undefined> | undefined;
  const value = processEnv?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function getPublicEnv(name: keyof PublicRuntimeEnv): string {
  const injected = readInjectedEnv()[name];
  if (typeof injected === 'string' && injected.trim()) return injected.trim();

  const processValue = readProcessEnv(name);
  if (processValue) return processValue;


  return '';
}

export function getPublicRuntimeEnv(): PublicRuntimeEnv {
  return {
    VITE_SUPABASE_URL: getPublicEnv('VITE_SUPABASE_URL'),
    VITE_SUPABASE_ANON_KEY: getPublicEnv('VITE_SUPABASE_ANON_KEY'),
    VITE_GEOIP_ENDPOINT: getPublicEnv('VITE_GEOIP_ENDPOINT'),
    VITE_GOOGLE_MAPS_API_KEY: getPublicEnv('VITE_GOOGLE_MAPS_API_KEY'),
  };
}
