import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define localStorage keys
const STORAGE_KEY_CURRENT_CASE = 'a2b_current_case';

// Helper function to load state from localStorage
const loadStateFromStorage = (): NegotiationState => {
  try {
    const savedCase = localStorage.getItem(STORAGE_KEY_CURRENT_CASE);
    if (savedCase) {
      const parsedCase = JSON.parse(savedCase);
      return {
        currentCase: parsedCase,
        loading: false,
        error: null,
        selectedScenario: null,
      };
    }
  } catch (error) {
    console.error('Error loading state from localStorage:', error);
  }
  return initialState;
};

// Helper function to save state to localStorage
const saveStateToStorage = (state: NegotiationState) => {
  try {
    if (state.currentCase) {
      localStorage.setItem(STORAGE_KEY_CURRENT_CASE, JSON.stringify(state.currentCase));
    }
  } catch (error) {
    console.error('Error saving state to localStorage:', error);
  }
};

// Define types for our state
export interface Party {
  id: string;
  name: string;
  description: string;
  isUserSide: boolean;
  isPrimary: boolean;
  idealOutcomes?: string[];
}

export interface Component {
  id: string;
  name: string;
  description: string;
  redlineParty1: string;
  bottomlineParty1: string;
  redlineParty2: string;
  bottomlineParty2: string;
  priority: number;
}

export interface Scenario {
  id: string;
  componentId: string;
  type: 'redline_violated_p1' | 'bottomline_violated_p1' | 'agreement_area' | 'bottomline_violated_p2' | 'redline_violated_p2';
  description: string;
}

export interface RiskAssessment {
  id: string;
  scenarioId: string;
  category: string;
  shortTermImpact: string;
  shortTermMitigation: string;
  shortTermRiskAfter: string;
  longTermImpact: string;
  longTermMitigation: string;
  longTermRiskAfter: string;
  overallAssessment: string;
}

export interface Analysis {
  id: string;
  ioa: string;
  iceberg: string;
  components: Component[];
  createdAt: string;
  updatedAt: string;
}

export interface Case {
  id: string;
  title: string;
  content: string;
  processed: boolean;
  suggestedParties: Party[];
  analysis: Analysis | null;
  scenarios: Scenario[];
  riskAssessments: RiskAssessment[];
  originalContent: {
    analysis: Analysis | null;
    scenarios: Scenario[];
    riskAssessments: RiskAssessment[];
  };
}

export interface NegotiationState {
  currentCase: Case | null;
  selectedScenario: Scenario | null;
  loading: boolean;
  error: string | null;
}

const initialState: NegotiationState = {
  currentCase: null,
  loading: false,
  error: null,
  selectedScenario: null,
};

