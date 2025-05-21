import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define localStorage keys
const STORAGE_KEY_CURRENT_CASE = 'a2b_current_case';

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
  return emptyInitialState;
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

// Now we initialize with the loaded state
const initialState: NegotiationState = loadStateFromStorage();

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
  clearState,
} = negotiationSlice.actions;

export default negotiationSlice.reducer; 