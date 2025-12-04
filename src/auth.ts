import axios, { AxiosError, AxiosInstance } from 'axios';
import { WOWSQLError } from './errors';

export interface ProjectAuthClientConfig {
  /** Project slug or full URL (e.g., `myproject` or `https://myproject.wowsql.com`) */
  projectUrl: string;
  /** Override for wowsql.com when using custom domains */
  baseDomain?: string;
  /** Use HTTPS (default true) */
  secure?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** 
   * Unified API key - Anonymous Key (wowsql_anon_...) for client-side,
   * or Service Role Key (wowsql_service_...) for server-side.
   * UNIFIED AUTHENTICATION: Same key works for both auth and database operations.
   */
  apiKey?: string;
  /** 
   * @deprecated Use apiKey instead. Kept for backward compatibility.
   * Unified API key - same as apiKey parameter.
   */
  publicApiKey?: string;
  /** Custom token storage implementation (defaults to in-memory) */
  storage?: AuthTokenStorage;
}

export interface AuthTokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string | null): void;
}

class MemoryAuthTokenStorage implements AuthTokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string | null): void {
    this.refreshToken = token;
  }
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  userMetadata: Record<string, any>;
  appMetadata: Record<string, any>;
  createdAt?: string | null;
}

export interface SignUpParams {
  email: string;
  password: string;
  full_name?: string;
  fullName?: string;
  user_metadata?: Record<string, any>;
  userMetadata?: Record<string, any>;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponse {
  user?: AuthUser;
  session: AuthSession;
}

export interface OAuthAuthorizeResponse {
  authorizationUrl: string;
  provider: string;
  redirectUri: string;
  backendCallbackUrl?: string;
  frontendRedirectUri?: string;
}

export class ProjectAuthClient {
  private readonly client: AxiosInstance;
  private readonly storage: AuthTokenStorage;
  private accessToken: string | null;
  private refreshToken: string | null;

