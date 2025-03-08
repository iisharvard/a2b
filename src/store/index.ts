import { configureStore } from '@reduxjs/toolkit';
import negotiationReducer from './negotiationSlice';
import recalculationReducer from './recalculationSlice';

export const store = configureStore({
  reducer: {
    negotiation: negotiationReducer,
    recalculation: recalculationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 