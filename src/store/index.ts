import { configureStore } from '@reduxjs/toolkit';
import negotiationReducer from './negotiationSlice';
import ragReducer from './ragSlice';

export const store = configureStore({
  reducer: {
    negotiation: negotiationReducer,
    rag: ragReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 