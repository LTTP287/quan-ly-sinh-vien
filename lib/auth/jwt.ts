/**
 * JWT HS256 tự cài bằng Web Crypto — chạy được cả trên Edge Runtime (middleware)
 * lẫn Node Runtime (route handler), không cần thêm dependency.
 */

export interface JwtPayload {
  sub: string; // user id
  sid: string; // session id — dùng cho Single Session Lock
  role: 'student' | 'lecturer';
  code?: string; // MSSV
  name?: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

export interface ExamTicketPayload {
  sub: string; // student id
  quiz: string; // quiz id
  iat: number;
  exp: number;
  [key: string]: unknown;
}

const enc = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): ArrayBuffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  const bin = atob(input.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const buf = new ArrayBuffer(bin.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
  return buf;
}

function getSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 16) {
    // Chỉ chấp nhận khoá yếu ở chế độ demo cục bộ
    return 'uniquiz-demo-secret-do-not-use-in-production';
  }
  return secret;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    enc.encode(getSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(
  payload: Record<string, unknown>,
  ttlSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };

  const header = b64urlEncode(enc.encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const claims = b64urlEncode(enc.encode(JSON.stringify(body)));
  const data = `${header}.${claims}`;

  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(data));
  return `${data}.${b64urlEncode(new Uint8Array(sig))}`;
}

export async function verifyJwt<T = JwtPayload>(token: string): Promise<T | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, claims, sig] = parts;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(),
    b64urlDecode(sig),
    enc.encode(`${header}.${claims}`)
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(new Uint8Array(b64urlDecode(claims))));
    if (typeof payload.exp === 'number' && Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }
    return payload as T;
  } catch {
    return null;
  }
}

/** Băm token để lưu DB — không bao giờ lưu JWT gốc. */
export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(token));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const SESSION_COOKIE = 'uniquiz_session';
export const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 giờ
export const EXAM_TICKET_TTL_SECONDS = 60 * 5; // vé vào phòng thi sống 5 phút

export function examTicketCookie(quizId: string): string {
  return `uniquiz_exam_${quizId}`;
}
