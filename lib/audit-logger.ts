/**
 * Audit Logger
 * 
 * Provides comprehensive audit logging functionality for tracking
 * all CRUD operations in the CRM system.
 */

import { supabaseServer } from './supabase-server-simple';

export interface AuditLogEntry {
  id?: string;
  table_name: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ';
  record_id: string;
  old_values?: any;
  new_values?: any;
  user_id?: string;
  user_email?: string;
  timestamp?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  changes_summary?: string;
  metadata?: any;
}

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class AuditLogger {
  
  /**
   * Log a CREATE operation
   */
  static async logCreate(
    tableName: string,
    recordId: string,
    newValues: any,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      table_name: tableName,
      operation: 'CREATE',
      record_id: recordId,
      new_values: this.sanitizeData(newValues),
      changes_summary: `Created new ${tableName} record`,
      ...context,
    });
  }

  /**
   * Log an UPDATE operation
   */
  static async logUpdate(
    tableName: string,
    recordId: string,
    oldValues: any,
    newValues: any,
    context?: AuditContext
  ): Promise<void> {
    const changes = this.getChanges(oldValues, newValues);
    
    await this.log({
      table_name: tableName,
      operation: 'UPDATE',
      record_id: recordId,
      old_values: this.sanitizeData(oldValues),
      new_values: this.sanitizeData(newValues),
      changes_summary: this.generateChangesSummary(changes),
      metadata: { changes },
      ...context,
    });
  }

  /**
   * Log a DELETE operation
   */
  static async logDelete(
    tableName: string,
    recordId: string,
    oldValues: any,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      table_name: tableName,
      operation: 'DELETE',
      record_id: recordId,
      old_values: this.sanitizeData(oldValues),
      changes_summary: `Deleted ${tableName} record`,
      ...context,
    });
  }

  /**
   * Log a READ operation (for sensitive data access)
   */
  static async logRead(
    tableName: string,
    recordId: string,
    context?: AuditContext
  ): Promise<void> {
    await this.log({
      table_name: tableName,
      operation: 'READ',
      record_id: recordId,
      changes_summary: `Accessed ${tableName} record`,
      ...context,
    });
  }

  /**
   * Core logging method
   */
  private static async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Add timestamp if not provided
      if (!entry.timestamp) {
        entry.timestamp = new Date().toISOString();
      }

      // Insert into audit_logs table
      const { error } = await supabaseServer
        .from('audit_logs')
        .insert([entry]);

      if (error) {
        console.error('Audit logging failed:', error);
        // Don't throw - audit logging should never break the main operation
      }
    } catch (error) {
      console.error('Audit logging error:', error);
      // Silent fail - audit logging is important but not critical
    }
  }

  /**
   * Extract context from Next.js request
   */
  static extractContext(request: Request): AuditContext {
    const headers = request.headers;
    
    return {
      ipAddress: headers.get('x-forwarded-for') || 
                headers.get('x-real-ip') || 
                'unknown',
      userAgent: headers.get('user-agent') || 'unknown',
      // TODO: Extract userId and userEmail from JWT when authentication is re-enabled
      // userId: extractUserIdFromJWT(request),
      // userEmail: extractUserEmailFromJWT(request),
    };
  }

  /**
   * Get differences between old and new values
   */
  private static getChanges(oldValues: any, newValues: any): Record<string, { from: any; to: any }> {
    const changes: Record<string, { from: any; to: any }> = {};
    
    // Check for changed fields
    for (const [key, newValue] of Object.entries(newValues)) {
      const oldValue = oldValues[key];
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { from: oldValue, to: newValue };
      }
    }

    return changes;
  }

  /**
   * Generate a human-readable summary of changes
   */
  private static generateChangesSummary(changes: Record<string, { from: any; to: any }>): string {
    const changeDescriptions = Object.entries(changes).map(([field, change]) => {
      return `${field}: "${change.from}" → "${change.to}"`;
    });

    if (changeDescriptions.length === 0) {
      return 'No changes detected';
    }

    return `Changed: ${changeDescriptions.join(', ')}`;
  }

  /**
   * Remove sensitive data from audit logs
   */
  private static sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'key',
      'auth',
      'credit_card',
      'ssn',
      'pan',
      'aadhar'
    ];

    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Retrieve audit logs for a specific record
   */
  static async getAuditHistory(
    tableName: string,
    recordId: string,
    limit: number = 50
  ): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await supabaseServer
        .from('audit_logs')
        .select('*')
        .eq('table_name', tableName)
        .eq('record_id', recordId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to retrieve audit history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Audit history retrieval error:', error);
      return [];
    }
  }

  /**
   * Get audit statistics for monitoring
   */
  static async getAuditStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalOperations: number;
    operationsByType: Record<string, number>;
    operationsByTable: Record<string, number>;
  }> {
    try {
      let query = supabaseServer
        .from('audit_logs')
        .select('operation, table_name');

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to retrieve audit stats:', error);
        return {
          totalOperations: 0,
          operationsByType: {},
          operationsByTable: {},
        };
      }

      const totalOperations = data?.length || 0;
      const operationsByType: Record<string, number> = {};
      const operationsByTable: Record<string, number> = {};

      data?.forEach((log: any) => {
        operationsByType[log.operation] = (operationsByType[log.operation] || 0) + 1;
        operationsByTable[log.table_name] = (operationsByTable[log.table_name] || 0) + 1;
      });

      return {
        totalOperations,
        operationsByType,
        operationsByTable,
      };
    } catch (error) {
      console.error('Audit stats retrieval error:', error);
      return {
        totalOperations: 0,
        operationsByType: {},
        operationsByTable: {},
      };
    }
  }
}

export default AuditLogger;