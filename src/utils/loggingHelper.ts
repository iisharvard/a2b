import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import * as uuid from 'uuid';
import { 
  logChatInteraction,
  logFrameworkUsage,
  logPageVisit,
  logExportEvent,
  logCaseFileUpload,
  logNegotiationParty,
  logNegotiationIssue,
  logNegotiationBoundary,
  logNegotiationScenario
} from './logging';

/**
 * A helper class that simplifies logging throughout the application
 * Maintains references to Firestore, Storage, userId, and caseId
 */
export class LoggingHelper {
  private db: Firestore;
  private storage: FirebaseStorage;
  private userId: string;
  private currentCaseId: string | null = null;

  constructor(db: Firestore, storage: FirebaseStorage, userId: string) {
    this.db = db;
    this.storage = storage;
    this.userId = userId;
  }

  /**
   * Set the current case ID for subsequent logging calls
   */
  setCaseId(caseId: string): void {
    this.currentCaseId = caseId;
  }

  /**
   * Get the current case ID. 
   * If allowGlobal is true and no specific caseId is set, it returns 'app_global'.
   * Otherwise, it throws an error if no caseId is set and allowGlobal is false.
   */
  getCaseId(allowGlobal: boolean = false): string {
    if (this.currentCaseId) {
      return this.currentCaseId;
    }
    if (allowGlobal) {
      return 'app_global';
    }
    throw new Error('Case ID is not set. Call setCaseId first or provide it explicitly.');
  }

  /**
   * Log a chat interaction
   */
  async logChat(
    sender: 'user' | 'bot',
    message: string,
    component: string,
    caseId?: string // Allow explicit caseId override
  ): Promise<string> {
    return logChatInteraction(
      this.db,
      this.userId,
      // Use explicit caseId if provided, otherwise getCaseId (allowing global for chat)
      caseId || this.getCaseId(true), 
      sender,
      message,
      component
    );
  }

  /**
   * Log framework usage
   */
  async logFramework(
    framework: 'IoA' | 'Iceberg' | 'Redline',
    action: 'generate' | 'edit' | 'export',
    options?: {
      inputSize?: number;
      wasEdited?: boolean;
      inputFileHash?: string;
      frameworkContent?: string;
    },
    caseId?: string
  ): Promise<string> {
    return logFrameworkUsage(
      this.db,
      this.userId,
      caseId || this.getCaseId(framework === 'Iceberg' || framework === 'IoA' || framework === 'Redline'),
      framework,
      action,
      options
    );
  }

  /**
   * Log a page visit
   */
  async logPageVisit(
    page: string,
    action: 'enter' | 'exit',
    durationMs?: number,
    caseId?: string
  ): Promise<string> {
    return logPageVisit(
      this.db,
      this.userId,
      caseId || this.getCaseId(),
      page,
      action,
      durationMs
    );
  }

  /**
   * Log an export event
   */
  async logExport(
    framework: 'IoA' | 'Iceberg' | 'Redline',
    format: string,
    file: File,
    caseId?: string
  ): Promise<string> {
    return logExportEvent(
      this.db,
      this.storage,
      this.userId,
      caseId || this.getCaseId(),
      framework,
      format,
      file
    );
  }

  /**
   * Log a case file upload and set the case ID
   */
  async logCaseFile(
    file: File,
    fullContent: string
  ): Promise<{ caseId: string, logId: string }> {
    const result = await logCaseFileUpload(
      this.db,
      this.storage,
      this.userId,
      file,
      fullContent
    );
    // Automatically set the current case ID
    this.setCaseId(result.caseId);
    return result;
  }

  /**
   * Log a negotiation party
   */
  async logParty(
    partyName: string,
    options?: {
      partyId?: string;
      partyRole?: string;
      partyType?: 'self' | 'counterpart' | 'third_party';
      metadata?: Record<string, any>;
    },
    caseId?: string
  ): Promise<string> {
    const partyId = options?.partyId || uuid.v4();
    return logNegotiationParty(
      this.db,
      this.userId,
      caseId || this.getCaseId(),
      partyId,
      partyName,
      options
    );
  }

  /**
   * Log a negotiation issue
   */
  async logIssue(
    issueName: string,
    options?: {
      issueId?: string;
      issueDescription?: string;
      priorityLevel?: number;
      metadata?: Record<string, any>;
    },
    caseId?: string
  ): Promise<string> {
    const issueId = options?.issueId || uuid.v4();
    return logNegotiationIssue(
      this.db,
      this.userId,
      caseId || this.getCaseId(),
      issueId,
      issueName,
      options
    );
  }

  /**
   * Log a negotiation boundary
   */
  async logBoundary(
    boundaryType: 'red_line' | 'aspiration' | 'reservation_value' | 'other',
    boundaryDescription: string,
    options?: {
      boundaryId?: string;
      relatedIssueId?: string;
      value?: string | number;
      metadata?: Record<string, any>;
    },
    caseId?: string
  ): Promise<string> {
    const boundaryId = options?.boundaryId || uuid.v4();
    return logNegotiationBoundary(
      this.db,
      this.userId,
      caseId || this.getCaseId(),
      boundaryId,
      boundaryType,
      boundaryDescription,
      options
    );
  }

  /**
   * Log a negotiation scenario
   */
  async logScenario(
    scenarioName: string,
    options?: {
      scenarioId?: string;
      scenarioDescription?: string;
      scenarioOutcome?: string;
      metadata?: Record<string, any>;
    },
    caseId?: string
  ): Promise<string> {
    const scenarioId = options?.scenarioId || uuid.v4();
    return logNegotiationScenario(
      this.db,
      this.userId,
      caseId || this.getCaseId(),
      scenarioId,
      scenarioName,
      options
    );
  }
} 