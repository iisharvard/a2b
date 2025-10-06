import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ContextKey } from '../types/chat';

export interface ChatState {
  selectedContext: ContextKey[];
  autoAddedContext: ContextKey[];
}

const initialState: ChatState = {
  selectedContext: [],
  autoAddedContext: [],
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setSelectedContext(state, action: PayloadAction<ContextKey[]>) {
      state.selectedContext = action.payload;
    },
    addSelectedContext(state, action: PayloadAction<ContextKey>) {
      if (!state.selectedContext.includes(action.payload)) {
        state.selectedContext.push(action.payload);
      }
    },
    removeSelectedContext(state, action: PayloadAction<ContextKey>) {
      state.selectedContext = state.selectedContext.filter(key => key !== action.payload);
    },
    markContextAutoAdded(state, action: PayloadAction<ContextKey>) {
      if (!state.autoAddedContext.includes(action.payload)) {
        state.autoAddedContext.push(action.payload);
        if (!state.selectedContext.includes(action.payload)) {
          state.selectedContext.push(action.payload);
        }
      }
    },
    resetChatState() {
      return initialState;
    }
  },
});

export const {
  setSelectedContext,
  addSelectedContext,
  removeSelectedContext,
  markContextAutoAdded,
  resetChatState
} = chatSlice.actions;

export default chatSlice.reducer;
