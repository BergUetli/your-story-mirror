/**
 * DIAGNOSTIC LOGGER SERVICE
 * 
 * Comprehensive error logging and diagnostic system for voice archiving validation
 */

import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticEvent {
  id?: string;
  timestamp: string;
  category: 'voice_recording' | 'memory_saving' | 'archive_display' | 'database' | 'system';
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  details: Record<string, any>;
  user_id?: string;
  session_id?: string;
  stack_trace?: string;
}

export interface ArchiveValidationResult {
  timestamp: string;
  validationId: string;
  voiceRecordingCount: number;
  memoryCount: number;
  archiveDisplayErrors: string[];
  databaseErrors: string[];
  recordingServiceErrors: string[];
  recommendations: string[];
  success: boolean;
}

class DiagnosticLoggerService {
  private sessionId: string;
  private diagnosticEvents: DiagnosticEvent[] = [];
  private maxLocalLogs = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandling();
  }

  private generateSessionId(): string {
    return `diag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandling() {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('system', 'unhandled_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('system', 'unhandled_rejection', {
        reason: event.reason,
        stack: event.reason?.stack
      });
    });
  }

  /**
   * Log diagnostic events
   */
  log(category: DiagnosticEvent['category'], level: DiagnosticEvent['level'], event: string, details: Record<string, any> = {}) {
    const diagnosticEvent: DiagnosticEvent = {
      timestamp: new Date().toISOString(),
      category,
      level,
      event,
      details,
      user_id: details.user_id,
      session_id: this.sessionId,
      stack_trace: level === 'error' ? new Error().stack : undefined
    };

    // Store locally
    this.diagnosticEvents.push(diagnosticEvent);
    if (this.diagnosticEvents.length > this.maxLocalLogs) {
      this.diagnosticEvents = this.diagnosticEvents.slice(-this.maxLocalLogs);
    }

    // Console output with formatting
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `🔍 [${timestamp}] [${category.toUpperCase()}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ❌ ${event}`, details);
        break;
      case 'warn':
        console.warn(`${prefix} ⚠️ ${event}`, details);
        break;
      case 'info':
        console.log(`${prefix} ℹ️ ${event}`, details);
        break;
      case 'debug':
        console.debug(`${prefix} 🐛 ${event}`, details);
        break;
    }

    // Store to database (async, non-blocking)
    this.persistToDatabaseAsync(diagnosticEvent).catch(err => {
      console.warn('Failed to persist diagnostic event:', err);
    });
  }

  logInfo(category: DiagnosticEvent['category'], event: string, details: Record<string, any> = {}) {
    this.log(category, 'info', event, details);
  }

  logWarn(category: DiagnosticEvent['category'], event: string, details: Record<string, any> = {}) {
    this.log(category, 'warn', event, details);
  }

  logError(category: DiagnosticEvent['category'], event: string, details: Record<string, any> = {}) {
    this.log(category, 'error', event, details);
  }

  logDebug(category: DiagnosticEvent['category'], event: string, details: Record<string, any> = {}) {
    this.log(category, 'debug', event, details);
  }

  /**
   * Validate voice archiving system comprehensively
   */
  async validateVoiceArchiving(userId?: string): Promise<ArchiveValidationResult> {
    const validationId = `validation_${Date.now()}`;
    const result: ArchiveValidationResult = {
      timestamp: new Date().toISOString(),
      validationId,
      voiceRecordingCount: 0,
      memoryCount: 0,
      archiveDisplayErrors: [],
      databaseErrors: [],
      recordingServiceErrors: [],
      recommendations: [],
      success: false
    };

    this.logInfo('archive_display', 'validation_started', { validationId, userId });

    try {
      // 1. Test database connectivity
      await this.validateDatabaseConnectivity(result);

      // 2. Check voice recordings table
      await this.validateVoiceRecordingsTable(result, userId);

      // 3. Check memories table  
      await this.validateMemoriesTable(result, userId);

      // 4. Test voice recording service
      await this.validateVoiceRecordingService(result);

      // 5. Check archive display functionality
      await this.validateArchiveDisplay(result, userId);

      // 6. Generate recommendations
      this.generateRecommendations(result);

      result.success = result.archiveDisplayErrors.length === 0 && 
                      result.databaseErrors.length === 0 && 
                      result.recordingServiceErrors.length === 0;

      this.logInfo('archive_display', 'validation_completed', { 
        validationId, 
        success: result.success,
        summary: result
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown validation error';
      result.archiveDisplayErrors.push(`Validation failed: ${errorMsg}`);
      result.success = false;
      
      this.logError('archive_display', 'validation_failed', { 
        validationId, 
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return result;
  }

  private async validateDatabaseConnectivity(result: ArchiveValidationResult) {
    try {
      const { data, error } = await supabase.from('voice_recordings').select('count', { count: 'exact', head: true });
      
      if (error) {
        result.databaseErrors.push(`Database connectivity error: ${error.message}`);
        this.logError('database', 'connectivity_failed', { error: error.message, code: error.code });
      } else {
        this.logInfo('database', 'connectivity_success', { recordCount: data });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown database error';
      result.databaseErrors.push(`Database connection failed: ${errorMsg}`);
      this.logError('database', 'connection_exception', { error: errorMsg });
    }
  }

  private async validateVoiceRecordingsTable(result: ArchiveValidationResult, userId?: string) {
    try {
      // Check table structure
      const { data: columns, error: structureError } = await supabase.rpc('get_table_columns', { 
        table_name: 'voice_recordings' 
      });
      
      if (structureError) {
        result.databaseErrors.push(`Voice recordings table structure error: ${structureError.message}`);
        this.logError('database', 'table_structure_error', { 
          table: 'voice_recordings',
          error: structureError.message 
        });
      }

      // Count recordings
      let query = supabase.from('voice_recordings').select('*', { count: 'exact' });
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error, count } = await query;
      
      if (error) {
        result.databaseErrors.push(`Voice recordings query error: ${error.message}`);
        this.logError('voice_recording', 'query_failed', { error: error.message, userId });
      } else {
        result.voiceRecordingCount = count || 0;
        this.logInfo('voice_recording', 'count_retrieved', { 
          count: result.voiceRecordingCount, 
          userId,
          sampleRecordings: data?.slice(0, 3)
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown voice recordings error';
      result.databaseErrors.push(`Voice recordings validation failed: ${errorMsg}`);
      this.logError('voice_recording', 'validation_exception', { error: errorMsg, userId });
    }
  }

  private async validateMemoriesTable(result: ArchiveValidationResult, userId?: string) {
    try {
      // Check if table has required columns
      const { data: tableInfo, error: infoError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'memories')
        .eq('table_schema', 'public');

      if (infoError) {
        result.databaseErrors.push(`Memories table info error: ${infoError.message}`);
        this.logError('memory_saving', 'table_info_failed', { error: infoError.message });
      } else {
        const columnNames = tableInfo?.map(col => col.column_name) || [];
        const requiredColumns = ['is_primary_chunk', 'source_type'];
        const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
        
        if (missingColumns.length > 0) {
          result.databaseErrors.push(`Missing required columns: ${missingColumns.join(', ')}`);
          this.logError('memory_saving', 'missing_columns', { missingColumns, availableColumns: columnNames });
        } else {
          this.logInfo('memory_saving', 'table_structure_valid', { columns: columnNames });
        }
      }

      // Count memories
      let query = supabase.from('memories').select('*', { count: 'exact' });
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error, count } = await query;
      
      if (error) {
        result.databaseErrors.push(`Memories query error: ${error.message}`);
        this.logError('memory_saving', 'query_failed', { error: error.message, userId });
      } else {
        result.memoryCount = count || 0;
        this.logInfo('memory_saving', 'count_retrieved', { 
          count: result.memoryCount, 
          userId,
          sampleMemories: data?.slice(0, 3)
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown memories error';
      result.databaseErrors.push(`Memories validation failed: ${errorMsg}`);
      this.logError('memory_saving', 'validation_exception', { error: errorMsg, userId });
    }
  }

  private async validateVoiceRecordingService(result: ArchiveValidationResult) {
    try {
      // Test MediaRecorder availability
      if (!window.MediaRecorder) {
        result.recordingServiceErrors.push('MediaRecorder API not available');
        this.logError('voice_recording', 'mediarecorder_unavailable', {});
      } else {
        this.logInfo('voice_recording', 'mediarecorder_available', { 
          supportedTypes: [
            MediaRecorder.isTypeSupported('audio/webm'),
            MediaRecorder.isTypeSupported('audio/mp4'),
            MediaRecorder.isTypeSupported('audio/wav')
          ]
        });
      }

      // Test microphone permissions
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        this.logInfo('voice_recording', 'microphone_permission_granted', {});
      } catch (micError) {
        result.recordingServiceErrors.push('Microphone permission denied or unavailable');
        this.logError('voice_recording', 'microphone_permission_denied', { 
          error: micError instanceof Error ? micError.message : 'Unknown mic error'
        });
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown recording service error';
      result.recordingServiceErrors.push(`Recording service validation failed: ${errorMsg}`);
      this.logError('voice_recording', 'service_validation_failed', { error: errorMsg });
    }
  }

  private async validateArchiveDisplay(result: ArchiveValidationResult, userId?: string) {
    try {
      // Test archive data loading
      const { aiVoiceSearch } = await import('@/services/aiVoiceSearch');
      
      let recordings;
      if (userId) {
        recordings = await aiVoiceSearch.getAllVoiceRecordings(userId);
      } else {
        recordings = await aiVoiceSearch.getDemoRecordings();
      }

      this.logInfo('archive_display', 'recordings_loaded', { 
        count: recordings.length,
        userId,
        sampleRecordings: recordings.slice(0, 2)
      });

      // Validate recording structure
      if (recordings.length > 0) {
        const sampleRecording = recordings[0];
        const requiredFields = ['id', 'created_at', 'file_url'];
        const missingFields = requiredFields.filter(field => !(field in sampleRecording));
        
        if (missingFields.length > 0) {
          result.archiveDisplayErrors.push(`Recording missing required fields: ${missingFields.join(', ')}`);
          this.logError('archive_display', 'invalid_recording_structure', { 
            missingFields, 
            sampleRecording 
          });
        }
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown archive display error';
      result.archiveDisplayErrors.push(`Archive display validation failed: ${errorMsg}`);
      this.logError('archive_display', 'validation_failed', { error: errorMsg, userId });
    }
  }

  private generateRecommendations(result: ArchiveValidationResult) {
    if (result.databaseErrors.length > 0) {
      result.recommendations.push('Check database connectivity and table schema');
      result.recommendations.push('Ensure all required columns exist in memories table');
    }

    if (result.recordingServiceErrors.length > 0) {
      result.recommendations.push('Check microphone permissions in browser settings');
      result.recommendations.push('Verify MediaRecorder API support in current browser');
    }

    if (result.archiveDisplayErrors.length > 0) {
      result.recommendations.push('Check voice recording data structure and file URLs');
      result.recommendations.push('Verify archive display component error handling');
    }

    if (result.voiceRecordingCount === 0) {
      result.recommendations.push('No voice recordings found - test recording functionality');
    }

    if (result.memoryCount === 0) {
      result.recommendations.push('No memories found - test memory creation and auto-save');
    }

    if (result.success) {
      result.recommendations.push('All systems operational - voice archiving should work correctly');
    }
  }

  /**
   * Get recent diagnostic events
   */
  getRecentEvents(count: number = 50, category?: DiagnosticEvent['category']): DiagnosticEvent[] {
    let events = this.diagnosticEvents;
    
    if (category) {
      events = events.filter(e => e.category === category);
    }
    
    return events.slice(-count).reverse();
  }

  /**
   * Export diagnostic data
   */
  exportDiagnostics(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportTime: new Date().toISOString(),
      eventCount: this.diagnosticEvents.length,
      events: this.diagnosticEvents
    }, null, 2);
  }

  /**
   * Clear diagnostic events
   */
  clearEvents() {
    this.diagnosticEvents = [];
    this.logInfo('system', 'diagnostic_events_cleared', {});
  }

  /**
   * Store diagnostic event to database (non-blocking)
   */
  private async persistToDatabaseAsync(event: DiagnosticEvent) {
    try {
      const { error } = await supabase
        .from('diagnostic_logs')
        .insert([event]);

      if (error && !error.message.includes('relation "diagnostic_logs" does not exist')) {
        console.warn('Failed to persist diagnostic event:', error);
      }
    } catch (error) {
      // Silently fail - diagnostic logging shouldn't break the app
    }
  }
}

// Export singleton instance
export const diagnosticLogger = new DiagnosticLoggerService();

// Export convenience methods
export const logVoiceRecording = (level: DiagnosticEvent['level'], event: string, details: Record<string, any> = {}) => 
  diagnosticLogger.log('voice_recording', level, event, details);

export const logMemorySaving = (level: DiagnosticEvent['level'], event: string, details: Record<string, any> = {}) => 
  diagnosticLogger.log('memory_saving', level, event, details);

export const logArchiveDisplay = (level: DiagnosticEvent['level'], event: string, details: Record<string, any> = {}) => 
  diagnosticLogger.log('archive_display', level, event, details);

export const logDatabase = (level: DiagnosticEvent['level'], event: string, details: Record<string, any> = {}) => 
  diagnosticLogger.log('database', level, event, details);