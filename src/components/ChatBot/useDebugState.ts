import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { StateSnapshot, DebugState, ChangeRecord } from './types';
import { api } from '../../services/api';

// Helper function to get a preview of text changes
const getTextChangeSummary = (oldText: string | null, newText: string | null, key: string): string => {
  if (!oldText && newText) {
    return `Added (preview): "${newText.slice(0, 100)}${newText.length > 100 ? '...' : ''}"
Full content saved in ${key} state (${newText.length} characters)`;
  }
  if (oldText && !newText) {
    return 'Content removed';
  }
  if (oldText && newText) {
    return `Updated (preview): "${newText.slice(0, 100)}${newText.length > 100 ? '...' : ''}"
Full content saved in ${key} state (${newText.length} characters)`;
  }
  return '';
};

// Helper to create a hash of content for comparison
const hashContent = (content: string | null | undefined): string => {
  if (!content) return '';
  const blocks = content.split(/\[Content from:/);
  const firstBlock = blocks.slice(0, 2).join('[Content from:');
  return `${firstBlock.slice(0, 100)}:${content.length}`;
};

// Helper to check if content is an append
const isAppend = (oldContent: string | null, newContent: string | null): boolean => {
  if (!oldContent || !newContent) return false;
  return newContent.startsWith(oldContent);
};

// Helper to create a basic snapshot
const createEmptySnapshot = (): StateSnapshot => ({
  caseFile: null,
  ioa: null,
  iceberg: null,
  issues: null,
  boundaries: null,
  scenarios: null,
  timestamp: Date.now()
});

export const useDebugState = () => {
  // Initialize state with empty snapshot
  const [state, setState] = useState<DebugState>(() => ({
    isDebugWindowOpen: false,
    prevSnapshot: createEmptySnapshot(),
    changeHistory: [],
    showFullState: false,
    lastDiffResult: null,
  }));

  // Refs for tracking state
  const lastProcessedHash = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountCountRef = useRef(0);
  const lastCaseRef = useRef<any>(null);

  // Redux selectors
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);

  // Create snapshot of current state
  const createSnapshot = useCallback((): StateSnapshot => {
    console.log('📸 Creating snapshot...');
    console.log('Current case:', currentCase?.id);
    console.log('Last processed case:', lastCaseRef.current?.id);
    
    if (currentCase?.content) {
      const contentBlocks = currentCase.content.split(/\[Content from:/);
      console.log('Content analysis:', {
        totalLength: currentCase.content.length,
        blockCount: contentBlocks.length - 1,
        blocks: contentBlocks.slice(1).map((block, i) => ({
          index: i + 1,
          length: block.length,
          preview: block.slice(0, 50)
        }))
      });
    }
    
    const snapshot: StateSnapshot = {
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

    console.log('Snapshot created:', {
      hasCase: !!snapshot.caseFile,
      caseContent: snapshot.caseFile?.content?.length || 0,
      hasIOA: !!snapshot.ioa,
      hasIceberg: !!snapshot.iceberg,
      issueCount: snapshot.issues?.length || 0
    });
    
    return snapshot;
  }, [currentCase]);

  // Compare items and generate change summary
  const compareItems = useCallback(async (
    oldSnapshot: StateSnapshot,
    newSnapshot: StateSnapshot,
    key: keyof StateSnapshot,
    changes: string[]
  ) => {
    const oldValue = oldSnapshot[key];
    const newValue = newSnapshot[key];
    
    console.log(`Comparing ${key}:`, {
      hasOld: !!oldValue,
      hasNew: !!newValue,
      oldLength: typeof oldValue === 'string' ? oldValue.length : Array.isArray(oldValue) ? oldValue.length : 0,
      newLength: typeof newValue === 'string' ? newValue.length : Array.isArray(newValue) ? newValue.length : 0
    });

    // Special handling for case file content
    if (key === 'caseFile') {
      const oldContent = oldValue?.content;
      const newContent = newValue?.content;
      
      if (oldContent === newContent) return;
      if (newContent === lastProcessedHash.current) return;
      
      // Handle appended content
      if (isAppend(oldContent, newContent)) {
        changes.push(`- Case file content was appended (${newContent!.length - (oldContent?.length || 0)} characters added)`);
        return;
      }

      // Get qualitative summary for content changes
      if (oldContent !== newContent) {
        try {
          lastProcessedHash.current = newContent;
          const summary = await api.summarizeCaseChanges(oldContent || '', newContent || '');
          changes.push(`- Case file changes: ${summary}`);
        } catch (err) {
          console.error('❌ Error getting case changes summary:', err);
          changes.push(`- Case file was ${!oldContent ? 'added' : !newContent ? 'removed' : 'modified'}`);
        }
      }
      return;
    }

    // Handle other state changes
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      const changeType = !oldValue ? 'added' : !newValue ? 'removed' : 'updated';
      changes.push(`- ${key} was ${changeType}`);
    }
  }, []);

  // Process snapshot updates
  const processSnapshotUpdate = useCallback(async (oldSnapshot: StateSnapshot, newSnapshot: StateSnapshot) => {
    console.log('🔄 Generating change summary...');
    
    const changes: string[] = [];
    await Promise.all([
      compareItems(oldSnapshot, newSnapshot, 'caseFile', changes),
      compareItems(oldSnapshot, newSnapshot, 'ioa', changes),
      compareItems(oldSnapshot, newSnapshot, 'iceberg', changes),
      compareItems(oldSnapshot, newSnapshot, 'issues', changes),
      compareItems(oldSnapshot, newSnapshot, 'boundaries', changes),
      compareItems(oldSnapshot, newSnapshot, 'scenarios', changes)
    ]);

    if (changes.length > 0) {
      setState(prev => ({
        ...prev,
        prevSnapshot: newSnapshot,
        changeHistory: [...prev.changeHistory, {
          timestamp: Date.now(),
          changes
        }]
      }));
    }
  }, [compareItems]);

  // Monitor state changes
  useEffect(() => {
    mountCountRef.current++;
    console.log('🔄 Effect triggered:', {
      mountCount: mountCountRef.current,
      hasPrevSnapshot: !!state.prevSnapshot,
      currentCaseId: currentCase?.id,
      lastCaseId: lastCaseRef.current?.id,
      hasTimeout: !!updateTimeoutRef.current
    });

    // Skip if no case
    if (!currentCase) return;

    // Check for content changes
    if (currentCase.id === lastCaseRef.current?.id) {
      console.log('⚠️ Same case ID, checking for content changes...');
      const currentHash = hashContent(currentCase.content);
      const lastHash = hashContent(lastCaseRef.current.content);
      
      console.log('Content comparison:', {
        currentHash: currentHash.slice(0, 50) + '...',
        lastHash: lastHash.slice(0, 50) + '...',
        match: currentHash === lastHash
      });
      
      if (currentHash === lastHash) {
        console.log('📝 Content unchanged, skipping update');
        return;
      }
    }

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      console.log('⏱️ Clearing existing timeout');
      clearTimeout(updateTimeoutRef.current);
    }

    // Set new timeout for debounced update
    console.log('⏱️ Setting new timeout for state update');
    updateTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Timeout fired, processing state update');
      const latestSnapshot = createSnapshot();
      
      // Skip if already processed
      const newHash = hashContent(latestSnapshot.caseFile?.content);
      if (newHash === lastProcessedHash.current) {
        console.log('🔄 Skipping duplicate content processing');
        return;
      }
      
      lastProcessedHash.current = newHash;
      lastCaseRef.current = currentCase;
      
      if (state.prevSnapshot) {
        processSnapshotUpdate(state.prevSnapshot, latestSnapshot);
      } else {
        setState(prev => ({ ...prev, prevSnapshot: latestSnapshot }));
      }
    }, 500);

    return () => {
      if (updateTimeoutRef.current) {
        console.log('🧹 Cleaning up timeout on unmount/update');
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [currentCase, state.prevSnapshot, createSnapshot, processSnapshotUpdate]);

  // Public interface
  return {
    isDebugWindowOpen: state.isDebugWindowOpen,
    changeHistory: state.changeHistory,
    showFullState: state.showFullState,
    lastDiffResult: state.lastDiffResult,
    toggleDebugWindow: () => setState(prev => ({ ...prev, isDebugWindowOpen: !prev.isDebugWindowOpen })),
    toggleFullState: () => setState(prev => ({ ...prev, showFullState: !prev.showFullState })),
    clearHistory: () => setState(prev => ({ ...prev, changeHistory: [] })),
    createSnapshot
  };
}; 