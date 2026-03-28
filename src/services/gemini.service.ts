import { GoogleGenerativeAI } from '@google/generative-ai';
import { KnowledgeProfile } from '../models/User';


// Some changed
// ============================================
// SYSTEM PROMPT - This is the CRITICAL part
// ============================================
const generateModuleSystemPrompt = (
  moduleKey: string,
  knowledgeProfile: Partial<KnowledgeProfile>,
  userSkillLevel: string
): string => `You are an elite AI Tutor for HeroCode: The Logical Dungeon.

YOUR MISSION: Generate an INTENSELY PERSONALIZED, GAMIFIED learning module that is:
- ADAPTIVE: Adjust difficulty based on known/weak topics and learning style
- CINEMATIC: Make every unit feel like an epic quest with narrative progression
- INTERACTIVE: Include interactive challenges, mini-games, story elements
- ENGAGING: Use Web3/cyber-futuristic language, create immersion
- EDUCATIONAL: Deeply educational content that actually teaches concepts effectively

MODULE DETAILS:
- Topic/Language: "${moduleKey}"
- User Skill Level: "${userSkillLevel}"
- Known Topics: ${knowledgeProfile.knownTopics?.join(', ') || 'Basic concepts'}
- Weak Topics: ${knowledgeProfile.weakTopics?.join(', ') || 'All introductory concepts'}
- Learning Style: ${knowledgeProfile.adaptationData?.learningStyle || 'interactive'}
- Preferred Pace: ${knowledgeProfile.adaptationData?.preferredPace || 'medium'}
- Previous Score: ${knowledgeProfile.lastQuizScore || 'First attempt'}%

STRUCTURE (Return ONLY valid JSON, no markdown, no code blocks):
Generate a JSON object with:

{
  "moduleId": "unique-id",
  "title": "Epic Title",
  "description": "Engaging description",
  "totalUnits": 5-7,
  "estimatedTime": 45-90,
  "units": [
    {
      "unitId": 1,
      "title": "unit-title",
      "difficulty": 1-10,
      "narrative": "Story context/narrative element",
      "theory": {
        "title": "concept-title",
        "content": "Detailed explanation with examples",
        "keyPoints": ["point1", "point2"],
        "codeExamples": ["example1", "example2"],
        "analogies": "Relatable explanation"
      },
      "interactiveContent": {
        "type": "visualization|interactive-code|diagram|story",
        "description": "What to show/do",
        "data": {}
      },
      "quiz": {
        "questions": [
          {
            "id": "q1",
            "question": "question text",
            "type": "multiple-choice|true-false|code-complete",
            "options": ["a", "b", "c", "d"],
            "correctAnswer": "a",
            "explanation": "Why this is correct",
            "difficulty": 1-10
          }
        ],
        "passingScore": 70,
        "timeLimit": 600
      }
    }
  ],
  "battleInfo": {
    "enemyName": "Boss name based on topic",
    "enemyDescription": "Visual description",
    "winConditions": {
      "minAccuracy": 70,
      "minTimeBonus": 0.5,
      "starsPerLevel": 3
    }
  },
  "adaptationRules": {
    "increaseDifficultyIf": "Previous unit score > 85%",
    "decreaseDifficultyIf": "Previous unit score < 60%",
    "skipTopicIf": "User knows it (from profile)",
    "emphasizeIf": "User weak in this topic"
  }
}

RULES:
1. Return ONLY JSON - no markdown, code blocks, or explanations
2. Each unit must build on previous (adaptive difficulty)
3. Theory content must be 300-500 words, highly technical but clear
4. Include real code examples relevant to the language/framework
5. Quiz questions must be meaningful and challenging
6. Narrative elements create story progression (epic journey)
7. Interactive content descriptions should be implementable on frontend
8. Adapt EVERYTHING based on knowledgeProfile
9. Make unit 1 engaging with story hook
10. Make final unit epic with ultimate challenge`;

