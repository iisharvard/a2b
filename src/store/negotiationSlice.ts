import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getCurrentCase, saveCurrentCase, clearCurrentCase as clearStoredCase } from '../utils/storage';

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
  recalculationStatus: {
    analysisRecalculated: boolean;
    scenariosRecalculated: boolean;
  };
  originalContent: {
    analysis: Analysis | null;
    scenarios: Scenario[];
  };
}

export interface NegotiationState {
  currentCase: Case | null;
  selectedScenario: Scenario | null;
  loading: boolean;
  error: string | null;
}

// Define the empty initial state first
const emptyInitialState: NegotiationState = {
  currentCase: null,
  selectedScenario: null,
  loading: false,
  error: null
};

const loadInitialState = (): NegotiationState => {
  const storedCase = getCurrentCase<Case>();

  if (storedCase) {
    return {
      currentCase: storedCase,
      loading: false,
      error: null,
      selectedScenario: null,
    };
  }

  return { ...emptyInitialState };
};

const persistCurrentCase = (state: NegotiationState) => {
  if (state.currentCase) {
    saveCurrentCase(state.currentCase);
  }
};

const initialState: NegotiationState = loadInitialState();

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
        recalculationStatus: {
          analysisRecalculated: false,
          scenariosRecalculated: false,
        },
        originalContent: {
          analysis: null,
          scenarios: [],
        }
      };
      persistCurrentCase(state);
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
        persistCurrentCase(state);
      }
    },
    setAnalysis: (state, action: PayloadAction<Analysis>) => {
      if (state.currentCase) {
        state.currentCase.analysis = action.payload;
        
        // Store the original analysis for diff comparison
        if (!state.currentCase.originalContent.analysis) {
          state.currentCase.originalContent.analysis = JSON.parse(JSON.stringify(action.payload));
        }
        
        persistCurrentCase(state);
      }
    },
    updateIoA: (state, action: PayloadAction<string>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.ioa = action.payload;
        persistCurrentCase(state);
      }
    },
    updateIceberg: (state, action: PayloadAction<string>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.iceberg = action.payload;
        persistCurrentCase(state);
      }
    },
    updateComponents: (state, action: PayloadAction<Component[]>) => {
      if (state.currentCase?.analysis) {
        state.currentCase.analysis.components = action.payload;
        persistCurrentCase(state);
      }
    },
    updateComponent: (state, action: PayloadAction<Component>) => {
      if (state.currentCase?.analysis) {
        const index = state.currentCase.analysis.components.findIndex(
          (c) => c.id === action.payload.id
        );
        if (index !== -1) {
          state.currentCase.analysis.components[index] = action.payload;
          persistCurrentCase(state);
        }
      }
    },
    setScenarios: (state, action: PayloadAction<Scenario[]>) => {
      if (state.currentCase) {
        // If the payload is empty, clear all scenarios
        if (action.payload.length === 0) {
          state.currentCase.scenarios = [];
          state.selectedScenario = null;
          persistCurrentCase(state);
          return;
        }
        
        // Filter out existing scenarios for the same component
        const componentId = action.payload[0]?.componentId;
        const existingScenarios = state.currentCase.scenarios.filter(
          (s) => s.componentId !== componentId
        );
        
        // Ensure the new scenarios have unique IDs from 1-5
        const dedupedScenarios = action.payload.slice(0, 5).map((scenario, index) => ({
          ...scenario,
          id: `${componentId}-${index + 1}`
        }));
        
        // Add new scenarios
        const newScenarios = [...existingScenarios, ...dedupedScenarios];
        state.currentCase.scenarios = newScenarios;
        
        // If this was the selected scenario's component, reset selection
        // to avoid issues with potentially deleted scenarios
        if (state.selectedScenario && state.selectedScenario.componentId === componentId) {
          // Try to find a scenario with the same id in the new set
          const found = dedupedScenarios.find(s => s.id === state.selectedScenario?.id);
          if (!found) {
            state.selectedScenario = null;
          }
        }
        
        // Store the original scenarios for diff comparison
        const originalScenarios = state.currentCase.originalContent.scenarios;
        const hasComponentScenarios = originalScenarios.some(s => s.componentId === componentId);
        
        if (!hasComponentScenarios) {
          state.currentCase.originalContent.scenarios = [
            ...originalScenarios,
            ...dedupedScenarios.map(s => JSON.parse(JSON.stringify(s)))
          ];
        }
        
        persistCurrentCase(state);
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
        persistCurrentCase(state);
      }
    },
    selectScenario: (state, action: PayloadAction<Scenario | null>) => {
      state.selectedScenario = action.payload;
      persistCurrentCase(state);
    },
    clearState: (state) => {
      clearStoredCase();
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
  clearState,
} = negotiationSlice.actions;

export default negotiationSlice.reducer; 
