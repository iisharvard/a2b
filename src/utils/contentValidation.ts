import { Component, Scenario } from '../store/negotiationSlice';

export type ValidationResult = string | null;

export const validateIoAContent = (content: string): ValidationResult => {
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

  const sections = content.split(/^##\s+/m).filter(Boolean);
  if (sections.length < 4) {
    return 'Content must have at least 4 sections (Contested Facts, Agreed Facts, Convergent Norms, Divergent Norms)';
  }

  return null;
};

export const validateIcebergContent = (content: string): ValidationResult => {
  const party1Pattern = /(?:^|\n)(?:## )?(?:Party 1|.*Organization|.*User.*|.*Your.*|.*We.*)/;
  const party2Pattern = /(?:^|\n)(?:## )?(?:Party 2|.*Counter.*|.*They.*|.*Them.*)/;

  const hasParty1 = party1Pattern.test(content);
  const hasParty2 = party2Pattern.test(content);

  const positionPatterns = [/Position(?:s)?/, /What/];
  const reasoningPatterns = [/Reasoning/, /How/];
  const valuesPatterns = [/Value(?:s)?/, /Motive(?:s)?/, /Why/];

  const hasPositions = positionPatterns.some(pattern => pattern.test(content));
  const hasReasoning = reasoningPatterns.some(pattern => pattern.test(content));
  const hasValues = valuesPatterns.some(pattern => pattern.test(content));
  const hasBulletPoints = content.includes('- ');

  const missingSections: string[] = [];
  if (!hasPositions) missingSections.push('Positions/What');
  if (!hasReasoning) missingSections.push('Reasoning/How');
  if (!hasValues) missingSections.push('Values/Motives/Why');

  let message = '';

  if (!hasParty1 || !hasParty2) {
    message += 'Content must include sections for Party 1 and Party 2. ';
  }

  if (missingSections.length > 0) {
    message += `Missing required sections: ${missingSections.join(', ')}`;
  }

  if (!hasBulletPoints) {
    message += (message ? ' ' : '') + 'Content must include bullet points (- ) for entries.';
  }

  return message || null;
};

export const validateComponentsContent = (content: string, parseComponents: (text: string) => Component[]): ValidationResult => {
  if (!content.includes('##')) {
    return 'Content must have component headers (##)';
  }

  try {
    const components = parseComponents(content);

    if (components.length === 0) {
      return 'No valid components found in content';
    }

    const invalidComponent = components.find(component => !component.name || !component.description);
    if (invalidComponent) {
      return `Component "${invalidComponent.name || 'unnamed'}" is missing a name or description`;
    }

    return null;
  } catch (error) {
    return `Invalid component format: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const validateBoundariesContent = (components: Component[]): ValidationResult => {
  if (!Array.isArray(components) || components.length === 0) {
    return 'Components must be a non-empty array';
  }

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

  return null;
};

export const validateScenariosContent = (scenarios: Scenario[]): ValidationResult => {
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    return 'Scenarios must be a non-empty array';
  }

  const validTypes: Scenario['type'][] = [
    'redline_violated_p1',
    'bottomline_violated_p1',
    'agreement_area',
    'bottomline_violated_p2',
    'redline_violated_p2'
  ];

  for (const scenario of scenarios) {
    if (!scenario.id || !scenario.componentId || !scenario.description) {
      return `Scenario ${scenario.id || 'unknown'} is missing id, componentId, or description`;
    }

    if (!validTypes.includes(scenario.type)) {
      return `Scenario ${scenario.id} has invalid type: ${scenario.type}`;
    }
  }

  return null;
};