export const negotiationSlice = createSlice({
  name: 'negotiation',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCase: (state, action: PayloadAction<{ id: string; title?: string; content: string }>) => {
      state.currentCase = {
        id: action.payload.id,
        title: action.payload.title || 'Untitled Case',
        content: action.payload.content,
        processed: false,
        suggestedParties: [],
        analysis: null,
        scenarios: [],
        riskAssessments: [],
        originalContent: {
          analysis: null,
          scenarios: [],
          riskAssessments: []
        }
      };
      saveStateToStorage(state);
    },
    setParties: (state, action: PayloadAction<Array<{name: string; description: string; isPrimary: boolean}>>) => {
      if (state.currentCase) {
        state.currentCase.suggestedParties = action.payload.map((party, index) => ({
          id: `party-${index + 1}`,
          name: party.name,
          description: party.description,
          isPrimary: party.isPrimary,
          isUserSide: index === 0,
          idealOutcomes: [],
        } as Party));
        saveStateToStorage(state);
      }
    },
    setAnalysis: (state, action: PayloadAction<Analysis>) => {
      if (state.currentCase) {
        state.currentCase.analysis = action.payload;
        
        // Store the original analysis for diff comparison
        if (!state.currentCase.originalContent.analysis) {
          state.currentCase.originalContent.analysis = JSON.parse(JSON.stringify(action.payload));
        }
        
        saveStateToStorage(state);
      }
    },
    updateIoA: (state, action: PayloadAction<string>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.ioa = action.payload;
        saveStateToStorage(state);
      }
    },
    updateIceberg: (state, action: PayloadAction<string>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.iceberg = action.payload;
        saveStateToStorage(state);
      }
    },
    updateComponents: (state, action: PayloadAction<Component[]>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.components = action.payload;
        saveStateToStorage(state);
      }
    },
    updateComponent: (state, action: PayloadAction<Component>) => {
      if (state.currentCase?.analysis) {
        const index = state.currentCase.analysis.components.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.currentCase.analysis.components[index] = action.payload;
          saveStateToStorage(state);
        }
      }
    },
    setScenarios: (state, action: PayloadAction<Scenario[]>) => {
      if (state.currentCase) {
        // If the payload is empty, clear all scenarios
        if (action.payload.length === 0) {
          state.currentCase.scenarios = [];
          state.selectedScenario = null;
          saveStateToStorage(state);
          return;
        }
        
        // Filter out existing scenarios for the same component
        const componentId = action.payload[0]?.componentId;
        const existingScenarios = state.currentCase.scenarios.filter(
          (s) => s.componentId !== componentId
        );
        
        // Add new scenarios
        const newScenarios = [...existingScenarios, ...action.payload];
        state.currentCase.scenarios = newScenarios;
        
        // Store the original scenarios for diff comparison
        const originalScenarios = state.currentCase.originalContent.scenarios;
        const hasComponentScenarios = originalScenarios.some(s => s.componentId === componentId);
        
        if (!hasComponentScenarios) {
          state.currentCase.originalContent.scenarios = [
            ...originalScenarios,
            ...action.payload.map(s => JSON.parse(JSON.stringify(s)))
          ];
        }
        
        saveStateToStorage(state);
      }
    },
    setCaseProcessed: (state, action: PayloadAction<{processed: boolean, suggestedParties: Array<{name: string, description: string, isPrimary: boolean}>}>) => {
      if (state.currentCase) {
        state.currentCase.processed = action.payload.processed;
        state.currentCase.suggestedParties = action.payload.suggestedParties.map((party, index) => ({
          id: `party-${index + 1}`,
          name: party.name,
          description: party.description,
          isPrimary: party.isPrimary,
          isUserSide: index === 0,
          idealOutcomes: [],
        }));
        saveStateToStorage(state);
      }
    },
    selectScenario: (state, action: PayloadAction<Scenario | null>) => {
      state.selectedScenario = action.payload;
      saveStateToStorage(state);
    },
    setRiskAssessments: (state, action: PayloadAction<RiskAssessment[]>) => {
      if (state.currentCase) {
        state.currentCase.riskAssessments = action.payload;
        
        // Store the original risk assessments for diff comparison
        if (state.currentCase.originalContent.riskAssessments.length === 0) {
          state.currentCase.originalContent.riskAssessments = JSON.parse(JSON.stringify(action.payload));
        }
        
        saveStateToStorage(state);
      }
    },
    addRiskAssessment: (state, action: PayloadAction<RiskAssessment>) => {
      if (state.currentCase) {
        // Remove any existing assessment with the same ID
        state.currentCase.riskAssessments = state.currentCase.riskAssessments.filter(
          (ra) => ra.id !== action.payload.id
        );
        
        // Add the new assessment
        state.currentCase.riskAssessments.push(action.payload);
        saveStateToStorage(state);
      }
    },
    updateRiskAssessment: (state, action: PayloadAction<RiskAssessment>) => {
      if (state.currentCase) {
        const index = state.currentCase.riskAssessments.findIndex(
          (ra) => ra.id === action.payload.id
        );
        if (index !== -1) {
          state.currentCase.riskAssessments[index] = action.payload;
          saveStateToStorage(state);
        }
      }
    },
    deleteRiskAssessment: (state, action: PayloadAction<string>) => {
      if (state.currentCase) {
        state.currentCase.riskAssessments = state.currentCase.riskAssessments.filter(
          (ra) => ra.id !== action.payload
        );
        saveStateToStorage(state);
      }
    },
    clearState: (state) => {
      localStorage.removeItem(STORAGE_KEY_CURRENT_CASE);
      state.currentCase = null;
      state.loading = false;
      state.error = null;
      state.selectedScenario = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setCase,
  setParties,
  setAnalysis,
  updateIoA,
  updateIceberg,
  updateComponents,
  updateComponent,
  setScenarios,
  setCaseProcessed,
  selectScenario,
  setRiskAssessments,
  addRiskAssessment,
  updateRiskAssessment,
  deleteRiskAssessment,
  clearState,
} = negotiationSlice.actions;

export default negotiationSlice.reducer; 