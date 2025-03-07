import { configureStore } from '@reduxjs/toolkit';
import negotiationReducer from './negotiationSlice';

export const store = configureStore({
  reducer: {
    negotiation: negotiationReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 