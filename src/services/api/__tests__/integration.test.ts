/**
 * Real integration tests that call the actual LLM
 * These tests will use your configured API keys and make real API calls
 */
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables from .env file BEFORE any imports
dotenv.config();

// Check which API keys are available
const hasOpenAIKey = process.env.VITE_OPENAI_API_KEY && process.env.VITE_OPENAI_API_KEY !== 'your_openai_api_key_here';
const hasGeminiKey = process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY !== 'your_gemini_api_key_here';

console.log('Integration Test Environment:');
console.log('- OpenAI Key available:', hasOpenAIKey);
console.log('- Gemini Key available:', hasGeminiKey);

// Mock the config module to use process.env
jest.mock('../config', () => {
  const geminiKey = process.env.VITE_GEMINI_API_KEY || '';
  const openaiKey = process.env.VITE_OPENAI_API_KEY || '';
  
  let geminiModel = null;
  if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
    const GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
    const genAI = new GoogleGenerativeAI(geminiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }
  
  return {
    PROCESSING_MODEL: 'gemini-pro',
    GEMINI_MODEL_NAME: 'gemini-pro', 
    OPENAI_API_KEY: openaiKey,
    GEMINI_API_KEY: geminiKey,
    geminiModel
  };
});

// Import after mocking
import { callLanguageModel } from '../promptHandler';

const skipMessage = 'Skipping - No API keys configured. Set VITE_OPENAI_API_KEY or VITE_GEMINI_API_KEY in .env file.';

describe('Integration Tests with Real LLM', () => {
  // Increase timeout for real API calls
  jest.setTimeout(30000);

  describe('Real Iceberg Analysis', () => {
    test('should handle iceberg analysis with quotes in response', async () => {
      if (!hasOpenAIKey && !hasGeminiKey) {
        console.log(skipMessage);
        return;
      }

      console.log('\n🚀 Making REAL API call to LLM...');
      
      const result = await callLanguageModel('iceberg.txt', {
        caseContent: 'Food Without Borders (FWB) is negotiating with camp authorities about distributing food aid to refugees. The camp commander wants FWB to hire local guards who are militia members, and wants them paid in food rations. FWB believes in neutrality and wants to ensure aid reaches only refugees.',
        party1Name: 'Food Without Borders (FWB)',
        party2Name: 'Camp Authorities'
      });

      // Verify we got a valid response
      expect(result).toBeDefined();
      expect(result.iceberg).toBeDefined();
      expect(typeof result.iceberg).toBe('string');
      
      // Check that it contains expected content
      expect(result.iceberg).toContain('Iceberg Analysis');
      expect(result.iceberg).toContain('Party 1');
      expect(result.iceberg).toContain('Party 2');
      
      // Most importantly: verify that any quotes in the response were handled correctly
      // The response should be valid markdown, not broken JSON
      console.log('✅ Iceberg response received, length:', result.iceberg.length);
      console.log('First 200 chars:', result.iceberg.substring(0, 200));
    });

    test('should handle identify parties with organization names containing quotes', async () => {
      if (!hasOpenAIKey && !hasGeminiKey) {
        console.log(skipMessage);
        return;
      }

      console.log('\n🚀 Testing party identification with quoted names...');
      
      const result = await callLanguageModel('identifyParties.txt', {
        caseContent: 'The "Red Cross" organization is negotiating with the local "People\'s Defense Force" about access to conflict zones.'
      });

      expect(result).toBeDefined();
      expect(result.parties).toBeDefined();
      expect(Array.isArray(result.parties)).toBe(true);
      
      // Check that organization names with quotes are handled
      const parties = result.parties;
      console.log('✅ Identified', parties.length, 'parties');
      console.log('Parties:', JSON.stringify(parties, null, 2));
      
      // Should have at least 2 parties
      expect(parties.length).toBeGreaterThanOrEqual(2);
    });

    test('should fix malformed JSON if LLM returns unescaped quotes', async () => {
      if (!hasOpenAIKey && !hasGeminiKey) {
        console.log(skipMessage);
        return;
      }

      console.log('\n🚀 Testing scenario generation (likely to have quotes)...');
      
      // This tests our JSON fixing logic with real responses
      const result = await callLanguageModel('scenarios.txt', {
        componentId: 'test-123',
        componentName: 'Guard Employment',
        componentDescription: 'Whether to hire local guards for food distribution',
        redlineParty1: 'No militia members as guards',
        bottomlineParty1: 'Limited guard presence with vetting',
        redlineParty2: 'Only militia members as guards',  
        bottomlineParty2: 'Some militia members as guards',
        party1Name: 'FWB',
        party2Name: 'Camp Authorities'
      });

      expect(result).toBeDefined();
      expect(result.scenarios).toBeDefined();
      expect(Array.isArray(result.scenarios)).toBe(true);
      
      // Check that scenarios were generated
      console.log(`✅ Generated ${result.scenarios.length} scenarios`);
      result.scenarios.forEach((scenario: any, index: number) => {
        console.log(`Scenario ${index + 1}: ${scenario.type}`);
        console.log(`  Description (first 100 chars): ${scenario.description.substring(0, 100)}...`);
        expect(scenario.id).toBeDefined();
        expect(scenario.description).toBeDefined();
        expect(scenario.type).toBeDefined();
      });
    });
  });

  // Test with a prompt that's likely to contain quotes
  describe('Quote handling stress test', () => {
    test('should handle complex nested quotes', async () => {
      if (!hasOpenAIKey && !hasGeminiKey) {
        console.log(skipMessage);
        return;
      }

      console.log('\n🚀 Stress testing with complex quotes...');
      
      const complexInput = {
        caseContent: `
          The organization known as "Hope for Tomorrow" stated: "We believe in 'peace through dialogue' and won't accept any deal that compromises our core principle of 'do no harm'."
          
          Their counterpart, the "Local Authority", responded: "Your so-called 'principles' are just excuses. We need real action."
        `,
        party1Name: '"Hope for Tomorrow"',
        party2Name: '"Local Authority"'
      };

      // This should stress-test our quote handling
      const result = await callLanguageModel('iceberg.txt', complexInput);
      
      expect(result).toBeDefined();
      expect(result.iceberg).toBeDefined();
      
      // The response should be valid despite all the quotes
      console.log('✅ Handled complex quotes successfully');
      console.log('Response length:', result.iceberg.length);
    });
  });
});

// Add a helper to check if we're in CI environment
if (process.env.CI) {
  console.log('Running in CI environment - integration tests will be skipped if no API keys are set');
}