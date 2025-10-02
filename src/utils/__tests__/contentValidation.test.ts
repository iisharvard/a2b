import {
  validateIoAContent,
  validateIcebergContent,
  validateComponentsContent,
  validateBoundariesContent,
  validateScenariosContent
} from '../contentValidation';
import { parseComponentsFromMarkdown } from '../componentParser';
import type { Component, Scenario } from '../../store/negotiationSlice';

describe('contentValidation utilities', () => {
  describe('validateIoAContent', () => {
    const validIoA = `# Island of Agreements

## Contested Facts
- Fact 1

## Agreed Facts
- Fact 2

## Convergent Norms
- Norm 1

## Divergent Norms
- Norm 2`;

    it('returns null for valid IoA content', () => {
      expect(validateIoAContent(validIoA)).toBeNull();
    });

    it('reports missing sections', () => {
      const invalid = validIoA.replace('## Divergent Norms', '## Missing Norms');
      expect(validateIoAContent(invalid)).toContain('Missing required section');
    });
  });

  describe('validateIcebergContent', () => {
    const validIceberg = `Party 1
Positions
- Position 1

Reasoning
- Reason 1

Values
- Value 1

Party 2
What
- Position 2

How
- Reason 2

Why
- Value 2`;

    it('returns null for valid Iceberg content', () => {
      expect(validateIcebergContent(validIceberg)).toBeNull();
    });

    it('reports missing party sections', () => {
      expect(validateIcebergContent('No parties')).toContain('Party 1 and Party 2');
    });
  });

  describe('validateComponentsContent', () => {
    const validComponents = `## Component 1

Description 1

## Component 2

Description 2`;

    it('returns null for valid components content', () => {
      const result = validateComponentsContent(validComponents, text => parseComponentsFromMarkdown(text));
      expect(result).toBeNull();
    });

    it('uses parser errors to report invalid format', () => {
      const parser = () => {
        throw new Error('boom');
      };
      const result = validateComponentsContent(validComponents, parser);
      expect(result).toContain('Invalid component format');
    });
  });

  describe('validateBoundariesContent', () => {
    const baseComponent: Component = {
      id: 'comp-1',
      name: 'Component 1',
      description: 'Description',
      redlineParty1: 'R1',
      bottomlineParty1: 'B1',
      redlineParty2: 'R2',
      bottomlineParty2: 'B2',
      priority: 1
    };

    it('returns null for valid boundaries', () => {
      expect(validateBoundariesContent([baseComponent])).toBeNull();
    });

    it('reports invalid priority', () => {
      const invalidPriority = [{ ...baseComponent, priority: 'high' as unknown as number }];
      expect(validateBoundariesContent(invalidPriority)).toContain('invalid priority');
    });
  });

  describe('validateScenariosContent', () => {
    const baseScenario: Scenario = {
      id: 'scen-1',
      componentId: 'comp-1',
      type: 'agreement_area',
      description: 'Scenario description'
    };

    it('returns null for valid scenarios', () => {
      expect(validateScenariosContent([baseScenario])).toBeNull();
    });

    it('reports invalid type', () => {
      const invalidType = [{ ...baseScenario, type: 'invalid' as Scenario['type'] }];
      expect(validateScenariosContent(invalidType)).toContain('invalid type');
    });
  });
});
