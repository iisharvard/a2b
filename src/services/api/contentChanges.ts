import { store } from '../../store';
import { 
  updateIoA, 
  updateIceberg, 
  updateComponents,
  Component,
  Scenario
} from '../../store/negotiationSlice';
import { parseComponentsFromMarkdown, componentsToMarkdown } from '../../utils/componentParser';
import { ApiResponse } from '../../types/api';

/**
 * Validates the format of an Island of Agreement content
 * @param content Content to validate
 * @returns true if content is valid, error message if invalid
 */
const validateIoaFormat = (content: string): true | string => {
  // Check if the content has the required sections
  const requiredSections = [
    '# Island of Agreements',
    '## Contested Facts',
    '## Agreed Facts',
    '## Convergent Norms',
    '## Divergent Norms'
  ];

  const missingSection = requiredSections.find(section => !content.includes(section));
  if (missingSection) {
    return `Missing required section: ${missingSection}`;
  }

  // Check if content has bullet points for each section
  const sections = content.split(/^##\s+/m).filter(Boolean);
  if (sections.length < 4) {
    return 'Content must have at least 4 sections (Contested Facts, Agreed Facts, Convergent Norms, Divergent Norms)';
  }

  return true;
};

/**
 * Validates the format of an Iceberg Analysis content
 * @param content Content to validate
 * @returns true if content is valid, error message if invalid
 */
const validateIcebergFormat = (content: string): true | string => {
  // Check if the content follows the structure needed for the iceberg visualization
  // Look for Party 1 and Party 2 in various formats (plain text or markdown headers)
  const party1Pattern = /(?:^|\n)(?:## )?(?:Party 1|.*Organization|.*User.*|.*Your.*|.*We.*)/;
  const party2Pattern = /(?:^|\n)(?:## )?(?:Party 2|.*Counter.*|.*They.*|.*Them.*)/;
  
  if (!party1Pattern.test(content) || !party2Pattern.test(content)) {
    return 'Content must include sections for Party 1 and Party 2';
  }

  // Check if the content has required sections in various formats
  const positionPatterns = [/Position(?:s)?/, /What/];
  const reasoningPatterns = [/Reasoning/, /How/];
  const valuesPatterns = [/Value(?:s)?/, /Motive(?:s)?/, /Why/];
  
  const hasPositions = positionPatterns.some(pattern => pattern.test(content));
  const hasReasoning = reasoningPatterns.some(pattern => pattern.test(content));
  const hasValues = valuesPatterns.some(pattern => pattern.test(content));
  
  const missingSections = [];
  if (!hasPositions) missingSections.push('Positions/What');
  if (!hasReasoning) missingSections.push('Reasoning/How');
  if (!hasValues) missingSections.push('Values/Motives/Why');
  
  if (missingSections.length > 0) {
    return `Missing required sections: ${missingSections.join(', ')}`;
  }
  
  // Check for bullet points in the content
  if (!content.includes('- ')) {
    return 'Content must include bullet points (- ) for entries';
  }

  return true;
};

/**
 * Validates component format
 * @param content Content to validate
 * @returns true if content is valid, error message if invalid
 */
const validateComponentsFormat = (content: string): true | string => {
  // Check if content has component headers (##)
  if (!content.includes('##')) {
    return 'Content must have component headers (##)';
  }

  // Parse the components to see if they're valid
  try {
    const components = parseComponentsFromMarkdown(content);
    
    // Check if any components were parsed
    if (components.length === 0) {
      return 'No valid components found in content';
    }

    // Check each component has a name and description
    const invalidComponent = components.find(comp => !comp.name || !comp.description);
    if (invalidComponent) {
      return `Component "${invalidComponent.name || 'unnamed'}" is missing a name or description`;
    }

    return true;
  } catch (error) {
    return `Invalid component format: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

/**
 * Validates component boundaries format
 * @param components Array of components to validate
 * @returns true if components are valid, error message if invalid
 */
const validateBoundariesFormat = (components: Component[]): true | string => {
  if (!Array.isArray(components) || components.length === 0) {
    return 'Components must be a non-empty array';
  }

  // Check if required fields exist in each component
  for (const component of components) {
    if (!component.id || !component.name || !component.description) {
      return `Component ${component.id || 'unknown'} is missing id, name, or description`;
    }

    if (!component.redlineParty1 || !component.bottomlineParty1) {
      return `Component "${component.name}" is missing redline or bottomline for Party 1`;
    }

    if (!component.redlineParty2 || !component.bottomlineParty2) {
      return `Component "${component.name}" is missing redline or bottomline for Party 2`;
    }

    if (typeof component.priority !== 'number') {
      return `Component "${component.name}" has an invalid priority (must be a number)`;
    }
  }

  return true;
};

/**
 * Validates scenarios format
 * @param scenarios Array of scenarios to validate
 * @returns true if scenarios are valid, error message if invalid
 */
const validateScenariosFormat = (scenarios: Scenario[]): true | string => {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return 'Scenarios must be a non-empty array';
  }

  const validTypes = [
    'redline_violated_p1', 
    'bottomline_violated_p1', 
    'agreement_area', 
    'bottomline_violated_p2', 
    'redline_violated_p2'
  ];

  // Check each scenario has required fields and valid type
  for (const scenario of scenarios) {
    if (!scenario.id || !scenario.componentId || !scenario.description) {
      return `Scenario ${scenario.id || 'unknown'} is missing id, componentId, or description`;
    }

    if (!validTypes.includes(scenario.type)) {
      return `Scenario ${scenario.id} has invalid type: ${scenario.type}`;
    }
  }

  return true;
};

/**
 * Changes the Island of Agreement content
 * @param content New IoA content
 * @returns Object with success status and message
 */
export const changeIoA = (content: string): ApiResponse<{ success: boolean, message: string }> => {
  try {
    // Validate the IoA format
    const validationResult = validateIoaFormat(content);
    if (validationResult !== true) {
      return {
        success: false,
        message: validationResult
      };
    }

    // Update the IoA in the store
    store.dispatch(updateIoA(content));

    return {
      success: true,
      message: 'Island of Agreement updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating Island of Agreement: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Changes the Iceberg analysis content
 * @param content New Iceberg content
 * @returns Object with success status and message
 */
export const changeIceberg = (content: string): ApiResponse<{ success: boolean, message: string }> => {
  try {
    // Validate the Iceberg format
    const validationResult = validateIcebergFormat(content);
    if (validationResult !== true) {
      return {
        success: false,
        message: validationResult
      };
    }

    // Update the Iceberg in the store
    store.dispatch(updateIceberg(content));

    return {
      success: true,
      message: 'Iceberg analysis updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating Iceberg analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Changes the Components (issues) content
 * @param content New Components content in markdown format
 * @returns Object with success status and message
 */
export const changeComponents = (content: string): ApiResponse<{ success: boolean, message: string }> => {
  try {
    // Validate the Components format
    const validationResult = validateComponentsFormat(content);
    if (validationResult !== true) {
      return {
        success: false,
        message: validationResult
      };
    }

    // Get the current state
    const state = store.getState();
    const currentComponents = state.negotiation.currentCase?.analysis?.components || [];

    // Parse the new components, preserving existing data where possible
    const newComponents = parseComponentsFromMarkdown(content, currentComponents);

    // Update the Components in the store
    store.dispatch(updateComponents(newComponents));

    return {
      success: true,
      message: 'Components updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating Components: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Changes the Components boundaries (redlines and bottomlines)
 * @param components Array of components with boundaries
 * @returns Object with success status and message
 */
export const changeBoundaries = (components: Component[]): ApiResponse<{ success: boolean, message: string }> => {
  try {
    // Validate the Boundaries format
    const validationResult = validateBoundariesFormat(components);
    if (validationResult !== true) {
      return {
        success: false,
        message: validationResult
      };
    }

    // Update the Components in the store
    store.dispatch(updateComponents(components));

    return {
      success: true,
      message: 'Boundaries updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating Boundaries: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Changes the Scenarios content
 * @param scenarios Array of scenarios
 * @returns Object with success status and message
 */
export const changeScenarios = (scenarios: Scenario[]): ApiResponse<{ success: boolean, message: string }> => {
  try {
    // Validate the Scenarios format
    const validationResult = validateScenariosFormat(scenarios);
    if (validationResult !== true) {
      return {
        success: false,
        message: validationResult
      };
    }

    // Get the current state
    const state = store.getState();
    const currentCase = state.negotiation.currentCase;
    
    if (!currentCase) {
      return {
        success: false,
        message: 'No active case found'
      };
    }

    // Update the Scenarios in the store
    // Note: We need to update the setScenarios action in the store
    // For now, we'll use a workaround using the actual Redux store dispatch
    store.dispatch({ 
      type: 'negotiation/setScenarios', 
      payload: scenarios 
    });

    return {
      success: true,
      message: 'Scenarios updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error updating Scenarios: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

// Export all functions as a single API object
export const contentChangesApi = {
  changeIoA,
  changeIceberg,
  changeComponents,
  changeBoundaries,
  changeScenarios
}; 