import OpenAI from 'openai';
import 'server-only';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface OptimizationResult {
  optimizedPrompt: string;
  suggestions: string[];
  score: {
    clarity: number;
    specificity: number;
    effectiveness: number;
    overall: number;
  };
}

export async function optimizePrompt(
  prompt: string,
  model: string = 'gpt-4'
): Promise<OptimizationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert prompt engineer. Analyze the given prompt and provide:
1. An optimized version that is clearer, more specific, and more effective
2. A list of specific suggestions for improvement
3. Scores (0-100) for clarity, specificity, effectiveness, and overall quality

Return your response in this exact JSON format:
{
  "optimizedPrompt": "The improved prompt text",
  "suggestions": ["Suggestion 1", "Suggestion 2", ...],
  "score": {
    "clarity": 85,
    "specificity": 90,
    "effectiveness": 88,
    "overall": 88
  }
}`
        },
        {
          role: 'user',
          content: `Please optimize this ${model} prompt:\n\n${prompt}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      optimizedPrompt: result.optimizedPrompt || prompt,
      suggestions: result.suggestions || [],
      score: result.score || {
        clarity: 0,
        specificity: 0,
        effectiveness: 0,
        overall: 0
      }
    };
  } catch (error) {
    console.error('OpenAI optimization error:', error);
    throw new Error('Failed to optimize prompt');
  }
}

export async function evaluatePrompt(
  prompt: string,
  testInputs: string[] = []
): Promise<{
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  examples: string[];
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert prompt evaluator. Analyze the prompt and provide:
1. Strengths of the prompt
2. Weaknesses or potential issues
3. Specific improvements
4. Example outputs the prompt might generate

Return your response in this exact JSON format:
{
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Weakness 1", "Weakness 2", ...],
  "improvements": ["Improvement 1", "Improvement 2", ...],
  "examples": ["Example output 1", "Example output 2", ...]
}`
        },
        {
          role: 'user',
          content: `Evaluate this prompt:\n\n${prompt}${
            testInputs.length > 0 
              ? `\n\nTest inputs:\n${testInputs.join('\n')}` 
              : ''
          }`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      strengths: result.strengths || [],
      weaknesses: result.weaknesses || [],
      improvements: result.improvements || [],
      examples: result.examples || []
    };
  } catch (error) {
    console.error('OpenAI evaluation error:', error);
    throw new Error('Failed to evaluate prompt');
  }
}

export async function generatePromptVariants(
  prompt: string,
  count: number = 3
): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Generate ${count} variations of the given prompt. Each variant should:
- Maintain the core intent
- Use different phrasing or structure
- Potentially improve clarity or effectiveness

Return your response in this exact JSON format:
{
  "variants": ["Variant 1", "Variant 2", ...]
}`
        },
        {
          role: 'user',
          content: `Generate ${count} variants of this prompt:\n\n${prompt}`
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result.variants || [];
  } catch (error) {
    console.error('OpenAI variant generation error:', error);
    throw new Error('Failed to generate prompt variants');
  }
}