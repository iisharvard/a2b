import { collection, addDoc, Timestamp, Firestore } from 'firebase/firestore';
import { FirebaseStorage, ref, uploadBytes } from 'firebase/storage'; // Removed getDownloadURL as we decided to use hash as primary reference
import { hashFile } from './hashing';
import { getSessionId } from './session';
import { generateCaseId } from './case';

// --- Interfaces for Log Structures ---

interface BaseLog {
  id?: string; // Firestore will generate this
  userId: string;
  sessionId: string;
  caseId: string; // Hash of case content
  timestamp: Timestamp;
}

export interface ChatLog extends BaseLog {
  sender: 'user' | 'bot';
  message: string;
  component: string;
}

export interface FrameworkLog extends BaseLog {
  framework: 'IoA' | 'Iceberg' | 'Redline';
  action: 'generate' | 'edit' | 'export';
  inputSize?: number;
  wasEdited?: boolean;
  inputFileHash?: string;
  frameworkContent?: string; // Added to store the actual content
}

export interface PageVisitLog extends BaseLog {
  page: string;
  action: 'enter' | 'exit';
  durationMs?: number;
}

export interface ExportLog extends BaseLog {
  framework: 'IoA' | 'Iceberg' | 'Redline';
  format: string;
  fileHash: string;
  fileName: string;
  fileSize: number;
}

// New interfaces for negotiation-specific data

export interface NegotiationPartyLog extends BaseLog {
  partyId: string;
  partyName: string;
  partyRole?: string;
  partyType?: 'self' | 'counterpart' | 'third_party';
  metadata?: Record<string, any>; // Additional party data
}

export interface NegotiationIssueLog extends BaseLog {
  issueId: string;
  issueName: string;
  issueDescription?: string;
  priorityLevel?: number; // Optional priority ranking
  metadata?: Record<string, any>; // Additional issue data
}

export interface NegotiationBoundaryLog extends BaseLog {
  boundaryId: string;
  boundaryType: 'red_line' | 'aspiration' | 'reservation_value' | 'other';
  boundaryDescription: string;
  relatedIssueId?: string; // If this boundary relates to a specific issue
  value?: string | number; // The actual boundary value if applicable
  metadata?: Record<string, any>; // Additional boundary data
}

export interface NegotiationScenarioLog extends BaseLog {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription?: string;
  scenarioOutcome?: string;
  metadata?: Record<string, any>; // Additional scenario data
}

// --- Simplified logging functions (automatically include session ID) ---

export const logChatInteraction = async (
  db: Firestore,
  userId: string,
  caseId: string,
  sender: 'user' | 'bot',
  message: string,
  component: string
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'chat_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      sender,
      message,
      component,
      timestamp: Timestamp.now(),
    });
    console.log('Chat log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding chat log: ', e);
    throw e;
  }
};

export const logFrameworkUsage = async (
  db: Firestore,
  userId: string,
  caseId: string,
  framework: 'IoA' | 'Iceberg' | 'Redline',
  action: 'generate' | 'edit' | 'export',
  options?: {
    inputSize?: number;
    wasEdited?: boolean;
    inputFileHash?: string;
    frameworkContent?: string; // Added here as well
  }
): Promise<string> => {
  try {
    const docData: Partial<FrameworkLog> = {
      userId,
      sessionId: getSessionId(),
      caseId,
      framework,
      action,
      timestamp: Timestamp.now(),
    };

    if (options?.inputSize !== undefined) docData.inputSize = options.inputSize;
    if (options?.wasEdited !== undefined) docData.wasEdited = options.wasEdited;
    if (options?.inputFileHash !== undefined) docData.inputFileHash = options.inputFileHash;
    if (options?.frameworkContent !== undefined) docData.frameworkContent = options.frameworkContent; // Add to document data

    const docRef = await addDoc(collection(db, 'framework_logs'), docData);
    console.log('Framework log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding framework log: ', e);
    throw e;
  }
};

export const logPageVisit = async (
  db: Firestore,
  userId: string,
  caseId: string,
  page: string,
  action: 'enter' | 'exit',
  durationMs?: number
): Promise<string> => {
  try {
    // Construct the log data object dynamically
    const logData: Partial<PageVisitLog> = {
      userId,
      sessionId: getSessionId(),
      caseId,
      page,
      action,
      timestamp: Timestamp.now(),
    };

    // Conditionally add durationMs only if it's defined and the action is 'exit'
    if (action === 'exit' && typeof durationMs === 'number') {
      logData.durationMs = durationMs;
    }

    const docRef = await addDoc(collection(db, 'page_visits'), logData);
    console.log('Page visit log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding page visit log: ', e);
    throw e;
  }
};

