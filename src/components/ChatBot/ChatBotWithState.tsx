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

  return (
    <ChatBot
      {...props}
      systemMessage={dynamicSystemMessage}
    />
  );
}; 