  constructor(private readonly config: ProjectAuthClientConfig) {
    const baseUrl = buildAuthBaseUrl(
      config.projectUrl,
      config.baseDomain,
      config.secure
    );

    this.storage = config.storage || new MemoryAuthTokenStorage();
    this.accessToken = this.storage.getAccessToken();
    this.refreshToken = this.storage.getRefreshToken();

    // UNIFIED AUTHENTICATION: Use apiKey (new) or publicApiKey (deprecated) for backward compatibility
    const unifiedApiKey = config.apiKey || config.publicApiKey;
    
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: config.timeout ?? 30000,
      headers: {
        'Content-Type': 'application/json',
        // UNIFIED AUTHENTICATION: Use Authorization header (same as database operations)
        ...(unifiedApiKey ? { 'Authorization': `Bearer ${unifiedApiKey}` } : {}),
      },
    });
  }

  /**
   * Register a new end user for the project.
   */
  async signUp(payload: SignUpParams): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/signup', normalizeSignUpPayload(payload));
      const session = this.persistSession(response.data);
      const user = response.data.user ? mapUser(response.data.user) : undefined;
      return { user, session };
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Authenticate an existing user.
   */
  async signIn(payload: SignInParams): Promise<AuthResponse> {
    try {
      const response = await this.client.post('/login', payload);
      const session = this.persistSession(response.data);
      return { session };
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Retrieve the current authenticated user.
   */
  async getUser(accessToken?: string): Promise<AuthUser> {
    const token = accessToken || this.accessToken || this.storage.getAccessToken();
    if (!token) {
      throw new WOWSQLError('Access token is required. Please sign in first.');
    }

    try {
      const response = await this.client.get('/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return mapUser(response.data);
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Fetch the OAuth authorization URL for a configured provider.
   */
  /**
   * Get OAuth authorization URL for the specified provider.
   * 
   * @param provider OAuth provider name (e.g., 'github', 'google', 'facebook', 'microsoft')
   * @param redirectUri The redirect URI where the OAuth provider will send the user after authorization.
   *                    Must match the redirect URI configured in the OAuth provider settings.
   * @returns Promise resolving to OAuth authorization URL and metadata
   * @throws {WOWSQLError} If the request fails or the provider is not configured
   * 
   * @example
   * ```typescript
   * const auth = new ProjectAuthClient({ projectUrl: 'myproject' });
   * const result = await auth.getOAuthAuthorizationUrl(
   *   'github',
   *   'http://localhost:5000/auth/github/callback'
   * );
   * console.log(result.authorizationUrl);
   * ```
   */
  async getOAuthAuthorizationUrl(
    provider: string,
    redirectUri: string
  ): Promise<OAuthAuthorizeResponse> {
    if (!redirectUri || !redirectUri.trim()) {
      throw new WOWSQLError('redirectUri is required and cannot be empty');
    }
    
    if (!provider || !provider.trim()) {
      throw new WOWSQLError('provider is required and cannot be empty');
    }
    
    // Ensure redirectUri is properly formatted
    redirectUri = redirectUri.trim();
    
    try {
      const response = await this.client.get(`/oauth/${provider}`, {
        params: { frontend_redirect_uri: redirectUri },
      });

      return {
        authorizationUrl: response.data.authorization_url,
        provider: response.data.provider,
        redirectUri: response.data.redirect_uri || response.data.backend_callback_url || '',
        backendCallbackUrl: response.data.backend_callback_url,
        frontendRedirectUri: response.data.frontend_redirect_uri,
      };
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 502) {
        throw new WOWSQLError(
          `Bad Gateway (502): The backend server may be down or unreachable. ` +
          `Check if the backend is running and accessible at ${this.client.defaults.baseURL}`,
          502,
          axiosError.response?.data
        );
      } else if (axiosError.response?.status === 400) {
        throw new WOWSQLError(
          `Bad Request (400): ${axiosError.message}. ` +
          `Ensure OAuth provider '${provider}' is configured and enabled for this project.`,
          400,
          axiosError.response?.data
        );
      }
      throw this.toWowError(error);
    }
  }

  /**
   * Exchange OAuth callback code for access tokens.
   * 
   * After the user authorizes with the OAuth provider, the provider redirects
   * back with a code. Call this method to exchange that code for JWT tokens.
   * 
   * @param provider - OAuth provider name (e.g., 'github', 'google')
   * @param code - Authorization code from OAuth provider callback
   * @param redirectUri - Optional redirect URI (uses configured one if not provided)
   * @returns AuthResponse with session tokens and user info
   */
  async exchangeOAuthCallback(
    provider: string,
    code: string,
    redirectUri?: string
  ): Promise<AuthResponse> {
    try {
      const response = await this.client.post(`/oauth/${provider}/callback`, {
        code,
        redirect_uri: redirectUri,
      });
      const session = this.persistSession(response.data);
      const user = response.data.user ? mapUser(response.data.user) : undefined;
      return { user, session };
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Request password reset.
   * 
   * Sends a password reset email to the user if they exist.
   * Always returns success to prevent email enumeration.
   * 
   * @param email - User's email address
   * @returns Object with success status and message
   */
  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/forgot-password', { email });
      return {
        success: response.data.success ?? true,
        message: response.data.message ?? 'If that email exists, a password reset link has been sent'
      };
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Reset password with token.
   * 
   * Validates the reset token and updates the user's password.
   * 
   * @param token - Password reset token from email
   * @param newPassword - New password (minimum 8 characters)
   * @returns Object with success status and message
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.client.post('/reset-password', {
        token,
        new_password: newPassword
      });
      return {
        success: response.data.success ?? true,
        message: response.data.message ?? 'Password reset successfully! You can now login with your new password'
      };
    } catch (error) {
      throw this.toWowError(error);
    }
  }

  /**
   * Get the current session tokens.
   */
  getSession(): { accessToken: string | null; refreshToken: string | null } {
    return {
      accessToken: this.accessToken || this.storage.getAccessToken(),
      refreshToken: this.refreshToken || this.storage.getRefreshToken(),
    };
  }

  /**
   * Override stored session tokens (useful for SSR or persisted sessions).
   */
  setSession(session: { accessToken: string; refreshToken?: string | null }): void {
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken ?? null;
    this.storage.setAccessToken(this.accessToken);
    this.storage.setRefreshToken(this.refreshToken);
  }

  /**
   * Clear all stored tokens.
   */
  clearSession(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.storage.setAccessToken(null);
    this.storage.setRefreshToken(null);
  }

  private persistSession(raw: any): AuthSession {
    const session = mapSession(raw);
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.storage.setAccessToken(session.accessToken);
    this.storage.setRefreshToken(session.refreshToken);
    return session;
  }

  private toWowError(error: unknown): WOWSQLError {
    if (error instanceof WOWSQLError) {
      return error;
    }

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      const status = axiosError.response?.status;
      const detail =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.message ||
        axiosError.message;
      return new WOWSQLError(detail || 'Request failed', status, axiosError.response?.data);
    }

    return new WOWSQLError((error as Error)?.message || 'Unknown error');
  }
}

function buildAuthBaseUrl(
  projectUrl: string,
  baseDomain = 'wowsql.com',
  secure = true
): string {
  let normalized = projectUrl.trim();

  // If it's already a full URL, use it as-is
  if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
    normalized = normalized.replace(/\/+$/, '');
    if (normalized.endsWith('/api')) {
      normalized = normalized.slice(0, -4);
    }
    return `${normalized}/api/auth`;
  }

  // If it already contains the base domain, don't append it again
  if (normalized.includes(`.${baseDomain}`) || normalized.endsWith(baseDomain)) {
    const protocol = secure ? 'https' : 'http';
    normalized = `${protocol}://${normalized}`;
  } else {
    // Just a project slug, append domain
    const protocol = secure ? 'https' : 'http';
    normalized = `${protocol}://${normalized}.${baseDomain}`;
  }

  normalized = normalized.replace(/\/+$/, '');

  if (normalized.endsWith('/api')) {
    normalized = normalized.slice(0, -4);
  }

  return `${normalized}/api/auth`;
}

function normalizeSignUpPayload(payload: SignUpParams) {
  return {
    email: payload.email,
    password: payload.password,
    full_name: payload.full_name ?? payload.fullName,
    user_metadata: payload.user_metadata ?? payload.userMetadata,
  };
}

function mapSession(data: any): AuthSession {
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenType: data.token_type ?? 'bearer',
    expiresIn: data.expires_in ?? 0,
  };
}

function mapUser(data: any): AuthUser {
  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name ?? data.fullName ?? null,
    avatarUrl: data.avatar_url ?? data.avatarUrl ?? null,
    emailVerified: Boolean(data.email_verified ?? data.emailVerified),
    userMetadata: data.user_metadata ?? data.userMetadata ?? {},
    appMetadata: data.app_metadata ?? data.appMetadata ?? {},
    createdAt: data.created_at ?? data.createdAt ?? null,
  };
}