export const logExportEvent = async (
  db: Firestore,
  storage: FirebaseStorage,
  userId: string,
  caseId: string,
  framework: 'IoA' | 'Iceberg' | 'Redline',
  format: string,
  file: File
): Promise<string> => {
  try {
    const fileHash = await hashFile(file);
    const fileExtension = file.name.split('.').pop() || '';
    const storagePath = `exported_files/${fileHash}${fileExtension ? '.' + fileExtension : ''}`;
    const storageRef = ref(storage, storagePath);

    await uploadBytes(storageRef, file);
    console.log(`File uploaded to: ${storagePath}`);

    const docRef = await addDoc(collection(db, 'export_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      framework,
      format,
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      timestamp: Timestamp.now(),
    });
    console.log('Export log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error logging export event or uploading file: ', e);
    throw e;
  }
};

// New logging functions for negotiation-specific data

export const logNegotiationParty = async (
  db: Firestore,
  userId: string,
  caseId: string,
  partyId: string,
  partyName: string,
  options?: {
    partyRole?: string;
    partyType?: 'self' | 'counterpart' | 'third_party';
    metadata?: Record<string, any>;
  }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'negotiation_party_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      partyId,
      partyName,
      ...options,
      timestamp: Timestamp.now(),
    });
    console.log('Negotiation party log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding negotiation party log: ', e);
    throw e;
  }
};

export const logNegotiationIssue = async (
  db: Firestore,
  userId: string,
  caseId: string,
  issueId: string,
  issueName: string,
  options?: {
    issueDescription?: string;
    priorityLevel?: number;
    metadata?: Record<string, any>;
  }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'negotiation_issue_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      issueId,
      issueName,
      ...options,
      timestamp: Timestamp.now(),
    });
    console.log('Negotiation issue log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding negotiation issue log: ', e);
    throw e;
  }
};

export const logNegotiationBoundary = async (
  db: Firestore,
  userId: string,
  caseId: string,
  boundaryId: string,
  boundaryType: 'red_line' | 'aspiration' | 'reservation_value' | 'other',
  boundaryDescription: string,
  options?: {
    relatedIssueId?: string;
    value?: string | number;
    metadata?: Record<string, any>;
  }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'negotiation_boundary_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      boundaryId,
      boundaryType,
      boundaryDescription,
      ...options,
      timestamp: Timestamp.now(),
    });
    console.log('Negotiation boundary log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding negotiation boundary log: ', e);
    throw e;
  }
};

export const logNegotiationScenario = async (
  db: Firestore,
  userId: string,
  caseId: string,
  scenarioId: string,
  scenarioName: string,
  options?: {
    scenarioDescription?: string;
    scenarioOutcome?: string;
    metadata?: Record<string, any>;
  }
): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, 'negotiation_scenario_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      scenarioId,
      scenarioName,
      ...options,
      timestamp: Timestamp.now(),
    });
    console.log('Negotiation scenario log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding negotiation scenario log: ', e);
    throw e;
  }
};

// Utility to log a case file upload and generate a caseId
export const logCaseFileUpload = async (
  db: Firestore, 
  storage: FirebaseStorage,
  userId: string,
  file: File,
  fullContent: string // The full text content of the case file (for generating caseId)
): Promise<{ caseId: string, logId: string }> => {
  try {
    // Generate caseId from content
    const caseId = generateCaseId(fullContent);
    
    // Hash the file
    const fileHash = await hashFile(file);
    const fileExtension = file.name.split('.').pop() || '';
    const storagePath = `case_files/${fileHash}${fileExtension ? '.' + fileExtension : ''}`;
    const storageRef = ref(storage, storagePath);

    // Upload to Firebase Storage
    await uploadBytes(storageRef, file);
    console.log(`Case file uploaded to: ${storagePath}`);

    // Log the case file in Firestore
    const docRef = await addDoc(collection(db, 'case_file_logs'), {
      userId,
      sessionId: getSessionId(),
      caseId,
      fileHash,
      fileName: file.name,
      fileSize: file.size,
      timestamp: Timestamp.now(),
    });
    
    console.log('Case file log added with ID:', docRef.id);
    return { caseId, logId: docRef.id };
  } catch (e) {
    console.error('Error logging case file upload:', e);
    throw e;
  }
};

// --- Legacy compatibility for direct log object passing ---

export const logChatInteractionDirect = async (
  db: Firestore,
  logData: Omit<ChatLog, 'timestamp' | 'id' | 'sessionId'> & { sessionId?: string }
): Promise<string> => {
  try {
    const sessionId = logData.sessionId || getSessionId();
    const docRef = await addDoc(collection(db, 'chat_logs'), {
      ...logData,
      sessionId,
      timestamp: Timestamp.now(),
    });
    console.log('Chat log added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding chat log: ', e);
    throw e;
  }
};

// Example session ID generation (implement according to your app's structure)
// let currentAppSessionId: string | null = null;
// export const getAppSessionId = (): string => {
//   if (!currentAppSessionId) {
//     currentAppSessionId = crypto.randomUUID();
//   }
//   return currentAppSessionId;
// };

// Example case ID generation (implement according to your app's structure)
// export const generateAppCaseId = (definingCaseInput: string): string => {
//   return hashString(definingCaseInput);
// }; 