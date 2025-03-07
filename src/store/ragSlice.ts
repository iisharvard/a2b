import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { RAGService } from '../services/rag';

const ragService = new RAGService();

export const indexCaseFile = createAsyncThunk(
  'rag/indexCaseFile',
  async ({ caseId, content }: { caseId: string; content: string }) => {
    return await ragService.indexCaseFile(caseId, content);
  }
);

export const searchCaseFile = createAsyncThunk(
  'rag/searchCaseFile',
  async ({ caseId, query }: { caseId: string; query: string }) => {
    return await ragService.searchCaseFile(caseId, query);
  }
);

export const deleteCaseIndex = createAsyncThunk(
  'rag/deleteCaseIndex',
  async (caseId: string) => {
    return await ragService.deleteCaseIndex(caseId);
  }
);

interface RAGState {
  indexing: boolean;
  searching: boolean;
  searchResults: any[];
  indexingStatus: {
    success: boolean;
    chunksCount: number;
  } | null;
  error: string | null;
}

const initialState: RAGState = {
  indexing: false,
  searching: false,
  searchResults: [],
  indexingStatus: null,
  error: null
};

const ragSlice = createSlice({
  name: 'rag',
  initialState,
  reducers: {
    clearSearchResults: (state) => {
      state.searchResults = [];
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(indexCaseFile.pending, (state) => {
        state.indexing = true;
        state.error = null;
      })
      .addCase(indexCaseFile.fulfilled, (state, action) => {
        state.indexing = false;
        state.indexingStatus = action.payload;
      })
      .addCase(indexCaseFile.rejected, (state, action) => {
        state.indexing = false;
        state.error = action.error.message || 'Failed to index case file';
      })
      .addCase(searchCaseFile.pending, (state) => {
        state.searching = true;
        state.error = null;
      })
      .addCase(searchCaseFile.fulfilled, (state, action) => {
        state.searching = false;
        state.searchResults = action.payload;
      })
      .addCase(searchCaseFile.rejected, (state, action) => {
        state.searching = false;
        state.error = action.error.message || 'Failed to search case file';
      })
      .addCase(deleteCaseIndex.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete case index';
      });
  }
});

export const { clearSearchResults, clearError } = ragSlice.actions;
export default ragSlice.reducer; 