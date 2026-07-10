/**
 * In-memory mock authentication backend.
 *
 * This stands in for the real auth API until the backend ships its auth
 * controller. It produces *real, well-formed* JWTs (header.payload.signature)
 * embedding role + permission claims, so the entire token pipeline — decoding,
 * claims, expiry, refresh — is exercised exactly as it will be in production.
 *
 * The signature is a throwaway placeholder (tokens are never verified on the
 * client). Nothing here ships once `environment.auth.useMock` is `false`.
 */
import {
  ALL_PERMISSIONS,
  AuthUser,
  ClaimTypes,
  LoginResult,
  Permissions,
  RegisterRequest,
  Roles,
} from '../models/auth.models';

interface MockUser extends AuthUser {
  /** Plain-text password — mock only, never do this for real. */
  password: string;
}

/** Access-token lifetime for mock sessions (seconds). */
export const MOCK_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

/**
 * Seed accounts. Credentials are shown on the login page in mock mode.
 */
export const MOCK_USERS: MockUser[] = [
  {
    id: '1',
    userName: 'admin',
    email: 'admin@construction.com',
    password: 'Admin@123',
    fullName: 'System Administrator',
    roles: [Roles.Admin],
    permissions: ALL_PERMISSIONS, // Admin gets everything
    preferredLanguage: 'en',
  },
  {
    id: '2',
    userName: 'manager',
    email: 'manager@construction.com',
    password: 'Manager@123',
    fullName: 'Project Manager',
    roles: [Roles.ProjectManager],
    permissions: [
      Permissions.Dashboard.View,
      Permissions.Projects.View,
      Permissions.Projects.Create,
      Permissions.Projects.Edit,
      Permissions.Agreements.View,
      Permissions.Agreements.Create,
      Permissions.Agreements.Edit,
      Permissions.Constructors.View,
      Permissions.Suppliers.View,
      Permissions.Materials.View,
    ],
    preferredLanguage: 'en',
  },
  {
    id: '3',
    userName: 'viewer',
    email: 'viewer@construction.com',
    password: 'Viewer@123',
    fullName: 'Read Only User',
    roles: [Roles.Viewer],
    permissions: [
      Permissions.Dashboard.View,
      Permissions.Projects.View,
      Permissions.Agreements.View,
      Permissions.Constructors.View,
      Permissions.Suppliers.View,
      Permissions.Materials.View,
    ],
    preferredLanguage: 'en',
  },
];

/** Find a user by email (case-insensitive) or username, matching the password. */
export function findMockUser(email: string, password: string): MockUser | undefined {
  const identifier = email.trim().toLowerCase();
  return MOCK_USERS.find(
    (u) =>
      (u.email.toLowerCase() === identifier || u.userName.toLowerCase() === identifier) &&
      u.password === password
  );
}

export function findMockUserById(id: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.id === id);
}

/** Register a new mock account. Returns `null` if the email is already taken. */
export function registerMockUser(request: RegisterRequest): MockUser | null {
  const identifier = request.email.trim().toLowerCase();
  const taken = MOCK_USERS.some((u) => u.email.toLowerCase() === identifier);
  if (taken) {
    return null;
  }

  const user: MockUser = {
    id: (MOCK_USERS.length + 1).toString(),
    userName: request.email,
    email: request.email,
    password: request.password,
    fullName: request.fullName,
    roles: [Roles.Viewer],
    permissions: [
      Permissions.Dashboard.View,
      Permissions.Projects.View,
      Permissions.Agreements.View,
      Permissions.Constructors.View,
      Permissions.Suppliers.View,
      Permissions.Materials.View,
    ],
    preferredLanguage: 'en',
  };

  MOCK_USERS.push(user);
  return user;
}

/** Change a mock user's password after verifying the current one. Returns whether it succeeded. */
export function changeMockUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): boolean {
  const user = findMockUserById(userId);
  if (!user || user.password !== currentPassword) {
    return false;
  }
  user.password = newPassword;
  return true;
}

/** Strip the password before exposing a user to the app. */
export function toAuthUser(user: MockUser): AuthUser {
  const { password, ...rest } = user;
  return rest;
}

/** Build a full mock `LoginResult` (tokens + user) for a given account. */
export function buildMockLoginResult(user: MockUser): LoginResult {
  const accessToken = createMockJwt(user, MOCK_TOKEN_TTL_SECONDS);
  return {
    accessToken,
    refreshToken: createMockRefreshToken(user.id),
    expiresIn: MOCK_TOKEN_TTL_SECONDS,
    user: toAuthUser(user),
  };
}

/** A mock opaque refresh token — `mock-refresh.<userId>.<random>`. */
export function createMockRefreshToken(userId: string): string {
  return `mock-refresh.${userId}.${cryptoRandom()}`;
}

/** Extract the user id embedded in a mock refresh token. */
export function userIdFromRefreshToken(refreshToken: string): string | null {
  const match = /^mock-refresh\.([^.]+)\./.exec(refreshToken);
  return match ? match[1] : null;
}

/**
 * Create a structurally valid JWT carrying the user's identity and claims.
 */
function createMockJwt(user: MockUser, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    [ClaimTypes.NameIdentifier]: user.id,
    [ClaimTypes.Sub]: user.id,
    [ClaimTypes.Name]: user.fullName,
    [ClaimTypes.Email]: user.email,
    [ClaimTypes.Role]: user.roles,
    [ClaimTypes.Permission]: user.permissions,
    iat: now,
    nbf: now,
    exp: now + ttlSeconds,
    iss: 'management-platform-mock',
    aud: 'management-platform',
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(`mock-signature-${cryptoRandom()}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/** UTF-8 safe Base64URL encoding (mirror of JwtService's decoder). */
function base64UrlEncode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function cryptoRandom(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
