/**
 * Utility functions for fixing malformed JSON from LLM responses
 */

export interface JsonFixResult {
  fixed: boolean;
  content: string;
  method?: 'state-machine' | 'regex' | 'none';
  quotesFixed?: number;
}

/**
 * Fix malformed JSON using a state machine approach
 * This is the primary method that intelligently tracks JSON structure
 */
export function fixJsonWithStateMachine(text: string): JsonFixResult {
  let fixed = '';
  let inString = false;
  let expectingValue = false;
  let depth = 0;
  let quotesFixed = 0;
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prevChar = i > 0 ? text[i - 1] : '';
    
    // Track depth to understand JSON structure
    if (!inString) {
      if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') depth--;
      else if (char === ':') expectingValue = true;
      else if (char === ',' || char === '}' || char === ']') expectingValue = false;
    }
    
    if (inString) {
      if (char === '\n') {
        fixed += '\\n';
        continue;
      }

      if (char === '\r') {
        fixed += '\\r';
        continue;
      }

      if (char === '\t') {
        fixed += '\\t';
        continue;
      }

      if (char === '\\') {
        const nextChar = text[i + 1];
        const validEscapes = '"\\/bfnrtu';
        if (!nextChar || !validEscapes.includes(nextChar.toLowerCase())) {
          fixed += '\\\\';
          continue;
        }
      }
    }

    if (char === '"' && prevChar !== '\\') {
      // Determine if this is a structural quote
      let isStructural = false;
      let afterQuote = '';
      
      if (!inString) {
        // Opening quote - check if it's starting a key or value
        const trimmedBefore = text.substring(Math.max(0, i - 10), i).trim();
        isStructural = 
          trimmedBefore.endsWith('{') || 
          trimmedBefore.endsWith(',') || 
          trimmedBefore.endsWith('[') ||
          trimmedBefore.endsWith(':') ||
          expectingValue;
      } else {
        // Closing quote - check what follows
        let j = i + 1;
        while (j < text.length && /\s/.test(text[j])) j++;
        afterQuote = j < text.length ? text[j] : '';
        isStructural = afterQuote === ':' || afterQuote === ',' || afterQuote === '}' || afterQuote === ']';
      }
      
      if (isStructural) {
        fixed += char;
        inString = !inString;
        if (!inString && afterQuote !== ':') expectingValue = false;
      } else if (inString) {
        // Quote inside a string value - escape it
        fixed += '\\"';
        quotesFixed++;
      } else {
        fixed += char;
      }
    } else {
      fixed += char;
    }
  }
  
  return {
    fixed: quotesFixed > 0,
    content: fixed,
    method: 'state-machine',
    quotesFixed
  };
}

/**
 * Fix malformed JSON using regex patterns
 * This is the fallback method for specific patterns
 */
export function fixJsonWithRegex(text: string): JsonFixResult {
  let regexFix = text;
  let fixed = false;
  
  // Simple approach: Find all JSON string values and escape quotes inside them
  // Match pattern: "key": "value" where value might contain unescaped quotes
  
  // First, let's handle the specific patterns from our test cases
  // Pattern for: "analysis": "A perception that those who "served their country" (militia) are more deserving"
  regexFix = regexFix.replace(
    /("analysis":\s*"[^"]*?)(\w+\s+)"([^"]+)"(\s+\([^"]*")/g,
    '$1$2\\"$3\\"$4'
  );
  
  // More general pattern: any value with word"word" pattern
  regexFix = regexFix.replace(
    /(:\s*"[^"]*?)(\w+)"(\w+)"([^"]*")/g,
    '$1$2\\"$3\\"$4'
  );
  
  // Even more general: any quotes inside a JSON string value
  // We need to be careful not to match across multiple values
  // Use a more specific pattern that respects JSON structure
  const jsonStringPattern = /(:\s*")((?:[^"\\]|\\.)*)(")/g;
  
  regexFix = regexFix.replace(jsonStringPattern, (match, prefix, content, suffix) => {
    // Check if content has unescaped quotes
    // We need to count quotes that aren't already escaped
    let hasUnescapedQuotes = false;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === '"' && (i === 0 || content[i-1] !== '\\')) {
        hasUnescapedQuotes = true;
        break;
      }
    }
    
    if (hasUnescapedQuotes) {
      // Escape unescaped quotes
      let fixedContent = '';
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '"' && (i === 0 || content[i-1] !== '\\')) {
          fixedContent += '\\"';
        } else {
          fixedContent += content[i];
        }
      }
      fixed = true;
      return prefix + fixedContent + suffix;
    }
    return match;
  });
  
  return {
    fixed,
    content: regexFix,
    method: 'regex'
  };
}

/**
 * Clean markdown code blocks from JSON response
 */
export function cleanMarkdownCodeBlocks(text: string): string {
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  if (cleaned.startsWith('```json') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(7, -3).trim();
  } else if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.slice(3, -3).trim();
  }
  
  return cleaned;
}

/**
 * Main function to fix malformed JSON
 * Tries multiple strategies in order of effectiveness
 */
export function fixMalformedJson(text: string, error?: SyntaxError): JsonFixResult {
  console.log('🔧 Attempting to fix malformed JSON...');
  
  if (error?.message) {
    console.log('Error details:', error.message);
  }
  
  // First, try state machine approach
  const stateMachineResult = fixJsonWithStateMachine(text);
  if (stateMachineResult.fixed) {
    try {
      JSON.parse(stateMachineResult.content);
      console.log(`✅ Fixed ${stateMachineResult.quotesFixed} quotes using state machine`);
      return stateMachineResult;
    } catch (e) {
      console.log('State machine fix failed to produce valid JSON, trying regex...');
    }
  }
  
  // Fallback to regex approach
  const regexResult = fixJsonWithRegex(text);
  try {
    JSON.parse(regexResult.content);
    console.log('✅ Fixed JSON using regex patterns');
    return regexResult;
  } catch (e) {
    console.log('Regex fix also failed');
  }
  
  // Return original if no fix worked
  return {
    fixed: false,
    content: text,
    method: 'none'
  };
}

/**
 * Analyze JSON error and provide context
 */
export function analyzeJsonError(text: string, error: SyntaxError): {
  position: number;
  context: string;
  char: string;
  before: string;
  after: string;
} | null {
  const match = error.message.match(/position (\d+)/);
  if (!match) return null;
  
  const position = parseInt(match[1]);
  const contextStart = Math.max(0, position - 100);
  const contextEnd = Math.min(text.length, position + 100);
  const errorContext = text.substring(contextStart, contextEnd);
  const relativePos = position - contextStart;
  
  return {
    position,
    context: errorContext.substring(0, relativePos) + '→' + errorContext.charAt(relativePos) + '←' + errorContext.substring(relativePos + 1),
    char: text.charAt(position),
    before: text.substring(Math.max(0, position - 20), position),
    after: text.substring(position, Math.min(text.length, position + 20))
  };
}
