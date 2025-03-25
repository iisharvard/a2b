import { ChatMessage } from '../../services/chatService';

// Message types
export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export interface ChatBotProps {
  /** OpenAI API key. If not provided, will use VITE_OPENAI_API_KEY from environment */
  apiKey?: string;
  /** Title shown in the chat window header */
  title?: string;
  /** Subtitle shown in the chat window header */
  subtitle?: string;
  /** Primary color for the chat UI */
  primaryColor?: string;
  /** URL for the bot's avatar image */
  botAvatar?: string;
  /** URL for the user's avatar image */
  userAvatar?: string;
  /** Initial message shown when the chat is first opened */
  initialMessage?: string;
  /** System message that defines the AI assistant's behavior */
  systemMessage?: string;
  /** Whether the chat is in split-screen mode (not a popup) */
  splitScreenMode?: boolean;
}

// State snapshot types
export interface ComponentBasic {
  id: string;
  name: string;
  description: string;
}

export interface ComponentBoundaries extends ComponentBasic {
  redlineParty1: string;
  bottomlineParty1: string;
  redlineParty2: string;
  bottomlineParty2: string;
}

export interface Scenario {
  id: string;
  componentId: string;
  type: string;
  description: string;
}

export interface StateSnapshot {
  caseFile: any | null;
  ioa: any | null;
  iceberg: any | null;
  issues: ComponentBasic[] | null;
  boundaries: ComponentBoundaries[] | null;
  scenarios: Scenario[] | null;
  timestamp: number;
}

export interface ChangeRecord {
  timestamp: number;
  summary?: string;
  details?: string;
  changes?: string[];
  severity?: number;
}

// Debug state interface
export interface DebugState {
  isDebugWindowOpen: boolean;
  prevSnapshot: StateSnapshot | null;
  changeHistory: ChangeRecord[];
  showFullState: boolean;
  lastDiffResult: { summary: string | null; details: string | null } | null;
}

// Chat state interface
export interface ChatState {
  isOpen: boolean;
  messages: Message[];
  inputValue: string;
  isTyping: boolean;
  conversation: ChatMessage[];
  isFirstOpen: boolean;
  currentStreamedMessage: Message | null;
  streamingText: string;
} 