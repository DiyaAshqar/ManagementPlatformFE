import { Injectable } from '@angular/core';
import { Claim, ClaimTypes, JwtPayload } from '../models/auth.models';

/**
 * Decodes and inspects JWT access tokens without any external dependency.
 *
 * Only the payload is read (the signature is verified server-side). This is
 * deliberately tolerant of both standard JWT claim names (`sub`, `role`) and
 * the long .NET ClaimTypes URIs the backend may emit.
 */
@Injectable({ providedIn: 'root' })
export class JwtService {
  /** Decode the payload section of a JWT. Returns `null` if malformed. */
  decode(token: string | null | undefined): JwtPayload | null {
    if (!token) {
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      return JSON.parse(this.base64UrlDecode(parts[1])) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** Expiration as a `Date`, or `null` when the token has no `exp` claim. */
  getExpiration(token: string | null | undefined): Date | null {
    const payload = this.decode(token);
    if (!payload?.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }

  /**
   * Whether the token is expired.
   * @param offsetSeconds treat the token as expired this many seconds early
   *        (clock-skew / proactive-refresh buffer). Defaults to 30s.
   */
  isExpired(token: string | null | undefined, offsetSeconds = 30): boolean {
    const expiration = this.getExpiration(token);
    if (!expiration) {
      // No expiry claim → cannot prove it is valid; treat as expired.
      return true;
    }
    return expiration.getTime() <= Date.now() + offsetSeconds * 1000;
  }

  /** Flatten the payload into a list of `{ type, value }` claims. */
  getClaims(token: string | null | undefined): Claim[] {
    const payload = this.decode(token);
    if (!payload) {
      return [];
    }

    const claims: Claim[] = [];
    for (const [type, raw] of Object.entries(payload)) {
      if (Array.isArray(raw)) {
        raw.forEach((value) => claims.push({ type, value: String(value) }));
      } else if (raw !== undefined && raw !== null) {
        claims.push({ type, value: String(raw) });
      }
    }
    return claims;
  }

  /** Roles from the token, normalized to a string[] (handles single or array). */
  getRoles(token: string | null | undefined): string[] {
    const payload = this.decode(token);
    if (!payload) {
      return [];
    }
    return this.normalizeClaim(payload[ClaimTypes.Role] ?? payload['roles']);
  }

  /** Permissions from the token, normalized to a string[]. */
  getPermissions(token: string | null | undefined): string[] {
    const payload = this.decode(token);
    if (!payload) {
      return [];
    }
    return this.normalizeClaim(payload[ClaimTypes.Permission] ?? payload['permissions']);
  }

  private normalizeClaim(value: unknown): string[] {
    if (value == null) {
      return [];
    }
    return Array.isArray(value) ? value.map(String) : [String(value)];
  }

  /** Base64URL → UTF-8 string (handles padding and unicode). */
  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }

    const binary = atob(base64);
    // Decode UTF-8 byte sequence into a proper JS string.
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }
}
