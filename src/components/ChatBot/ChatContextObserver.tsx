import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useChatContext } from './ChatContextProvider';

// Define types for the data we expect to receive
interface Component {
  title: string;
  description: string;
}

interface BoundaryItem {
  description: string;
}

interface Boundaries {
  redlines?: BoundaryItem[];
  bottomlines?: BoundaryItem[];
}

interface Scenario {
  title: string;
  description: string;
  outcome: string;
}

interface Analysis {
  summary?: string;
  components?: Component[];
}

// Interface to track what data is available
interface AvailableContextData {
  caseContent: boolean;
  parties: boolean;
  analysis: boolean;
  boundaries: boolean;
  scenarios: boolean;
}

/**
 * This component doesn't render anything but observes the Redux state
 * and automatically captures important content for the chatbot context
 */
const ChatContextObserver: React.FC = () => {
  const { addInterfaceContent } = useChatContext();
  const [availableData, setAvailableData] = useState<AvailableContextData>({
    caseContent: false,
    parties: false,
    analysis: false,
    boundaries: false,
    scenarios: false
  });
  
  // Add a ref to track previous data availability state to prevent unnecessary updates
  const previousAvailabilityRef = useRef<string>('');

  // Get all the relevant data from Redux store
  const state = useSelector((state: RootState) => state);
  const negotiation = state.negotiation;
  
  // Get the current case from the negotiation state
  const { currentCase } = negotiation;
  
  // Debug: Log the full Redux state structure once on mount
  useEffect(() => {
    console.log("Full Redux state:", state);
    console.log("Negotiation state:", negotiation);
    
    // Explore the negotiation state for any content-like properties
    Object.keys(negotiation).forEach(key => {
      const value = (negotiation as any)[key];
      if (typeof value === 'string' && value.length > 10) {
        console.log(`Found potential content in negotiation.${key}:`, value.substring(0, 30) + '...');
      } else if (value && typeof value === 'object') {
        Object.keys(value).forEach(subKey => {
          const subValue = value[subKey];
          if (typeof subValue === 'string' && subValue.length > 10) {
            console.log(`Found potential content in negotiation.${key}.${subKey}:`, subValue.substring(0, 30) + '...');
          }
        });
      }
    });
  }, []);
  
  // Since we don't know all property names that might exist, use a more generic approach
  // with type assertions to access potentially undefined properties
  const analysis = currentCase ? (currentCase as any).analysis as Analysis | undefined : undefined;
  const boundaries = currentCase ? (currentCase as any).boundaries as Boundaries | undefined : undefined;
  const scenarios = currentCase ? (currentCase as any).scenarios as Scenario[] | undefined : undefined;

  // Initial load of case content
  useEffect(() => {
    // Add debug logging to see the current case data
    console.log("Current case data:", currentCase);
    
    // Check for content in multiple possible locations
    const caseContent = 
      // Use type assertions for all property accesses to avoid TS errors
      (currentCase ? (currentCase as any).content : undefined) || 
      (currentCase ? (currentCase as any).text : undefined) || 
      (currentCase ? (currentCase as any).caseContent : undefined) ||
      (currentCase ? (currentCase as any).caseText : undefined) ||
      // Default to empty string if nothing found
      '';
    
    const hasCaseContent = !!caseContent && caseContent.trim().length > 0;
    console.log("Has case content:", hasCaseContent, caseContent ? `(${caseContent.substring(0, 30)}...)` : "(no content)");
    
    if (hasCaseContent) {
      addInterfaceContent('Case Content', caseContent);
      console.log('Added case content to chat context:', caseContent.substring(0, 100) + '...');
      
      // Update available data tracking
      setAvailableData(prev => ({ ...prev, caseContent: true }));
    } else if (availableData.caseContent !== false) {
      // If we previously had content but now don't, update the state
      setAvailableData(prev => ({ ...prev, caseContent: false }));
      
      // Add a notification about missing case content
      addInterfaceContent('System', 'Case content is not available.');
    }
  }, [currentCase, addInterfaceContent, availableData.caseContent]);

  // Add parties information when available
  useEffect(() => {
    const hasParties = !!currentCase?.suggestedParties && currentCase.suggestedParties.length > 0;
    
    if (hasParties) {
      const partiesContent = currentCase.suggestedParties
        .map(party => `${party.name}: ${party.description}`)
        .join('\n\n');
      
      addInterfaceContent('Parties Information', partiesContent);
      console.log('Added parties information to chat context');
      
      // Update available data tracking
      setAvailableData(prev => ({ ...prev, parties: true }));
    } else if (availableData.parties !== false) {
      // If we previously had parties but now don't, update the state
      setAvailableData(prev => ({ ...prev, parties: false }));
      
      // Add a notification about missing parties information
      addInterfaceContent('System', 'Parties information is not available.');
    }
  }, [currentCase?.suggestedParties, addInterfaceContent, availableData.parties]);

  // Add analysis when available
  useEffect(() => {
    const hasAnalysis = !!analysis && (!!analysis.summary || (!!analysis.components && analysis.components.length > 0));
    
    if (hasAnalysis) {
      // Format analysis data
      let analysisContent = 'Analysis Summary:\n';
      
      if (analysis.summary) {
        analysisContent += analysis.summary + '\n\n';
      } else {
        analysisContent += 'No summary available.\n\n';
      }
      
      if (analysis.components && analysis.components.length > 0) {
        analysisContent += 'Key Components:\n';
        analysis.components.forEach((component: Component, index: number) => {
          analysisContent += `${index + 1}. ${component.title}: ${component.description}\n`;
        });
      } else {
        analysisContent += 'No components identified.';
      }
      
      addInterfaceContent('Analysis', analysisContent);
      console.log('Added analysis to chat context');
      
      // Update available data tracking
      setAvailableData(prev => ({ ...prev, analysis: true }));
    } else if (availableData.analysis !== false) {
      // If we previously had analysis but now don't, update the state
      setAvailableData(prev => ({ ...prev, analysis: false }));
      
      // Add a notification about missing analysis
      addInterfaceContent('System', 'Analysis data is not available. Please go to the Analysis tab to generate it.');
    }
  }, [analysis, addInterfaceContent, availableData.analysis]);

  // Add boundaries when available
  useEffect(() => {
    const hasBoundaries = !!boundaries && 
      ((!!boundaries.redlines && boundaries.redlines.length > 0) || 
       (!!boundaries.bottomlines && boundaries.bottomlines.length > 0));
    
    if (hasBoundaries) {
      // Format boundaries data
      let boundariesContent = 'Negotiation Boundaries:\n';
      
      if (boundaries.redlines && boundaries.redlines.length > 0) {
        boundariesContent += 'Redlines (Must Have):\n';
        boundaries.redlines.forEach((item: BoundaryItem, index: number) => {
          boundariesContent += `${index + 1}. ${item.description}\n`;
        });
        boundariesContent += '\n';
      } else {
        boundariesContent += 'No redlines defined.\n\n';
      }
      
      if (boundaries.bottomlines && boundaries.bottomlines.length > 0) {
        boundariesContent += 'Bottomlines (Minimum Acceptable):\n';
        boundaries.bottomlines.forEach((item: BoundaryItem, index: number) => {
          boundariesContent += `${index + 1}. ${item.description}\n`;
        });
      } else {
        boundariesContent += 'No bottomlines defined.';
      }
      
      addInterfaceContent('Boundaries', boundariesContent);
      console.log('Added boundaries to chat context');
      
      // Update available data tracking
      setAvailableData(prev => ({ ...prev, boundaries: true }));
    } else if (availableData.boundaries !== false) {
      // If we previously had boundaries but now don't, update the state
      setAvailableData(prev => ({ ...prev, boundaries: false }));
      
      // Add a notification about missing boundaries
      addInterfaceContent('System', 'Negotiation boundaries are not available. Please go to the Boundaries tab to define them.');
    }
  }, [boundaries, addInterfaceContent, availableData.boundaries]);

  // Add scenarios when available
  useEffect(() => {
    const hasScenarios = !!scenarios && scenarios.length > 0;
    
    if (hasScenarios) {
      // Format scenarios data
      let scenariosContent = 'Negotiation Scenarios:\n';
      
      scenarios.forEach((scenario: Scenario, index: number) => {
        scenariosContent += `Scenario ${index + 1}: ${scenario.title}\n`;
        scenariosContent += `Description: ${scenario.description}\n`;
        scenariosContent += `Outcome: ${scenario.outcome}\n\n`;
      });
      
      addInterfaceContent('Scenarios', scenariosContent);
      console.log('Added scenarios to chat context');
      
      // Update available data tracking
      setAvailableData(prev => ({ ...prev, scenarios: true }));
    } else if (availableData.scenarios !== false) {
      // If we previously had scenarios but now don't, update the state
      setAvailableData(prev => ({ ...prev, scenarios: false }));
      
      // Add a notification about missing scenarios
      addInterfaceContent('System', 'Negotiation scenarios are not available. Please go to the Scenarios tab to create them.');
    }
  }, [scenarios, addInterfaceContent, availableData.scenarios]);

  // Add a summary of available data to context
  useEffect(() => {
    // Add a minimum interval between updates to prevent too frequent updates
    const updateIntervalMs = 5000; // 5 seconds between availability updates
    
    // Create the timer
    const timer = setTimeout(() => {
      // Generate a summary of what data is available and what's missing
      let availabilityMessage = 'Current available context:\n';
      
      availabilityMessage += `- Case content: ${availableData.caseContent ? 'Available' : 'Not available'}\n`;
      availabilityMessage += `- Parties information: ${availableData.parties ? 'Available' : 'Not available'}\n`;
      availabilityMessage += `- Analysis: ${availableData.analysis ? 'Available' : 'Not available'}\n`;
      availabilityMessage += `- Negotiation boundaries: ${availableData.boundaries ? 'Available' : 'Not available'}\n`;
      availabilityMessage += `- Negotiation scenarios: ${availableData.scenarios ? 'Available' : 'Not available'}\n\n`;
      
      if (!availableData.caseContent && !availableData.parties && !availableData.analysis && 
          !availableData.boundaries && !availableData.scenarios) {
        availabilityMessage += 'No case data is available yet. Please use the application to create case content, analyze it, and develop negotiation strategies.';
      } else {
        availabilityMessage += 'You can ask questions about the available data. For missing data, please navigate to the appropriate tab in the application to create it.';
      }
      
      // Only update if the message has changed from previous state
      if (availabilityMessage !== previousAvailabilityRef.current) {
        addInterfaceContent('Data Availability', availabilityMessage);
        console.log('Added context availability summary to chat context');
        previousAvailabilityRef.current = availabilityMessage;
      }
    }, updateIntervalMs);
    
    // Cleanup on unmount or when availableData changes
    return () => clearTimeout(timer);
  }, [availableData, addInterfaceContent]);

  // Return null as this component doesn't render anything
  return null;
};

export default ChatContextObserver; 