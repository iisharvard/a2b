import { z } from 'zod';

/**
 * Common schema for markdown content that might contain quotes
 * Includes validation and transformation
 */
const markdownContentSchema = z.string().transform((val) => {
  // Ensure proper escaping of quotes in markdown content
  return val;
});

/**
 * Schema for Iceberg Analysis response
 */
export const icebergResponseSchema = z.object({
  iceberg: markdownContentSchema
});

/**
 * Schema for Island of Agreement response
 */
export const ioaResponseSchema = z.object({
  ioa: markdownContentSchema
});

/**
 * Schema for individual component
 */
const componentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  redlineParty1: z.string(),
  bottomlineParty1: z.string(),
  redlineParty2: z.string(),
  bottomlineParty2: z.string()
});

/**
 * Schema for Components response
 */
export const componentsResponseSchema = z.object({
  components: z.array(componentSchema)
});

/**
 * Schema for Scenario
 */
const scenarioSchema = z.object({
  id: z.string(),
  componentId: z.string(),
  type: z.enum([
    'redline_violated_p1',
    'bottomline_violated_p1',
    'agreement_area',
    'bottomline_violated_p2',
    'redline_violated_p2'
  ]),
  description: z.string()
});

/**
 * Schema for Scenarios response
 */
export const scenariosResponseSchema = z.object({
  scenarios: z.array(scenarioSchema)
});

/**
 * Schema for Party identification
 */
const partySchema = z.object({
  name: z.string(),
  description: z.string(),
  isPrimary: z.boolean()
});

/**
 * Schema for Identify Parties response
 */
export const identifyPartiesResponseSchema = z.object({
  parties: z.array(partySchema)
});

/**
 * Schema for Change Summary response
 */
export const changeSummaryResponseSchema = z.object({
  summary: z.string()
});

/**
 * Schema for Tiered Issues response
 */
export const tieredIssuesResponseSchema = z.object({
  tiers: z.object({
    tier1: z.array(z.string()),
    tier2: z.array(z.string()),
    tier3: z.array(z.string())
  })
});

/**
 * Schema for Risk Assessment response
 */
export const riskAssessmentResponseSchema = z.object({
  risks: z.array(z.object({
    category: z.string(),
    description: z.string(),
    likelihood: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high'])
  }))
});

/**
 * Map of prompt files to their corresponding schemas
 */
export const promptSchemaMap: Record<string, z.ZodSchema> = {
  'iceberg.txt': icebergResponseSchema,
  'icebergWithShared.txt': icebergResponseSchema,
  'islandOfAgreement.txt': ioaResponseSchema,
  'redlinebottomlineRequirements.txt': componentsResponseSchema,
  'redlinebottomline.txt': componentsResponseSchema,
  'scenarios.txt': scenariosResponseSchema,
  'identifyParties.txt': identifyPartiesResponseSchema,
  'summarizeChanges.txt': changeSummaryResponseSchema,
  'tieredIssues.txt': tieredIssuesResponseSchema,
  'riskAssessment.txt': riskAssessmentResponseSchema
};

/**
 * Validate a response against its schema
 */
export function validateResponse(promptFile: string, response: any): any {
  const schema = promptSchemaMap[promptFile];
  if (!schema) {
    console.warn(`No schema defined for prompt: ${promptFile}`);
    return response;
  }

  try {
    return schema.parse(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Validation error for ${promptFile}:`, error.errors);
      throw new Error(`Invalid response format: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Type exports for use in other files
 */
export type IcebergResponse = z.infer<typeof icebergResponseSchema>;
export type IoAResponse = z.infer<typeof ioaResponseSchema>;
export type ComponentsResponse = z.infer<typeof componentsResponseSchema>;
export type ScenariosResponse = z.infer<typeof scenariosResponseSchema>;
export type IdentifyPartiesResponse = z.infer<typeof identifyPartiesResponseSchema>;
export type ChangeSummaryResponse = z.infer<typeof changeSummaryResponseSchema>;