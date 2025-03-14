// This file is needed to make TypeScript recognize Jest globals
// It will be replaced when @types/jest is installed

declare namespace jest {
  function fn(): any;
  function mock(moduleName: string): any;
  function clearAllMocks(): void;
  function useFakeTimers(): void;
  function useRealTimers(): void;
  function runAllTimers(): void;
}

declare const expect: any;
declare const describe: (name: string, fn: () => void) => void;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;
declare const beforeAll: (fn: () => void) => void;
declare const afterAll: (fn: () => void) => void;
declare const test: (name: string, fn: () => void, timeout?: number) => void;
declare const it: typeof test;

declare interface Global {
  fetch: any;
}

declare const global: Global; 