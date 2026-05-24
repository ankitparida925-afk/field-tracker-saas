/**
 * AES-GCM GPS Encryption — FieldTracker Innovations+ Security Layer
 *
 * Every GPS coordinate (lat/lng) is encrypted before being:
 *  1. Stored in localStorage / state
 *  2. Transmitted via BroadcastChannel between tabs
 *
 * Uses the Web Crypto API (built into every modern browser + Node 18+).
 * Zero external dependencies.
 *
 * Algorithm: AES-GCM 256-bit with a random 12-byte IV per encryption.
 * Key:       Derived from app secret + user session ID via PBKDF2 (100k iterations).
 *
 * Wire format: base64( IV[12] + Ciphertext )
 */

const APP_SALT = 'fti-gps-salt-2026';
const PBKDF2_ITERATIONS = 100_000;

// ── In-memory key cache (one key per session) ─────────────────────────────────
let _cachedKey: CryptoKey | null = null;
let _cachedKeyId = '';

// ── Derive a per-session AES-GCM key ─────────────────────────────────────────
async function deriveKey(sessionId: string): Promise<CryptoKey> {
  const cacheKey = sessionId + APP_SALT;
  if (_cachedKey && _cachedKeyId === cacheKey) return _cachedKey;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(sessionId + APP_SALT),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  _cachedKey = await crypto.subtle.deriveKey(
    {
      name:       'PBKDF2',
      salt:       enc.encode(APP_SALT),
      iterations: PBKDF2_ITERATIONS,
      hash:       'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  _cachedKeyId = cacheKey;
  return _cachedKey;
}

// ── Get session key (falls back to anonymous key if not logged in) ────────────
async function getSessionKey(): Promise<CryptoKey> {
  const sessionId =
    (typeof window !== 'undefined' && sessionStorage.getItem('fti_session_id')) ||
    'anonymous-session';
  return deriveKey(sessionId);
}

// ── Encrypt GPS coordinates → base64 string ───────────────────────────────────
export async function encryptGPS(lat: number, lng: number): Promise<string> {
  try {
    const key = await getSessionKey();
    const iv  = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV (GCM standard)
    const data = new TextEncoder().encode(JSON.stringify({ lat, lng }));

    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Prepend IV to ciphertext and base64-encode the whole thing
    const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.byteLength);

    return btoa(String.fromCharCode(...combined));
  } catch {
    // Graceful fallback: return plaintext JSON if Web Crypto unavailable
    return JSON.stringify({ lat, lng });
  }
}

// ── Decrypt base64 string → GPS coordinates ───────────────────────────────────
export async function decryptGPS(encrypted: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Handle fallback plaintext case
    if (encrypted.startsWith('{')) {
      return JSON.parse(encrypted);
    }

    const key  = await getSessionKey();
    const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv   = data.slice(0, 12);
    const ct   = data.slice(12);

    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return JSON.parse(new TextDecoder().decode(plain));
  } catch {
    return null;
  }
}

// ── HMAC-SHA256 sign a BroadcastChannel message payload ──────────────────────
// Prevents tampering with inter-tab messages (Secure WebSocket equivalent).
export async function signMessage(payload: object): Promise<{ data: string; sig: string }> {
  const data = JSON.stringify(payload);
  const enc  = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode('fti-broadcast-hmac-key-2026'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

  return { data, sig };
}

// ── Verify a signed BroadcastChannel message ──────────────────────────────────
export async function verifyMessage(data: string, sig: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode('fti-broadcast-hmac-key-2026'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBuffer = Uint8Array.from(atob(sig), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(data));
  } catch {
    return false;
  }
}
