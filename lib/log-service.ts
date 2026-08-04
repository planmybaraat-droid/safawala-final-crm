import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

export interface LogEntry {
  requestId: string;
  severity: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  service?: string;
  environment?: string;
  userId?: string;
  userRole?: string;
  franchiseId?: string;
  endpoint?: string;
  httpMethod?: string;
  queryParams?: Record<string, any>;
  routeParams?: Record<string, any>;
  requestHeaders?: Record<string, any>;
  requestBodySummary?: string;
  responseStatus?: number;
  responseBodySummary?: string;
  errorMessage?: string;
  stacktrace?: string;
  serverLogs?: string;
  sqlQueries?: Array<{query: string, duration: number, timestamp: string}>;
  dbLatencyMs?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  frontendErrors?: Array<{message: string, stack: string, timestamp: string}>;
  breadcrumbs?: Array<{message: string, timestamp: string, level: string}>;
  gitCommitHash?: string;
  buildId?: string;
  deployedVersion?: string;
  attachments?: Array<{name: string, type: string, size: number, url: string}>;
}

export interface SignedTokenData {
  requestId: string;
  issuer: string;
  createdAt: string;
  expiresAt: string;
  actorId: string;
  scope: 'full' | 'redacted';
  tokenId: string;
}

class LogService {
  private _supabase: ReturnType<typeof createClient> | null = null;
  
  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    return this._supabase;
  }

  private readonly SECRET_KEY = process.env.LOG_SIGNING_SECRET || 'default-secret-change-in-production';
  private readonly REDACTION_PATTERNS = [
    /Bearer\s+[A-Za-z0-9\-_]+/gi,
    /Authorization:\s*[A-Za-z0-9\-_\s]+/gi,
    /password['":\s]*['"]\w+['"]/gi,
    /api[_-]?key['":\s]*['"]\w+['"]/gi,
    /secret['":\s]*['"]\w+['"]/gi,
    /token['":\s]*['"]\w+['"]/gi,
    /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g, // Credit card numbers
    /\d{9,18}/g, // Bank account numbers
  ];

  /**
   * Generate a unique request ID for correlation
   */
  public generateRequestId(): string {
    return `REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Redact sensitive information from data
   */
  private redactSensitiveData(data: any): any {
    if (typeof data === 'string') {
      let redacted = data;
      this.REDACTION_PATTERNS.forEach(pattern => {
        redacted = redacted.replace(pattern, '[REDACTED]');
      });
      return redacted;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item));
    }

    if (data && typeof data === 'object') {
      const redacted: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Redact known sensitive keys
        if (['authorization', 'cookie', 'x-api-key', 'password', 'secret', 'token'].includes(key.toLowerCase())) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = this.redactSensitiveData(value);
        }
      }
      return redacted;
    }

    return data;
  }

  /**
   * Extract request context from NextRequest
   */
  public extractRequestContext(request: NextRequest): Partial<LogEntry> {
    const url = new URL(request.url);
    const headers: Record<string, string> = {};
    
    // Copy headers while redacting sensitive ones
    request.headers.forEach((value, key) => {
      headers[key] = key.toLowerCase().includes('authorization') || 
                   key.toLowerCase().includes('cookie') || 
                   key.toLowerCase().includes('token') ? '[REDACTED]' : value;
    });

    return {
      endpoint: url.pathname,
      httpMethod: request.method,
      queryParams: Object.fromEntries(url.searchParams.entries()),
      requestHeaders: headers,
    };
  }

  /**
   * Log an entry asynchronously (non-blocking)
   */
  public async logAsync(entry: LogEntry): Promise<void> {
    // Use setTimeout to make it truly async and non-blocking
    setTimeout(async () => {
      try {
        await this.persistLog(entry);
      } catch (error) {
        console.error('Failed to persist log entry:', error);
        // In production, you might want to send this to a fallback logging service
      }
    }, 0);
  }

  /**
   * Log an entry synchronously (for critical errors)
   */
  public async logSync(entry: LogEntry): Promise<void> {
    return this.persistLog(entry);
  }

  /**
   * Persist log entry to database
   */
  private async persistLog(entry: LogEntry): Promise<void> {
    const logData = {
      request_id: entry.requestId,
      timestamp: new Date().toISOString(),
      severity: entry.severity,
      service: entry.service || 'api-server',
      environment: process.env.NODE_ENV || 'development',
      user_id: entry.userId,
      user_role: entry.userRole,
      franchise_id: entry.franchiseId,
      endpoint: entry.endpoint,
      http_method: entry.httpMethod,
      query_params: entry.queryParams ? this.redactSensitiveData(entry.queryParams) : null,
      route_params: entry.routeParams ? this.redactSensitiveData(entry.routeParams) : null,
      request_headers: entry.requestHeaders ? this.redactSensitiveData(entry.requestHeaders) : null,
      request_body_summary: entry.requestBodySummary ? this.redactSensitiveData(entry.requestBodySummary) : null,
      response_status: entry.responseStatus,
      response_body_summary: entry.responseBodySummary,
      error_message: entry.errorMessage,
      stacktrace: entry.stacktrace,
      server_logs: entry.serverLogs,
      sql_queries: entry.sqlQueries || null,
      db_latency_ms: entry.dbLatencyMs,
      cpu_usage: entry.cpuUsage,
      memory_usage: entry.memoryUsage,
      frontend_errors: entry.frontendErrors || null,
      breadcrumbs: entry.breadcrumbs || null,
      git_commit_hash: entry.gitCommitHash || process.env.VERCEL_GIT_COMMIT_SHA || 'unknown',
      build_id: entry.buildId || process.env.VERCEL_DEPLOYMENT_ID || 'local',
      deployed_version: entry.deployedVersion || process.env.npm_package_version || '1.0.0',
      attachments: entry.attachments || null,
    };

    const { error } = await this.supabase
      .from('system_logs')
      .insert(logData);

    if (error) {
      console.error('Database log insert failed:', error);
      throw error;
    }
  }

  /**
   * Generate a signed token for deep links
   */
  public async generateSignedToken(
    requestId: string, 
    actorId: string, 
    actorEmail: string,
    expiresInSeconds: number = 3600, 
    scope: 'full' | 'redacted' = 'redacted',
    reason?: string
  ): Promise<{ token: string; url: string; expiresAt: string }> {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const tokenData: SignedTokenData = {
      requestId,
      issuer: 'safawala-crm',
      createdAt,
      expiresAt,
      actorId,
      scope,
      tokenId,
    };

    // Create HMAC signature
    const payload = JSON.stringify(tokenData);
    const signature = crypto
      .createHmac('sha256', this.SECRET_KEY)
      .update(payload)
      .digest('hex');

    const token = Buffer.from(JSON.stringify({ ...tokenData, signature })).toString('base64url');

    // Audit the token generation
    await this.supabase
      .from('log_token_audit')
      .insert({
        token_id: tokenId,
        request_id: requestId,
        actor_id: actorId,
        actor_email: actorEmail,
        scope,
        expires_at: expiresAt,
        reason,
      });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const url = `${baseUrl}/admin/logs?sid=${token}`;

    return { token, url, expiresAt };
  }

  /**
   * Validate and decode a signed token
   */
  public async validateSignedToken(token: string): Promise<SignedTokenData | null> {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
      const { signature, ...tokenData } = decoded;

      // Verify signature
      const expectedSignature = crypto
        .createHmac('sha256', this.SECRET_KEY)
        .update(JSON.stringify(tokenData))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid token signature');
        return null;
      }

      // Check expiration
      if (new Date(tokenData.expiresAt) < new Date()) {
        console.error('Token expired');
        return null;
      }

      // Check if token is revoked
      const { data: auditRecord } = await this.supabase
        .from('log_token_audit')
        .select('revoked_at')
        .eq('token_id', tokenData.tokenId)
        .single();

      if (auditRecord?.revoked_at) {
        console.error('Token revoked');
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Revoke a signed token
   */
  public async revokeToken(tokenIdOrRequestId: string, revokedBy: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('log_token_audit')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: revokedBy,
      })
      .or(`token_id.eq.${tokenIdOrRequestId},request_id.eq.${tokenIdOrRequestId}`);

    return !error;
  }

  /**
   * Get logs with filtering and pagination
   */
  public async getLogs(params: {
    requestId?: string;
    userId?: string;
    endpoint?: string;
    severity?: string;
    dateFrom?: string;
    dateTo?: string;
    franchiseId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
    scope?: 'full' | 'redacted';
  }) {
    let query = this.supabase
      .from('system_logs')
      .select('*', { count: 'exact' });

    // Apply filters
    if (params.requestId) {
      query = query.eq('request_id', params.requestId);
    }
    if (params.userId) {
      query = query.eq('user_id', params.userId);
    }
    if (params.endpoint) {
      query = query.ilike('endpoint', `%${params.endpoint}%`);
    }
    if (params.severity) {
      query = query.eq('severity', params.severity);
    }
    if (params.franchiseId) {
      query = query.eq('franchise_id', params.franchiseId);
    }
    if (params.dateFrom) {
      query = query.gte('timestamp', params.dateFrom);
    }
    if (params.dateTo) {
      query = query.lte('timestamp', params.dateTo);
    }
    if (params.search) {
      query = query.or(`error_message.ilike.%${params.search}%,endpoint.ilike.%${params.search}%,request_id.ilike.%${params.search}%`);
    }

    // Pagination
    const page = params.page || 1;
    const pageSize = params.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('timestamp', { ascending: false })
      .range(from, to);

    if (error) {
      throw error;
    }

    // Apply redaction if needed
    const processedData = data?.map(log => {
      if (params.scope === 'redacted') {
        return {
          ...log,
          request_headers: this.redactSensitiveData(log.request_headers),
          request_body_summary: this.redactSensitiveData(log.request_body_summary),
          sql_queries: this.redactSensitiveData(log.sql_queries),
        };
      }
      return log;
    });

    return {
      data: processedData,
      count,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }

  /**
   * Convenience methods for different log levels
   */
  public async logError(requestId: string, error: Error, context?: Partial<LogEntry>) {
    await this.logAsync({
      requestId,
      severity: 'ERROR',
      errorMessage: error.message,
      stacktrace: error.stack,
      ...context,
    });
  }

  public async logWarn(requestId: string, message: string, context?: Partial<LogEntry>) {
    await this.logAsync({
      requestId,
      severity: 'WARN',
      errorMessage: message,
      ...context,
    });
  }

  public async logInfo(requestId: string, message: string, context?: Partial<LogEntry>) {
    await this.logAsync({
      requestId,
      severity: 'INFO',
      errorMessage: message,
      ...context,
    });
  }

  public async logDebug(requestId: string, message: string, context?: Partial<LogEntry>) {
    await this.logAsync({
      requestId,
      severity: 'DEBUG',
      errorMessage: message,
      ...context,
    });
  }
}

// Export singleton instance
export const logService = new LogService();

// Utility function to wrap API routes with logging
export function withLogging<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: { endpoint: string; method: string }
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    const requestId = logService.generateRequestId();
    const startTime = Date.now();

    try {
      const result = await fn(...args);
      
      // Log successful request
      await logService.logInfo(requestId, 'Request completed successfully', {
        ...context,
        responseStatus: 200,
        dbLatencyMs: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      // Log error
      await logService.logError(requestId, error as Error, {
        ...context,
        dbLatencyMs: Date.now() - startTime,
      });
      
      throw error;
    }
  };
}