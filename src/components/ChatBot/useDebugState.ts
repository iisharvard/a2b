import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { StateSnapshot, DebugState, ChangeRecord } from './types';

export const useDebugState = () => {
  const [state, setState] = useState<DebugState>({
    isDebugWindowOpen: false,
    prevSnapshot: null,
    changeHistory: [],
    showFullState: false,
    lastDiffResult: null,
  });

  // Monitor Redux state changes
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);
  const recalculationStatus = useSelector((state: RootState) => state.recalculation);

  const createSnapshot = (): StateSnapshot => {
    return {
      caseFile: currentCase,
      ioa: currentCase?.analysis?.ioa || null,
      iceberg: currentCase?.analysis?.iceberg || null,
      issues: currentCase?.analysis?.components || null,
      boundaries: currentCase?.analysis?.components.map(c => ({
        id: c.id,
        name: c.name,
        description: c.description,
        redlineParty1: c.redlineParty1,
        bottomlineParty1: c.bottomlineParty1,
        redlineParty2: c.redlineParty2,
        bottomlineParty2: c.bottomlineParty2,
        severity: c.priority || 0
      })) || null,
      scenarios: currentCase?.scenarios || null,
      timestamp: Date.now()
    };
  };

  const generateChangeSummary = (oldSnapshot: StateSnapshot, newSnapshot: StateSnapshot): string | null => {
    const changes: string[] = [];
    
    if (Math.abs(newSnapshot.timestamp - oldSnapshot.timestamp) < 100) {
      return null;
    }
    
    const compareItems = (key: keyof StateSnapshot, label: string) => {
      const oldValue = oldSnapshot[key];
      const newValue = newSnapshot[key];
      
      // Special handling for scenarios
      if (key === 'scenarios') {
        if (!oldValue && Array.isArray(newValue)) {
          // Only report if the new array has items
          if (newValue.length > 0) {
            changes.push(`- ${label} was updated`);
          }
          return;
        }
      }
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push(`- ${label} was updated`);
      }
    };

    compareItems('caseFile', 'Case file');
    compareItems('ioa', 'Islands of Agreement');
    compareItems('iceberg', 'Iceberg Analysis');
    compareItems('issues', 'Issues');
    compareItems('boundaries', 'Boundaries');
    compareItems('scenarios', 'Scenarios');
    
    return changes.length > 0 ? changes.join("\n") : null;
  };

  const generateDetailedDiff = (oldSnapshot: StateSnapshot, newSnapshot: StateSnapshot): string => {
    const details: string[] = [];
    
    details.push(`Timestamp: ${new Date(newSnapshot.timestamp).toLocaleTimeString()}`);
    details.push(`Elapsed: ${((newSnapshot.timestamp - oldSnapshot.timestamp) / 1000).toFixed(1)}s`);
    
    const compareItem = (key: keyof StateSnapshot, label: string) => {
      const oldValue = oldSnapshot[key];
      const newValue = newSnapshot[key];
      
      // Special handling for scenarios
      if (key === 'scenarios') {
        if (!oldValue && Array.isArray(newValue)) {
          // Only report if the new array has items
          if (newValue.length > 0) {
            details.push(`+ ${label} was added`);
          }
          return;
        }
      }
      
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        if (!oldValue && newValue) details.push(`+ ${label} was added`);
        else if (oldValue && !newValue) details.push(`- ${label} was removed`);
        else details.push(`~ ${label} was changed`);
      }
    };

    compareItem('caseFile', 'Case file');
    compareItem('ioa', 'Islands of Agreement');
    compareItem('iceberg', 'Iceberg Analysis');
    compareItem('issues', 'Issues');
    compareItem('boundaries', 'Boundaries');
    compareItem('scenarios', 'Scenarios');
    
    return details.join("\n");
  };

  const processSnapshotUpdate = useCallback((
    oldSnapshot: StateSnapshot, 
    newSnapshot: StateSnapshot,
    forceUpdate: boolean = false
  ): boolean => {
    const hasChanges = JSON.stringify(oldSnapshot) !== JSON.stringify(newSnapshot);
    
    if (hasChanges || forceUpdate) {
      const summary = generateChangeSummary(oldSnapshot, newSnapshot);
      const details = generateDetailedDiff(oldSnapshot, newSnapshot);
      
      const changeRecord: ChangeRecord = {
        timestamp: Date.now(),
        summary: summary || 'State update',
        details: details || 'No detailed changes'
      };
      
      setState(prev => ({
        ...prev,
        changeHistory: [...prev.changeHistory, changeRecord],
        prevSnapshot: newSnapshot,
        lastDiffResult: { summary, details }
      }));
      
      return true;
    }
    
    return false;
  }, []);

  // Monitor Redux state changes
  useEffect(() => {
    if (currentCase) {
      const latestSnapshot = createSnapshot();
      if (state.prevSnapshot) {
        processSnapshotUpdate(state.prevSnapshot, latestSnapshot);
      } else {
        setState(prev => ({ ...prev, prevSnapshot: latestSnapshot }));
      }
    }
  }, [currentCase, recalculationStatus, processSnapshotUpdate]);

  const refreshState = useCallback(() => {
    const latestSnapshot = createSnapshot();
    if (state.prevSnapshot) {
      processSnapshotUpdate(state.prevSnapshot, latestSnapshot, true);
    } else {
      setState(prev => ({ ...prev, prevSnapshot: latestSnapshot }));
    }
    setState(prev => ({ ...prev, showFullState: true }));
  }, [state.prevSnapshot, processSnapshotUpdate]);

  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, changeHistory: [] }));
  }, []);

  const toggleDebugWindow = useCallback(() => {
    setState(prev => {
      const newState = { ...prev, isDebugWindowOpen: !prev.isDebugWindowOpen };
      if (newState.isDebugWindowOpen && !prev.prevSnapshot) {
        const initialSnapshot = createSnapshot();
        newState.prevSnapshot = initialSnapshot;
      }
      return newState;
    });
  }, []);

  const toggleFullState = useCallback(() => {
    setState(prev => ({ ...prev, showFullState: !prev.showFullState }));
  }, []);

  return {
    state,
    refreshState,
    clearHistory,
    toggleDebugWindow,
    toggleFullState,
    createSnapshot,
    processSnapshotUpdate
  };
}; 