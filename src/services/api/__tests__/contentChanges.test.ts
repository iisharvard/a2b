import { store } from '../../../store';
import {
  changeIoA,
  changeIceberg,
  changeComponents,
  changeBoundaries,
  changeScenarios
} from '../contentChanges';

// Mock Redux store
jest.mock('../../../store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn()
  }
}));

describe('Content Change Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock store state
    (store.getState as jest.Mock).mockReturnValue({
      negotiation: {
        currentCase: {
          id: 'test-case-id',
          analysis: {
            id: 'test-analysis-id',
            ioa: '# Island of Agreements\n\n## Contested Facts\n- Test fact 1\n\n## Agreed Facts\n- Test fact 2\n\n## Convergent Norms\n- Test norm 1\n\n## Divergent Norms\n- Test norm 2',
            iceberg: 'Party 1\nPositions\n- Position 1\n\nInterests\n- Interest 1\n\nNeeds\n- Need 1\n\nReasoning\n- Reasoning 1\n\nValues\n- Value 1\n\nIdentity\n- Identity 1\n\nShared\nPositions\n- Position shared\n\nInterests\n- Interest shared\n\nNeeds\n- Need shared\n\nReasoning\n- Reasoning shared\n\nValues\n- Value shared\n\nIdentity\n- Identity shared\n\nParty 2\nPositions\n- Position 2\n\nInterests\n- Interest 2\n\nNeeds\n- Need 2\n\nReasoning\n- Reasoning 2\n\nValues\n- Value 2\n\nIdentity\n- Identity 2',
            components: [
              {
                id: 'comp-1',
                name: 'Component 1',
                description: 'Description 1',
                redlineParty1: 'Redline P1',
                bottomlineParty1: 'Bottomline P1',
                redlineParty2: 'Redline P2',
                bottomlineParty2: 'Bottomline P2',
                priority: 1
              }
            ],
            scenarios: [
              {
                id: 'scen-1',
                componentId: 'comp-1',
                type: 'agreement_area',
                description: 'Test scenario'
              }
            ],
            createdAt: '2023-01-01',
            updatedAt: '2023-01-01'
          }
        }
      }
    });
  });

  describe('changeIoA', () => {
    test('should validate and update IoA content', () => {
      const validIoA = '# Island of Agreements\n\n## Contested Facts\n- New contested fact\n\n## Agreed Facts\n- New agreed fact\n\n## Convergent Norms\n- New norm\n\n## Divergent Norms\n- New divergent norm';
      
      const result = changeIoA(validIoA) as any;
      
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/updateIoA',
        payload: validIoA
      }));
    });

    test('should reject invalid IoA content', () => {
      const invalidIoA = '# Invalid content\n\nMissing sections';
      
      const result = changeIoA(invalidIoA) as any;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required section');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    test('should reject IoA content missing specific required sections', () => {
      // Missing "Contested Facts" section
      const missingContested = '# Island of Agreements\n\n## Agreed Facts\n- Fact 1\n\n## Convergent Norms\n- Norm 1\n\n## Divergent Norms\n- Norm 2';
      
      const result1 = changeIoA(missingContested) as any;
      expect(result1.success).toBe(false);
      expect(result1.message).toContain('Missing required section: ## Contested Facts');
      
      // Missing "Divergent Norms" section
      const missingDivergent = '# Island of Agreements\n\n## Contested Facts\n- Fact 1\n\n## Agreed Facts\n- Fact 2\n\n## Convergent Norms\n- Norm 1';
      
      const result2 = changeIoA(missingDivergent) as any;
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('Missing required section: ## Divergent Norms');
    });
    
    test('should reject IoA content with insufficient sections', () => {
      // Not enough sections
      const insufficientSections = '# Island of Agreements\n\n## Contested Facts\n- Fact 1';
      
      const result = changeIoA(insufficientSections) as any;
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required section');
    });
  });

  describe('changeIceberg', () => {
    test('should validate and update Iceberg content', () => {
      const validIceberg = 'Party 1\nPositions\n- New position\n\nInterests\n- New interest\n\nNeeds\n- New need\n\nReasoning\n- New reasoning\n\nValues\n- New value\n\nIdentity\n- New identity\n\nParty 2\nPositions\n- Position 2\n\nInterests\n- Interest 2\n\nNeeds\n- Need 2\n\nReasoning\n- Reasoning 2\n\nValues\n- Value 2\n\nIdentity\n- Identity 2';
      
      const result = changeIceberg(validIceberg) as any;
      
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/updateIceberg',
        payload: validIceberg
      }));
    });

    test('should reject invalid Iceberg content', () => {
      const invalidIceberg = 'Missing sections and parties';
      
      const result = changeIceberg(invalidIceberg) as any;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Content must include sections for Party 1 and Party 2');
      expect(store.dispatch).not.toHaveBeenCalled();
    });

    test('should accept Iceberg content with valid structure but without Shared section', () => {
      const validIcebergNoShared = 'Party 1\nPositions\n- Position 1\n\nInterests\n- Interest 1\n\nNeeds\n- Need 1\n\nReasoning\n- Reasoning 1\n\nValues\n- Value 1\n\nIdentity\n- Identity 1\n\nParty 2\nPositions\n- Position 2\n\nInterests\n- Interest 2\n\nNeeds\n- Need 2\n\nReasoning\n- Reasoning 2\n\nValues\n- Value 2\n\nIdentity\n- Identity 2';
      
      const result = changeIceberg(validIcebergNoShared) as any;
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/updateIceberg',
        payload: validIcebergNoShared
      }));
    });
    
    test('should reject Iceberg content missing required sections', () => {
      // Missing Values section
      const missingValuesSection = 'Party 1\nPositions\n- New position\n\nInterests\n- New interest\n\nNeeds\n- New need\n\nReasoning\n- New reasoning\n\nIdentity\n- New identity\n\nParty 2\nPositions\n- Position 2\n\nInterests\n- Interest 2\n\nNeeds\n- Need 2\n\nReasoning\n- Reasoning 2\n\nIdentity\n- Identity 2';
      
      const result = changeIceberg(missingValuesSection) as any;
      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing required sections: Values');
    });
  });

  describe('changeComponents', () => {
    test('should validate and update Components content', () => {
      const validComponents = '## Component 1\n\nDescription of component 1\n\n## Component 2\n\nDescription of component 2';
      
      const result = changeComponents(validComponents) as any;
      
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/updateComponents'
      }));
    });

    test('should reject invalid Components content', () => {
      const invalidComponents = 'No component headers';
      
      const result = changeComponents(invalidComponents) as any;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Content must have component headers');
      expect(store.dispatch).not.toHaveBeenCalled();
    });
    
    test('should reject Components content with missing descriptions', () => {
      // Component header without description
      const missingDescription = '## Component 1\n\n## Component 2\n\nThis one has a description';
      
      const result = changeComponents(missingDescription) as any;
      expect(result.success).toBe(false);
      expect(result.message).toContain('missing a name or description');
    });
    
    test('should handle components with complex content and formatting', () => {
      const complexComponents = '## Supply Chain Access\n\nEnsuring reliable access to medical supplies in conflict zones.\n\n## Security Protocols\n\nEstablishing security measures for medical staff and facilities.\n\n## Local Community Engagement\n\nBuilding relationships with local communities to facilitate operations.';
      
      const result = changeComponents(complexComponents) as any;
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalled();
    });
  });

  describe('changeBoundaries', () => {
    test('should validate and update Boundaries', () => {
      const validBoundaries = [
        {
          id: 'comp-1',
          name: 'Component 1',
          description: 'Description 1',
          redlineParty1: 'New Redline P1',
          bottomlineParty1: 'New Bottomline P1',
          redlineParty2: 'New Redline P2',
          bottomlineParty2: 'New Bottomline P2',
          priority: 2
        }
      ];
      
      const result = changeBoundaries(validBoundaries) as any;
      
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/updateComponents',
        payload: validBoundaries
      }));
    });

    test('should reject invalid Boundaries', () => {
      const invalidBoundaries = [
        {
          id: 'comp-1',
          name: 'Component 1',
          description: 'Description 1',
          // Missing redlineParty1
          bottomlineParty1: 'Bottomline P1',
          redlineParty2: 'Redline P2',
          bottomlineParty2: 'Bottomline P2',
          priority: 1
        }
      ];
      
      const result = changeBoundaries(invalidBoundaries as any) as any;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('missing redline or bottomline for Party 1');
      expect(store.dispatch).not.toHaveBeenCalled();
    });
    
    test('should reject boundaries with missing required fields', () => {
      // Missing description
      const missingDescription = [
        {
          id: 'comp-1',
          name: 'Component 1',
          description: '', // Empty description
          redlineParty1: 'Redline P1',
          bottomlineParty1: 'Bottomline P1',
          redlineParty2: 'Redline P2',
          bottomlineParty2: 'Bottomline P2',
          priority: 1
        }
      ];
      
      const result1 = changeBoundaries(missingDescription as any) as any;
      expect(result1.success).toBe(false);
      expect(result1.message).toContain('missing id, name, or description');
      
      // Invalid priority (non-numeric)
      const invalidPriority = [
        {
          id: 'comp-1',
          name: 'Component 1',
          description: 'Description 1',
          redlineParty1: 'Redline P1',
          bottomlineParty1: 'Bottomline P1',
          redlineParty2: 'Redline P2',
          bottomlineParty2: 'Bottomline P2',
          priority: 'high' // Should be a number
        }
      ];
      
      const result2 = changeBoundaries(invalidPriority as any) as any;
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('invalid priority');
    });
    
    test('should reject empty components array', () => {
      const emptyArray: any[] = [];
      
      const result = changeBoundaries(emptyArray) as any;
      expect(result.success).toBe(false);
      expect(result.message).toContain('Components must be a non-empty array');
    });
  });

  describe('changeScenarios', () => {
    test('should validate and update Scenarios', () => {
      const validScenarios = [
        {
          id: 'scen-1',
          componentId: 'comp-1',
          type: 'agreement_area' as const,
          description: 'New scenario description'
        },
        {
          id: 'scen-2',
          componentId: 'comp-1',
          type: 'redline_violated_p1' as const,
          description: 'Redline violation scenario'
        }
      ];
      
      const result = changeScenarios(validScenarios) as any;
      
      expect(result.success).toBe(true);
      expect(store.dispatch).toHaveBeenCalledWith(expect.objectContaining({
        type: 'negotiation/setScenarios',
        payload: validScenarios
      }));
    });

    test('should reject invalid Scenarios', () => {
      const invalidScenarios = [
        {
          id: 'scen-1',
          componentId: 'comp-1',
          type: 'invalid_type',
          description: 'Invalid scenario type'
        }
      ];
      
      const result = changeScenarios(invalidScenarios as any) as any;
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid type');
      expect(store.dispatch).not.toHaveBeenCalled();
    });
    
    test('should validate all valid scenario types', () => {
      const allScenarioTypes = [
        {
          id: 'scen-1',
          componentId: 'comp-1',
          type: 'redline_violated_p1' as const,
          description: 'P1 redline violated'
        },
        {
          id: 'scen-2',
          componentId: 'comp-1',
          type: 'bottomline_violated_p1' as const,
          description: 'P1 bottomline violated'
        },
        {
          id: 'scen-3',
          componentId: 'comp-1',
          type: 'agreement_area' as const,
          description: 'Agreement area'
        },
        {
          id: 'scen-4',
          componentId: 'comp-1',
          type: 'bottomline_violated_p2' as const,
          description: 'P2 bottomline violated'
        },
        {
          id: 'scen-5',
          componentId: 'comp-1',
          type: 'redline_violated_p2' as const,
          description: 'P2 redline violated'
        }
      ];
      
      const result = changeScenarios(allScenarioTypes) as any;
      expect(result.success).toBe(true);
    });
    
    test('should reject scenarios with missing required fields', () => {
      // Missing description
      const missingDescription = [
        {
          id: 'scen-1',
          componentId: 'comp-1',
          type: 'agreement_area' as const,
          description: '' // Empty description
        }
      ];
      
      const result1 = changeScenarios(missingDescription as any) as any;
      expect(result1.success).toBe(false);
      expect(result1.message).toContain('missing id, componentId, or description');
      
      // Missing componentId
      const missingComponentId = [
        {
          id: 'scen-1',
          componentId: '', // Empty componentId
          type: 'agreement_area' as const,
          description: 'Valid description'
        }
      ];
      
      const result2 = changeScenarios(missingComponentId as any) as any;
      expect(result2.success).toBe(false);
      expect(result2.message).toContain('missing id, componentId, or description');
    });
  });
}); 