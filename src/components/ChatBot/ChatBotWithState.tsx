import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ChatBot } from './ChatBot';
import { ChatBotProps } from './types';

export const ChatBotWithState: React.FC<ChatBotProps> = (props) => {
  // Get the current case from Redux store
  const currentCase = useSelector((state: RootState) => state.negotiation.currentCase);

  // Create a dynamic system message that includes the generated content
  const dynamicSystemMessage = React.useMemo(() => {
    if (!currentCase?.analysis) {
      return props.systemMessage;
    }

    const { ioa, iceberg, components } = currentCase.analysis;
    const scenarios = currentCase.scenarios;

    return `${props.systemMessage}

Current Generated Content:

1. Islands of Agreement (IoA):
${ioa}

2. Iceberg Analysis:
${iceberg}

3. Issues:
${components.map(comp => `- ${comp.name}: ${comp.description}
  - Party 1 Redline: ${comp.redlineParty1}
  - Party 1 Bottomline: ${comp.bottomlineParty1}
  - Party 2 Redline: ${comp.redlineParty2}
  - Party 2 Bottomline: ${comp.bottomlineParty2}
  - Priority: ${comp.priority}`).join('\n')}

4. Scenarios:
${scenarios.map(scenario => `- ${scenario.type}: ${scenario.description}`).join('\n')}

Use this information to provide more informed and relevant responses to the user.`;
  }, [currentCase, props.systemMessage]);

  // Determine which context items are active based on current case
  const contextItems = React.useMemo(() => {
    // Default context items - removed 'case' since it's not actually added to the context
    const items = [
      { key: 'ioa', label: 'Islands of Agreement', active: false },
      { key: 'iceberg', label: 'Iceberg Analysis', active: false },
      { key: 'issues', label: 'Issues', active: false },
      { key: 'scenarios', label: 'Scenarios', active: false },
      { key: 'rlbl', label: 'RL/BL', active: false },
    ];

    // No case data available
    if (!currentCase) {
      return items;
    }

    // Analysis data available
    if (currentCase.analysis) {
      const { ioa, iceberg, components } = currentCase.analysis;
      
      // Check Islands of Agreement
      if (ioa && ioa.trim().length > 0) {
        items.find(item => item.key === 'ioa')!.active = true;
      }
      
      // Check Iceberg Analysis
      if (iceberg && iceberg.trim().length > 0) {
        items.find(item => item.key === 'iceberg')!.active = true;
      }
      
      // Check Issues
      if (components && components.length > 0) {
        items.find(item => item.key === 'issues')!.active = true;
        
        // Check if we have redlines/bottomlines
        const hasRedlinesOrBottomlines = components.some(comp => 
          comp.redlineParty1 || comp.redlineParty2 || 
          comp.bottomlineParty1 || comp.bottomlineParty2
        );
        
        if (hasRedlinesOrBottomlines) {
          items.find(item => item.key === 'rlbl')!.active = true;
        }
      }
    }
    
    // Check Scenarios
    if (currentCase.scenarios && currentCase.scenarios.length > 0) {
      items.find(item => item.key === 'scenarios')!.active = true;
    }
    
    return items;
  }, [currentCase]);

  return (
    <ChatBot
      {...props}
      systemMessage={dynamicSystemMessage}
      contextItems={contextItems}
    />
  );
}; 