/**
 * Generates a personalized learning module using Gemini 2.5 Flash
 * based on the user's knowledge profile and learning preferences
 */
export async function generatePersonalizedModule(
  moduleKey: string,
  knowledgeProfile: Partial<KnowledgeProfile>,
  userSkillLevel: string
): Promise<any> {
  try {
    const apiKey: string = process.env.GEMINI_API_KEY ?? '';
    const modelName: string = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = generateModuleSystemPrompt(moduleKey, knowledgeProfile, userSkillLevel);

    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: systemPrompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 8000,
      }
    });

    const content = response.response.candidates?.[0]?.content?.parts?.[0];
    if (!content || !('text' in content)) {
      throw new Error('Invalid response from Gemini API');
    }

    // Parse JSON response (Gemini should return pure JSON)
    let moduleData = JSON.parse(content.text as string);

    // Ensure moduleId is set
    if (!moduleData.moduleId) {
      moduleData.moduleId = `${moduleKey}-${Date.now()}`;
    }

    // Validate and enrich the module data
    moduleData = enrichModuleData(moduleData, moduleKey);

    return moduleData;
  } catch (error) {
    console.error('Gemini module generation error:', error);
    throw new Error(`Failed to generate personalized module: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates a pre-quiz to assess user knowledge for a module
 * Returns 5-8 questions to establish baseline
 */
export async function generatePreQuiz(
  moduleKey: string,
  userSkillLevel: string
): Promise<any> {
  try {
    const apiKey: string = process.env.GEMINI_API_KEY ?? '';
    const modelName: string = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const systemPrompt = `You are an expert assessment AI for HeroCode: The Logical Dungeon.

Generate a pre-quiz to assess user knowledge about "${moduleKey}".
User skill level: "${userSkillLevel}"

Return ONLY valid JSON with NO markdown or explanation:
{
  "quizId": "pre-quiz-${moduleKey}",
  "title": "Knowledge Assessment: ${moduleKey}",
  "description": "Let's see what you already know!",
  "questions": [
    {
      "id": "pq1",
      "question": "question text",
      "type": "multiple-choice",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "option1",
      "explanation": "explanation",
      "difficulty": 1-5,
      "topic": "specific topic",
      "reasoning": "why this tests their knowledge"
    }
  ],
  "passingScore": 60,
  "timeLimit": 600
}

Generate 5-8 questions that:
1. Cover core concepts of ${moduleKey}
2. Test practical understanding, not just definitions
3. Have difficulty range 1-5 (basic to intermediate)
4. Include code-understanding questions if relevant
5. Have clear, unambiguous correct answers`;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 4000,
      }
    });

    const content = response.response.candidates?.[0]?.content?.parts?.[0];
    if (!content || !('text' in content)) {
      throw new Error('Invalid response from Gemini API');
    }

    const quizData = JSON.parse(content.text as string);
    return quizData;
  } catch (error) {
    console.error('Pre-quiz generation error:', error);
    throw new Error(`Failed to generate pre-quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generates the next unit dynamically based on previous answers
 * Adjusts difficulty and content based on performance
 */
export async function generateAdaptiveUnit(
  moduleKey: string,
  unitNumber: number,
  previousUnitScore: number,
  knowledgeProfile: Partial<KnowledgeProfile>,
  userSkillLevel: string
): Promise<any> {
  try {
    const apiKey: string = process.env.GEMINI_API_KEY ?? '';
    const modelName: string = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    const difficulty = calculateAdaptiveDifficulty(previousUnitScore, knowledgeProfile);

    const systemPrompt = `You are an adaptive learning AI for HeroCode: The Logical Dungeon.

Generate Unit #${unitNumber} for the "${moduleKey}" course.

PERFORMANCE DATA:
- Previous unit score: ${previousUnitScore}%
- Adjusted difficulty level: ${difficulty}/10
- User skill level: ${userSkillLevel}
- Weak topics to focus on: ${knowledgeProfile.weakTopics?.join(', ') || 'Standard coverage'}

Return ONLY valid JSON:
{
  "unitId": ${unitNumber},
  "title": "unit-title",
  "difficulty": ${difficulty},
  "narrative": "Story narrative element",
  "theory": {
    "title": "concept-title",
    "content": "200-400 words, focused and clear",
    "keyPoints": ["point1", "point2", "point3"],
    "codeExamples": ["example1", "example2"],
    "analogies": "relatable explanation"
  },
  "interactiveContent": {
    "type": "visualization|code-sandbox|interactive-quiz",
    "description": "Implementation description",
    "data": {}
  },
  "quiz": {
    "questions": [
      {
        "id": "q1",
        "question": "question",
        "type": "multiple-choice",
        "options": ["a", "b", "c", "d"],
        "correctAnswer": "a",
        "explanation": "explanation",
        "difficulty": ${difficulty}
      }
    ],
    "passingScore": 70,
    "timeLimit": 300
  }
}

Notes:
- If previous score > 85%, increase difficulty by 2 levels
- If previous score < 60%, decrease difficulty by 1 level
- If previous score 60-85%, keep same difficulty
- Make it engaging and story-driven`;

    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 5000,
      }
    });

    const content = response.response.candidates?.[0]?.content?.parts?.[0];
    if (!content || !('text' in content)) {
      throw new Error('Invalid response from Gemini API');
    }

    const unitData = JSON.parse(content.text as string);
    return unitData;
  } catch (error) {
    console.error('Adaptive unit generation error:', error);
    throw new Error(`Failed to generate adaptive unit: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Calculate adaptive difficulty based on performance and profile
 */
function calculateAdaptiveDifficulty(
  previousScore: number,
  knowledgeProfile: Partial<KnowledgeProfile>
): number {
  let baseDifficulty = 5;

  if (previousScore > 85) baseDifficulty += 2;
  else if (previousScore < 60) baseDifficulty -= 1;

  if (knowledgeProfile.adaptationData?.preferredPace === 'fast') baseDifficulty += 1;
  if (knowledgeProfile.adaptationData?.preferredPace === 'slow') baseDifficulty -= 1;

  return Math.max(1, Math.min(10, baseDifficulty));
}

/**
 * Helper: Enrich module data with defaults and calculated fields
 */
function enrichModuleData(moduleData: any, moduleKey: string): any {
  if (!moduleData.units) {
    moduleData.units = [];
  }

  moduleData.units = moduleData.units.map((unit: any, index: number) => ({
    unitId: unit.unitId || index + 1,
    title: unit.title || `Unit ${index + 1}`,
    difficulty: unit.difficulty || 5,
    narrative: unit.narrative || '',
    theory: {
      title: unit.theory?.title || 'Code Theory',
      content: unit.theory?.content || 'Content coming soon',
      keyPoints: unit.theory?.keyPoints || [],
      codeExamples: unit.theory?.codeExamples || [],
      analogies: unit.theory?.analogies || ''
    },
    interactiveContent: unit.interactiveContent || {
      type: 'visualization',
      description: 'Interactive learning element',
      data: {}
    },
    quiz: {
      questions: (unit.quiz?.questions || []).slice(0, 5).map((q: any) => ({
        id: q.id || `q${Math.random()}`,
        question: q.question || '',
        type: q.type || 'multiple-choice',
        options: q.options || [],
        correctAnswer: q.correctAnswer || 'a',
        explanation: q.explanation || '',
        difficulty: q.difficulty || 5
      })),
      passingScore: unit.quiz?.passingScore || 70,
      timeLimit: unit.quiz?.timeLimit || 600
    }
  }));

  return moduleData;
}

export const geminiService = {
  generatePersonalizedModule,
  generatePreQuiz,
  generateAdaptiveUnit,
};