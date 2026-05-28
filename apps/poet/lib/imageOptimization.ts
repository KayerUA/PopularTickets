const KNOWN_SUPABASE_STORAGE_HOSTS = new Set(["pynbtuvhrratjqlweyas.supabase.co"]);

function configuredStorageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || process.env.SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw.replace(/\/+$/, "")).hostname;
  } catch {
    return null;
  }
}

export function isOptimizableEventImage(src: string | null | undefined): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    const configured = configuredStorageHost();
    return (
      url.protocol === "https:" &&
      url.pathname.startsWith("/storage/v1/object/public/") &&
      (KNOWN_SUPABASE_STORAGE_HOSTS.has(url.hostname) || (configured !== null && url.hostname === configured))
    );
  } catch {
    return false;
  }
}
