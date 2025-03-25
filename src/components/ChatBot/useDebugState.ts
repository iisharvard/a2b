import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { StateSnapshot, DebugState, ChangeRecord } from './types';
import { api } from '../../services/api';
import { diffLines, Change } from 'diff';

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
  
  // Check the total length first
  const totalLength = content.length;
  
  // Get first and last parts of content for more robust comparison
  const firstPart = content.slice(0, 100);
  const lastPart = content.slice(-100);
  
  // Get structure indicators
  const blocks = content.split(/\[Content from:/);
  const blockCount = blocks.length - 1;
  
  // Create a more robust hash combining multiple aspects of the content
  return `${firstPart}:${lastPart}:${totalLength}:${blockCount}`;
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

// Helper to check if a change is meaningful
const isChangeSignificant = (oldContent: string | undefined | null, newContent: string | undefined | null): boolean => {
  if (!oldContent && newContent) return true; // New content added
  if (oldContent && !newContent) return true; // Content removed
  if (!oldContent || !newContent) return false;
  
  // Generate diff first to analyze changes
  const formattedDiff = formatDiffForLLM(oldContent, newContent);
  if (!formattedDiff) return false;
  
  // Check for substantial changes in length
  const lengthDiff = Math.abs(newContent.length - oldContent.length);
  const lengthChangePercent = (lengthDiff / oldContent.length) * 100;
  
  console.log('[DEBUG] Change significance check:', {
    lengthDiff,
    lengthChangePercent: lengthChangePercent.toFixed(2) + '%',
    hasFormatting: formattedDiff.includes('[ADDED]') || formattedDiff.includes('[REMOVED]')
  });
  
  // Consider significant if:
  // 1. More than 50 characters changed AND more than 1% of content
  // 2. OR more than 5% of content changed
  if (lengthDiff > 50 && lengthChangePercent > 1) return true;
  if (lengthChangePercent > 5) return true;
  
  // Check for important patterns in the diff
  const importantPatterns = [
    /\d{4}/,                    // Years
    /\$\d+/,                    // Money amounts
    /\d+%/,                     // Percentages
    /agreement|contract|terms/i, // Legal terms
    /deadline|due|by|until/i,   // Dates/deadlines
    /require|must|shall|will/i, // Obligations
    /approve|reject|accept/i,   // Decisions
    /party[- ][12]|both parties/i // Party references
  ];
  
  const hasImportantPattern = importantPatterns.some(pattern => pattern.test(formattedDiff));
  
  console.log('[DEBUG] Pattern check result:', {
    hasImportantPattern,
    diffLength: formattedDiff.length
  });
  
  return hasImportantPattern;
};

// Helper to check if IOA/Iceberg/Issues change is significant
const isComponentChangeSignificant = (oldValue: any, newValue: any): boolean => {
  if (!oldValue && newValue) return true; // New value added
  if (oldValue && !newValue) return true; // Value removed
  if (!oldValue || !newValue) return false;
  
  const oldStr = JSON.stringify(oldValue);
  const newStr = JSON.stringify(newValue);
  
  // Always significant if structure changed
  if (oldStr.length !== newStr.length) return true;
  
  // Check for minimal character differences
  const diffCount = [...oldStr].filter((char, i) => char !== newStr[i]).length;
  return diffCount > 10; // Significant if more than 10 characters changed
};

// Helper to format diff for LLM analysis
const formatDiffForLLM = (oldContent: string | undefined | null, newContent: string | undefined | null): string => {
  if (!oldContent || !newContent) return '';
  const changes: Change[] = diffLines(oldContent, newContent);
  let formattedDiff = '';
  
  changes.forEach((change: Change) => {
    if (change.added) {
      formattedDiff += `[ADDED]:\n${change.value}\n`;
    } else if (change.removed) {
      formattedDiff += `[REMOVED]:\n${change.value}\n`;
    }
  });
  
  return formattedDiff;
};

// Helper to parse markdown content into sections
const parseMarkdownSections = (content: string) => {
  const sections: Record<string, string[]> = {};
  let currentSection = '';
  let currentSubsection = '';
  
  content.split('\n').forEach(line => {
    // Handle main sections (##)
    if (line.startsWith('## ')) {
      currentSection = line.trim();
      currentSubsection = '';
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
    }
    // Handle subsections (###)
    else if (line.startsWith('### ')) {
      currentSubsection = line.trim();
      if (!sections[currentSection]) {
        sections[currentSection] = [];
      }
    }
    // Handle bullet points
    else if (line.trim().startsWith('- ')) {
      const sectionKey = currentSubsection || currentSection;
      if (sectionKey && sections[sectionKey]) {
        sections[sectionKey].push(line.trim());
      } else if (sectionKey) {
        sections[sectionKey] = [line.trim()];
      }
    }
  });
  return sections;
};

// Helper to compare markdown content
const compareMarkdownContent = (oldContent: string | null | undefined, newContent: string | null | undefined, changes: string[], prefix: string = '') => {
  if (!oldContent && !newContent) return;
  
  const oldSections = parseMarkdownSections(oldContent || '');
  const newSections = parseMarkdownSections(newContent || '');
  
  // Compare sections
  const allSections = new Set([...Object.keys(oldSections), ...Object.keys(newSections)]);
  
  allSections.forEach(section => {
    const oldBullets = oldSections[section] || [];
    const newBullets = newSections[section] || [];
    
    // Skip if section is empty in both
    if (oldBullets.length === 0 && newBullets.length === 0) return;
    
    // If there are differences in this section
    if (JSON.stringify(oldBullets) !== JSON.stringify(newBullets)) {
      changes.push(`${prefix}In ${section}:`);
      
      // Find removed bullets
      oldBullets.forEach(bullet => {
        if (!newBullets.includes(bullet)) {
          changes.push(`${prefix}  - ${bullet.substring(2)}`); // Remove "- " prefix
        }
      });
      
      // Find added bullets
      newBullets.forEach(bullet => {
        if (!oldBullets.includes(bullet)) {
          changes.push(`${prefix}  + ${bullet.substring(2)}`); // Remove "- " prefix
        }
      });
    }
  });
};

export const useDebugState = () => {
  // Redux selectors
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);
  
  // Refs for tracking state
  const lastProcessedHash = useRef<string | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountCountRef = useRef(0);
  const lastCaseRef = useRef<any>(null);
  const initializedRef = useRef(false);

  // Initialize state with actual snapshot
  const [state, setState] = useState<DebugState>(() => {
    initializedRef.current = true;
    return {
      isDebugWindowOpen: false,
      prevSnapshot: null,
      changeHistory: [],
      showFullState: false,
      lastDiffResult: null,
    };
  });

  // Create snapshot of current state
  const createSnapshot = useCallback((): StateSnapshot => {
    // Visual debug logs only when debug window is open
    if (initializedRef.current && state.isDebugWindowOpen && currentCase?.id) {
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
    }
    
    // Always log for debugging our issue, regardless of debug window state
    console.log('[DEBUG] Creating actual snapshot:', {
      hasCase: !!currentCase,
      caseId: currentCase?.id,
      hasIOA: !!currentCase?.analysis?.ioa,
      hasIceberg: !!currentCase?.analysis?.iceberg,
      issueCount: currentCase?.analysis?.components?.length || 0,
      scenarioCount: currentCase?.scenarios?.length || 0
    });
    
    // Always create the snapshot regardless of debug window state
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

    // Visual debug logs only when debug window is open
    if (initializedRef.current && state.isDebugWindowOpen && currentCase?.id) {
      console.log('Snapshot created:', {
        hasCase: !!snapshot.caseFile,
        caseContent: snapshot.caseFile?.content?.length || 0,
        hasIOA: !!snapshot.ioa,
        hasIceberg: !!snapshot.iceberg,
        issueCount: snapshot.issues?.length || 0
      });
    }
    
    return snapshot;
  }, [currentCase, state.isDebugWindowOpen]);

  // Compare items and generate change summary
  const compareItems = useCallback(async (
    oldSnapshot: StateSnapshot,
    newSnapshot: StateSnapshot,
    key: keyof StateSnapshot,
    changes: string[]
  ) => {
    const oldValue = oldSnapshot[key];
    const newValue = newSnapshot[key];
    
    // Always log comparison regardless of debug window state
    console.log(`[DEBUG] Comparing ${key}:`, {
      hasOld: !!oldValue,
      hasNew: !!newValue,
      oldLength: typeof oldValue === 'string' ? oldValue.length : Array.isArray(oldValue) ? oldValue.length : 0,
      newLength: typeof newValue === 'string' ? newValue.length : Array.isArray(newValue) ? newValue.length : 0,
      equal: JSON.stringify(oldValue) === JSON.stringify(newValue)
    });

    // Special handling for case file content
    if (key === 'caseFile') {
      const oldContent = oldValue?.content;
      const newContent = newValue?.content;
      
      // If we're loading a case for the first time (no old case, new case exists)
      if (!oldValue && newValue) {
        try {
          console.log('[DEBUG] Getting qualitative summary for initial case load');
          // Call LLM to get a summary of the initial content
          const summary = await api.summarizeCaseChanges('', newContent || '');
          changes.push(`- Case file loaded: ${newValue.id || 'unknown'}`);
          changes.push(`- Initial content summary: ${summary}`);
          changes.push(`- Content length: ${newContent?.length || 0} characters`);
        } catch (err) {
          console.error('❌ Error getting initial case summary:', err);
          changes.push(`- Case file loaded: ${newValue.id || 'unknown'}`);
          changes.push(`- Content length: ${newContent?.length || 0} characters`);
        }
        return;
      }
      
      if (oldContent === newContent) return;
      if (newContent === lastProcessedHash.current) return;
      
      // Handle appended content
      if (isAppend(oldContent, newContent)) {
        try {
          console.log('[DEBUG] Getting qualitative summary for appended content');
          const summary = await api.summarizeCaseChanges(oldContent || '', newContent || '');
          changes.push(`- Case file content was appended: ${summary}`);
          changes.push(`- ${newContent!.length - (oldContent?.length || 0)} characters added`);
        } catch (err) {
          console.error('❌ Error getting append summary:', err);
          changes.push(`- Case file content was appended (${newContent!.length - (oldContent?.length || 0)} characters added)`);
        }
        return;
      }

      // Get qualitative summary for content changes
      if (oldContent !== newContent) {
        try {
          lastProcessedHash.current = newContent;
          console.log('[DEBUG] Getting qualitative summary for content changes');
          const summary = await api.summarizeCaseChanges(oldContent || '', newContent || '');
          changes.push(`- Case file changes: ${summary}`);
        } catch (err) {
          console.error('❌ Error getting case changes summary:', err);
          changes.push(`- Case file was ${!oldContent ? 'added' : !newContent ? 'removed' : 'modified'}`);
        }
      }
      return;
    }

    // Handle other state changes verbatim - detect initial loads, removals, and updates
    if (!oldValue && newValue) {
      // For initial loads, show what was added
      if (key === 'ioa') {
        changes.push(`IOA added:`);
        compareMarkdownContent('', newValue as string, changes, '  ');
      } else if (key === 'iceberg') {
        changes.push(`Iceberg diagram added:`);
        compareMarkdownContent('', newValue as string, changes, '  ');
      } else if (key === 'issues') {
        changes.push(`${(newValue as any[]).length} issues added`);
      } else if (key === 'scenarios') {
        changes.push(`${(newValue as any[]).length} scenarios added`);
      } else {
        changes.push(`${key} added`);
      }
    } else if (oldValue && !newValue) {
      // For removals, simply state what was removed
      changes.push(`${key} removed`);
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      // For updates, provide more details about what changed
      if (key === 'ioa') {
        changes.push(`IOA changes:`);
        compareMarkdownContent(oldValue as string, newValue as string, changes, '  ');
      } else if (key === 'iceberg') {
        changes.push(`Iceberg diagram updated:`);
        compareMarkdownContent(oldValue as string, newValue as string, changes, '  ');
      } else if (key === 'issues' || key === 'boundaries') {
        const oldItems = oldValue as any[] || [];
        const newItems = newValue as any[] || [];
        
        if (oldItems.length !== newItems.length) {
          const itemType = key === 'issues' ? 'Issues' : 'Boundaries';
          changes.push(`${itemType} count changed from ${oldItems.length} to ${newItems.length}`);
          
          // Show which items were added/removed
          const oldIds = new Set(oldItems.map(item => item.id));
          const newIds = new Set(newItems.map(item => item.id));
          
          // Find removed items
          oldItems.forEach(item => {
            if (!newIds.has(item.id)) {
              changes.push(`  - Removed: ${item.name || item.id}`);
            }
          });
          
          // Find added items
          newItems.forEach(item => {
            if (!oldIds.has(item.id)) {
              changes.push(`  + Added: ${item.name || item.id}`);
            }
          });
        }
        
        // Show changes in existing items
        oldItems.forEach(oldItem => {
          const newItem = newItems.find(item => item.id === oldItem.id);
          if (newItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
            changes.push(`  ~ Changes in ${oldItem.name || oldItem.id}:`);
            // Compare description as markdown
            if (oldItem.description !== newItem.description) {
              compareMarkdownContent(oldItem.description, newItem.description, changes, '    ');
            }
            // Compare other fields
            Object.keys(oldItem).forEach(field => {
              if (field !== 'description' && field !== 'id' && field !== 'name' && 
                  oldItem[field] !== newItem[field]) {
                if (typeof oldItem[field] === 'string') {
                  compareMarkdownContent(oldItem[field], newItem[field], changes, `    ${field}: `);
                } else {
                  changes.push(`    ${field}: ${oldItem[field]} → ${newItem[field]}`);
                }
              }
            });
          }
        });
      } else if (key === 'scenarios') {
        const oldScenarios = oldValue as any[] || [];
        const newScenarios = newValue as any[] || [];
        
        if (oldScenarios.length !== newScenarios.length) {
          changes.push(`Scenarios count changed from ${oldScenarios.length} to ${newScenarios.length}`);
          
          // Show which scenarios were added/removed
          const oldIds = new Set(oldScenarios.map(s => s.id));
          const newIds = new Set(newScenarios.map(s => s.id));
          
          oldScenarios.forEach(scenario => {
            if (!newIds.has(scenario.id)) {
              changes.push(`  - Removed: ${scenario.name || scenario.id}`);
            }
          });
          
          newScenarios.forEach(scenario => {
            if (!oldIds.has(scenario.id)) {
              changes.push(`  + Added: ${scenario.name || scenario.id}`);
            }
          });
        }
        
        // Show changes in existing scenarios
        oldScenarios.forEach(oldScenario => {
          const newScenario = newScenarios.find(s => s.id === oldScenario.id);
          if (newScenario && JSON.stringify(oldScenario) !== JSON.stringify(newScenario)) {
            changes.push(`  ~ Changes in ${oldScenario.name || oldScenario.id}:`);
            // Compare description and other text fields as markdown
            ['description', 'notes', 'outcome'].forEach(field => {
              if (oldScenario[field] !== newScenario[field]) {
                compareMarkdownContent(oldScenario[field], newScenario[field], changes, `    ${field}: `);
              }
            });
            // Compare other fields
            Object.keys(oldScenario).forEach(field => {
              if (!['description', 'notes', 'outcome', 'id', 'name'].includes(field) && 
                  oldScenario[field] !== newScenario[field]) {
                changes.push(`    ${field}: ${oldScenario[field]} → ${newScenario[field]}`);
              }
            });
          }
        });
      } else {
        changes.push(`${key} updated`);
      }
    }
  }, []);

  // Process snapshot updates
  const processSnapshotUpdate = useCallback(async (oldSnapshot: StateSnapshot, newSnapshot: StateSnapshot) => {
    // Always log this regardless of debug window state
    console.log('[DEBUG] 🔄 Generating change summary...');
    
    const changes: string[] = [];
    await Promise.all([
      compareItems(oldSnapshot, newSnapshot, 'caseFile', changes),
      compareItems(oldSnapshot, newSnapshot, 'ioa', changes),
      compareItems(oldSnapshot, newSnapshot, 'iceberg', changes),
      compareItems(oldSnapshot, newSnapshot, 'issues', changes),
      compareItems(oldSnapshot, newSnapshot, 'boundaries', changes),
      compareItems(oldSnapshot, newSnapshot, 'scenarios', changes)
    ]);

    // Log whether changes were found
    console.log('[DEBUG] Change detection result:', {
      changesFound: changes.length > 0,
      numberOfChanges: changes.length,
      changes
    });

    // Even if no specific changes were detected, check for creation from nothing
    if (changes.length === 0 && !oldSnapshot.caseFile && newSnapshot.caseFile) {
      changes.push('- Case file initially loaded');
      console.log('[DEBUG] Added fallback change detection for initial case load');
    }

    if (changes.length > 0) {
      // Remove duplicate entries
      const uniqueChanges = Array.from(new Set(changes));
      
      // Store the change record with summary and details
      const changeRecord: ChangeRecord = {
        timestamp: Date.now(),
        changes: uniqueChanges,
        summary: uniqueChanges[0],
        details: uniqueChanges.join('\n')
      };

      setState(prev => ({
        ...prev,
        prevSnapshot: newSnapshot,
        changeHistory: [...prev.changeHistory, changeRecord]
      }));

      // Log changes to console for debugging
      console.log('📝 State changes detected:', changeRecord);
    } else {
      console.log('[DEBUG] No changes detected between snapshots');
    }
  }, [compareItems]);

  // Process update function
  const processUpdate = async () => {
    console.log('[DEBUG] ⏰ Processing state update');
    const latestSnapshot = createSnapshot();
    
    lastCaseRef.current = currentCase;
    
    if (state.prevSnapshot) {
      console.log('[DEBUG] Has previous snapshot, comparing with new snapshot');
      await processSnapshotUpdate(state.prevSnapshot, latestSnapshot);
    } else {
      console.log('[DEBUG] No previous snapshot, storing current as first snapshot');
      // Create an initial change record for the first case load
      const changes: string[] = [];
      
      // Get qualitative summary if we have a case file
      if (latestSnapshot.caseFile?.content) {
        try {
          console.log('[DEBUG] Getting qualitative summary for initial case');
          const summary = await api.summarizeCaseChanges('', latestSnapshot.caseFile.content);
          changes.push(`- Case file loaded: ${latestSnapshot.caseFile.id || 'unknown'}`);
          changes.push(`- Initial content summary: ${summary}`);
          changes.push(`- Content length: ${latestSnapshot.caseFile.content.length} characters`);
        } catch (err) {
          console.error('❌ Error getting initial case summary:', err);
          changes.push(`- Case file loaded: ${latestSnapshot.caseFile.id || 'unknown'}`);
          changes.push(`- Content length: ${latestSnapshot.caseFile.content.length} characters`);
        }
      } else {
        changes.push('- Initial state loaded (no case file)');
      }
      
      const initialChangeRecord: ChangeRecord = {
        timestamp: Date.now(),
        changes,
        summary: changes[0] || 'Initial state loaded',
        details: changes.join('\n')
      };
      
      console.log('[DEBUG] Recording initial case load in change history:', initialChangeRecord);
      
      setState(prev => ({ 
        ...prev, 
        prevSnapshot: latestSnapshot,
        changeHistory: [...prev.changeHistory, initialChangeRecord]
      }));
    }
  };

  // Monitor state changes
  useEffect(() => {
    mountCountRef.current++;
    
    // Always log the mount count
    console.log('[DEBUG] useEffect triggered:', {
      mountCount: mountCountRef.current,
      hasPrevSnapshot: !!state.prevSnapshot,
      currentCaseId: currentCase?.id,
      lastCaseId: lastCaseRef.current?.id,
    });
    
    // Skip if no case or if we're just mounting
    if (!currentCase || mountCountRef.current === 1) {
      // On first mount, just store the reference
      if (currentCase) {
        lastCaseRef.current = currentCase;
        lastProcessedHash.current = hashContent(currentCase.content);
        console.log('[DEBUG] First mount with case:', {
          caseId: currentCase.id,
          contentHash: lastProcessedHash.current
        });
      } else {
        console.log('[DEBUG] First mount without case');
      }
      return;
    }

    console.log('🔄 Checking for state changes:', {
      mountCount: mountCountRef.current,
      hasPrevSnapshot: !!state.prevSnapshot,
      currentCaseId: currentCase?.id,
      lastCaseId: lastCaseRef.current?.id,
    });

    // Check for content changes
    if (currentCase.id === lastCaseRef.current?.id) {
      console.log('[DEBUG] ⚠️ Same case ID, checking for content changes...');
      
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Set new timeout for debounced update with longer delay
      updateTimeoutRef.current = setTimeout(async () => {
        const oldContent = lastCaseRef.current?.content;
        const newContent = currentCase.content;
        
        // Check if content change is significant
        if (isChangeSignificant(oldContent, newContent)) {
          console.log('[DEBUG] ✅ Significant content changes detected, processing update');
          processUpdate();
          return;
        }
        
        // Check other components for significant changes
        const hasSignificantIOAChange = isComponentChangeSignificant(
          lastCaseRef.current?.analysis?.ioa,
          currentCase.analysis?.ioa
        );
        
        const hasSignificantIcebergChange = isComponentChangeSignificant(
          lastCaseRef.current?.analysis?.iceberg,
          currentCase.analysis?.iceberg
        );
        
        const hasSignificantIssuesChange = isComponentChangeSignificant(
          lastCaseRef.current?.analysis?.components,
          currentCase.analysis?.components
        );
        
        const hasSignificantScenariosChange = isComponentChangeSignificant(
          lastCaseRef.current?.scenarios,
          currentCase.scenarios
        );
        
        // Process if we have significant component changes
        if (hasSignificantIOAChange || 
            hasSignificantIcebergChange || 
            hasSignificantIssuesChange || 
            hasSignificantScenariosChange) {
          console.log('[DEBUG] ✅ Significant component changes detected, processing update');
          processUpdate();
          return;
        }
        
        console.log('[DEBUG] 📝 No significant changes detected');
      }, 2000); // Increased debounce to 2 seconds
    } else {
      // Different case ID - always process
      console.log('[DEBUG] ✅ New case detected, processing update');
      processUpdate();
    }
  }, [currentCase, state.prevSnapshot, createSnapshot, processSnapshotUpdate, processUpdate]);

  // Public interface
  return {
    isDebugWindowOpen: state.isDebugWindowOpen,
    changeHistory: state.changeHistory,
    showFullState: state.showFullState,
    lastDiffResult: state.lastDiffResult,
    toggleDebugWindow: () => setState(prev => ({ 
      ...prev, 
      isDebugWindowOpen: !prev.isDebugWindowOpen 
    })),
    toggleFullState: () => setState(prev => ({ ...prev, showFullState: !prev.showFullState })),
    clearHistory: () => setState(prev => ({ ...prev, changeHistory: [] })),
    createSnapshot
  };
}; 