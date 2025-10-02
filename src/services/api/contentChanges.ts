import { store } from '../../store';
import {
  updateIoA,
  updateIceberg,
  updateComponents,
  setScenarios,
  Component,
  Scenario
} from '../../store/negotiationSlice';
import { parseComponentsFromMarkdown } from '../../utils/componentParser';
import { ApiResponse } from '../../types/api';
import {
  validateBoundariesContent,
  validateComponentsContent,
  validateIcebergContent,
  validateIoAContent,
  validateScenariosContent
} from '../../utils/contentValidation';

/**
 * Changes the Island of Agreement content
 * @param content New IoA content
 * @returns Object with success status and message
 */
export const changeIoA = (content: string): ApiResponse<{ success: boolean, message: string }> => {
  try {
    const validationMessage = validateIoAContent(content);
    if (validationMessage) {
      return {
        success: false,
        message: validationMessage
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
    const validationMessage = validateIcebergContent(content);
    if (validationMessage) {
      return {
        success: false,
        message: validationMessage
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
    const validationMessage = validateComponentsContent(content, text => parseComponentsFromMarkdown(text));
    if (validationMessage) {
      return {
        success: false,
        message: validationMessage
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
    const validationMessage = validateBoundariesContent(components);
    if (validationMessage) {
      return {
        success: false,
        message: validationMessage
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
    const validationMessage = validateScenariosContent(scenarios);
    if (validationMessage) {
      return {
        success: false,
        message: validationMessage
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

    store.dispatch(setScenarios(scenarios));

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
