import { Analysis } from '../store/negotiationSlice';

export type ApiResponse<T> = T | { rateLimited: true };

export interface AnalysisResponse extends Analysis {
  id: string;
  ioa: string;
  iceberg: string;
  components: Array<{
    id: string;
    name: string;
    description: string;
    redlineParty1: string;
    bottomlineParty1: string;
    redlineParty2: string;
    bottomlineParty2: string;
    priority: number;
  }>;
  createdAt: string;
  updatedAt: string;
} 