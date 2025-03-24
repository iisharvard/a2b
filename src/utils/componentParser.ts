import { Component } from '../store/negotiationSlice';

type ParsedComponent = Required<Component>;

/**
 * Parses markdown text into component objects
 * @param markdownText The markdown text to parse
 * @param existingComponents Optional array of existing components to preserve IDs and other data
 * @returns Array of parsed components
 */
export const parseComponentsFromMarkdown = (
  markdownText: string,
  existingComponents: Component[] = []
): Component[] => {
  try {
    const sections = markdownText.split('##').filter(Boolean);
    
    // Create a map of existing components by ID for faster lookup
    const existingComponentsById = new Map<string, Component>();
    existingComponents.forEach(component => {
      existingComponentsById.set(component.id, component);
    });
    
    // Track which components we've already processed to avoid duplicates
    const processedIds = new Set<string>();
    
    return sections.map((section, index) => {
      const lines = section.trim().split('\n');
      const name = lines[0].trim();
      
      const descriptionLines = [];
      let i = 1;
      while (i < lines.length && !lines[i].startsWith('###')) {
        if (lines[i].trim()) {
          descriptionLines.push(lines[i].trim());
        }
        i++;
      }
      const description = descriptionLines.join('\n').trim();
      
      // Try to find an existing component in this order:
      // 1. By exact name match
      // 2. By position in the array if length matches
      
      // Strategy 1: Find by exact name match
      let existingComponent = existingComponents.find(
        (c) => c.name === name && !processedIds.has(c.id)
      );
      
      // Strategy 2: Use the component at the same index position
      if (!existingComponent && index < existingComponents.length) {
        existingComponent = existingComponents[index];
      }
      
      // Mark this component as processed
      if (existingComponent) {
        processedIds.add(existingComponent.id);
      }
      
      // Create the component with preserved data
      return {
        id: existingComponent?.id || `${Date.now()}-${index}`,
        name, // Always use the new name
        description, // Always use the new description
        redlineParty1: existingComponent?.redlineParty1 || '',
        bottomlineParty1: existingComponent?.bottomlineParty1 || '',
        redlineParty2: existingComponent?.redlineParty2 || '',
        bottomlineParty2: existingComponent?.bottomlineParty2 || '',
        priority: existingComponent?.priority || index,
      };
    });
  } catch (error) {
    console.error('Error parsing components:', error);
    return [];
  }
};

/**
 * Converts components to markdown format
 * @param components Array of components to convert
 * @returns Markdown text representation of the components
 */
export const componentsToMarkdown = (components: Component[]): string => {
  return components
    .map((component) => {
      return `## ${component.name}\n\n${component.description}`;
    })
    .join('\n\n');
}; 