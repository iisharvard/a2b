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
  idealOutcomes: string[];
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
  version: number;
}

export interface Case {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  party1: Party;
  party2: Party;
  analysis: Analysis | null;
  scenarios: Scenario[];
  riskAssessments: RiskAssessment[];
  processed: boolean;
  suggestedParties: Array<{name: string, description: string, isPrimary: boolean}>;
  // Track recalculation status
  recalculationStatus: {
    analysisRecalculated: boolean;
    scenariosRecalculated: boolean;
    riskAssessmentsRecalculated: boolean;
    lastRecalculationTimestamp: string | null;
  };
}

interface NegotiationState {
  currentCase: Case | null;
  loading: boolean;
  error: string | null;
  selectedScenario: Scenario | null;
}

const initialState: NegotiationState = {
  currentCase: null,
  loading: false,
  error: null,
  selectedScenario: null,
};

export const negotiationSlice = createSlice({
  name: 'negotiation',
  initialState: loadStateFromStorage(),
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setCaseContent: (state, action: PayloadAction<{ content: string; title?: string }>) => {
      if (!state.currentCase) {
        state.currentCase = {
          id: Date.now().toString(),
          title: action.payload.title || 'Untitled Case',
          content: action.payload.content,
          createdAt: new Date().toISOString(),
          party1: {
            id: '1',
            name: '',
            description: '',
            isUserSide: true,
            idealOutcomes: [],
          },
          party2: {
            id: '2',
            name: '',
            description: '',
            isUserSide: false,
            idealOutcomes: [],
          },
          analysis: null,
          scenarios: [],
          riskAssessments: [],
          processed: false,
          suggestedParties: [],
          recalculationStatus: {
            analysisRecalculated: false,
            scenariosRecalculated: false,
            riskAssessmentsRecalculated: false,
            lastRecalculationTimestamp: null,
          },
        };
      } else {
        state.currentCase.content = action.payload.content;
        if (action.payload.title) {
          state.currentCase.title = action.payload.title;
        }
        state.currentCase.processed = false;
        state.currentCase.suggestedParties = [];
      }
      saveStateToStorage(state);
    },
    setParties: (state, action: PayloadAction<{ party1: Party; party2: Party }>) => {
      if (state.currentCase) {
        state.currentCase.party1 = action.payload.party1;
        state.currentCase.party2 = action.payload.party2;
        saveStateToStorage(state);
      }
    },
    setAnalysis: (state, action: PayloadAction<Analysis>) => {
      if (state.currentCase) {
        state.currentCase.analysis = action.payload;
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
        state.currentCase.scenarios = [...existingScenarios, ...action.payload];
        saveStateToStorage(state);
      }
    },
    setCaseProcessed: (state, action: PayloadAction<{processed: boolean, suggestedParties: Array<{name: string, description: string, isPrimary: boolean}>}>) => {
      if (state.currentCase) {
        state.currentCase.processed = action.payload.processed;
        state.currentCase.suggestedParties = action.payload.suggestedParties;
        saveStateToStorage(state);
      }
    },
    selectScenario: (state, action: PayloadAction<Scenario>) => {
      state.selectedScenario = action.payload;
      saveStateToStorage(state);
    },
    setRiskAssessments: (state, action: PayloadAction<RiskAssessment[]>) => {
      if (state.currentCase) {
        state.currentCase.riskAssessments = action.payload;
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
      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY_CURRENT_CASE);
      
      // Reset state
      state.currentCase = null;
      state.loading = false;
      state.error = null;
      state.selectedScenario = null;
    },
    setAnalysisRecalculated: (state, action: PayloadAction<boolean>) => {
      if (state.currentCase) {
        state.currentCase.recalculationStatus.analysisRecalculated = action.payload;
        if (action.payload) {
          // If analysis is recalculated, mark scenarios and risk assessments as needing recalculation
          state.currentCase.recalculationStatus.scenariosRecalculated = false;
          state.currentCase.recalculationStatus.riskAssessmentsRecalculated = false;
          state.currentCase.recalculationStatus.lastRecalculationTimestamp = new Date().toISOString();
        }
        saveStateToStorage(state);
      }
    },
    setScenariosRecalculated: (state, action: PayloadAction<boolean>) => {
      if (state.currentCase) {
        state.currentCase.recalculationStatus.scenariosRecalculated = action.payload;
        if (action.payload) {
          // If scenarios are recalculated, mark risk assessments as needing recalculation
          state.currentCase.recalculationStatus.riskAssessmentsRecalculated = false;
          state.currentCase.recalculationStatus.lastRecalculationTimestamp = new Date().toISOString();
        }
        saveStateToStorage(state);
      }
    },
    setRiskAssessmentsRecalculated: (state, action: PayloadAction<boolean>) => {
      if (state.currentCase) {
        state.currentCase.recalculationStatus.riskAssessmentsRecalculated = action.payload;
        if (action.payload) {
          state.currentCase.recalculationStatus.lastRecalculationTimestamp = new Date().toISOString();
        }
        saveStateToStorage(state);
      }
    },
    resetRecalculationStatus: (state) => {
      if (state.currentCase) {
        state.currentCase.recalculationStatus = {
          analysisRecalculated: true,
          scenariosRecalculated: true,
          riskAssessmentsRecalculated: true,
          lastRecalculationTimestamp: new Date().toISOString(),
        };
        saveStateToStorage(state);
      }
    },
  },
});

export const {
  setLoading,
  setError,
  setCaseContent,
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
  setAnalysisRecalculated,
  setScenariosRecalculated,
  setRiskAssessmentsRecalculated,
  resetRecalculationStatus,
} = negotiationSlice.actions;

export default negotiationSlice.reducer; 