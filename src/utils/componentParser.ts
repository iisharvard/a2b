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
      
      // Find existing component to preserve its data
      const existingComponent = existingComponents.find(
        (c) => c.name.toLowerCase() === name.toLowerCase()
      );
      
      return {
        id: existingComponent?.id || `${Date.now()}-${index}`,
        name,
        description,
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