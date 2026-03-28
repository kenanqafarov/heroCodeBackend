import { Request, Response } from 'express';
import User, { IUser, KnowledgeProfile } from '../models/User';
import Module from '../models/Module';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  generatePersonalizedModule,
  generatePreQuiz,
  generateAdaptiveUnit
} from '../services/gemini.service';

/**
 * GET /api/lesson-modules
 * Get all available modules and user's progress
 */
export const getLessonModules = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Get modules from database (admin-created) and built-in modules
    const dbModules = await Module.find().select('_id title language difficulty description tags').lean();
    
    // Combine with built-in modules
    const builtInModules = [
      { id: 'javascript-basics', _id: 'javascript-basics', title: 'JavaScript Fundamentals', difficulty: 'beginner', estimatedTime: 60, language: 'JavaScript' },
      { id: 'react-basics', _id: 'react-basics', title: 'React Essentials', difficulty: 'intermediate', estimatedTime: 90, language: 'JavaScript' },
      { id: 'typescript-advanced', _id: 'typescript-advanced', title: 'TypeScript Mastery', difficulty: 'advanced', estimatedTime: 120, language: 'TypeScript' },
      { id: 'node-backend', _id: 'node-backend', title: 'Node.js Backend Development', difficulty: 'intermediate', estimatedTime: 100, language: 'JavaScript' },
      { id: 'web-performance', _id: 'web-performance', title: 'Web Performance Optimization', difficulty: 'advanced', estimatedTime: 80, language: 'JavaScript' },
      { id: 'database-design', _id: 'database-design', title: 'Database Design & SQL', difficulty: 'intermediate', estimatedTime: 90, language: 'SQL' },
      { id: 'web3-intro', _id: 'web3-intro', title: 'Web3 & Smart Contracts', difficulty: 'advanced', estimatedTime: 110, language: 'Solidity' },
    ];

    // Merge database modules with built-in ones
    const allModules = [
      ...dbModules.map(mod => ({
        id: (mod as any)._id.toString(),
        _id: (mod as any)._id.toString(),
        title: (mod as any).title,
        difficulty: (mod as any).difficulty,
        language: (mod as any).language,
        description: (mod as any).description,
        isCustom: true
      })),
      ...builtInModules
    ];

    const moduleProgressMap = user.moduleProgress as unknown as Map<string, any>;

    const modulesList = allModules.map((mod: any) => {
      const progress = moduleProgressMap?.get(mod.id || mod._id);
      const moduleId = mod.id || mod._id;
      
      return {
        id: moduleId,
        title: mod.title,
        difficulty: mod.difficulty,
        language: mod.language || 'JavaScript',
        description: mod.description || '',
        isLocked: !user.unlockedModules.includes(moduleId),
        isCustom: mod.isCustom || false,
        progress: progress
          ? Math.round((progress.unitsCompleted.length / 5) * 100)
          : 0,
        userStats: progress
          ? {
            bestScore: 0,
            attempts: progress.unitsCompleted.length || 0,
            timeSpent: progress.timeSpent || 0
          }
          : undefined
      };
    });

    res.json({
      success: true,
      data: {
        availableModules: modulesList,
        unlockedModules: user.unlockedModules,
        totalLessonXP: user.totalLessonXP || 0,
        moduleProgress: Object.fromEntries((moduleProgressMap as Map<string, any>)?.entries() || [])
      }
    });
  } catch (error: any) {
    console.error('Error fetching lesson modules:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/lesson-modules/:moduleId/start
 * Start a module - generate pre-quiz
 */
export const startModule = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Auto-unlock module if not already unlocked
    if (!user.unlockedModules.includes(moduleId)) {
      user.unlockedModules.push(moduleId);
    }

    const knowledgeProfileMap = user.knowledgeProfile as unknown as Map<string, any>;

    // Initialize knowledge profile if doesn't exist
    if (!knowledgeProfileMap.has(moduleId)) {
      knowledgeProfileMap.set(moduleId, {
        knownTopics: [],
        weakTopics: [],
        lastQuizScore: 0,
        adaptationData: {
          preferredPace: 'medium' as const,
          learningStyle: 'interactive' as const,
          difficultyMultiplier: 1,
          mistakesCount: 0
        }
      });
    }

    // Generate pre-quiz using Gemini
    let preQuiz;
    try {
      preQuiz = await generatePreQuiz(moduleId, user.skillLevel || 'beginner');
    } catch (error) {
      console.warn('Gemini generation failed, using fallback quiz');
      preQuiz = generateFallbackPreQuiz(moduleId);
    }

    // Save user
    await user.save();

    // Create session ID
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    res.json({
      success: true,
      data: {
        preQuiz,
        sessionId,
        knowledgeProfile: knowledgeProfileMap.get(moduleId)
      }
    });
  } catch (error: any) {
    console.error('Error starting module:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/lesson-modules/:moduleId/pre-quiz-submit
 * Submit pre-quiz answers and get personalized module
 */
export const submitPreQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { answers = {} } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    let score = 0;
    const weakTopics: string[] = [];

    // Only score if answers provided
    if (Object.keys(answers).length > 0) {
      try {
        const preQuiz = await generatePreQuiz(moduleId, user.skillLevel || 'beginner');
        preQuiz.questions.forEach((q: any) => {
          if (answers[q.id] === q.correctAnswer) {
            score += 100 / preQuiz.questions.length;
          } else {
            if (q.topic) weakTopics.push(q.topic);
          }
        });
      } catch (quizError) {
        console.warn('Failed to score pre-quiz:', quizError);
        // Continue with default score
      }
    }

    const knowledgeProfileMap = user.knowledgeProfile as unknown as Map<string, any>;

    // Update knowledge profile
    const knowledgeProfile = knowledgeProfileMap.get(moduleId) || {
      knownTopics: [],
      weakTopics: [],
      lastQuizScore: 0,
      adaptationData: {
        preferredPace: 'medium' as const,
        learningStyle: 'interactive' as const,
        difficultyMultiplier: 1,
        mistakesCount: 0
      }
    };

    knowledgeProfile.lastQuizScore = Math.round(score);
    knowledgeProfile.weakTopics = [...new Set(weakTopics)];
    knowledgeProfileMap.set(moduleId, knowledgeProfile);

    // Try to fetch module from database first (admin-created modules)
    let module = await fetchModuleFromDatabase(moduleId);

    // If not found in database, generate personalized module
    if (!module) {
      try {
        module = await generatePersonalizedModule(
          moduleId,
          knowledgeProfile,
          user.skillLevel || 'beginner'
        );
      } catch (error) {
        console.warn('Personalized module generation failed, using fallback:', error);
        module = generateFallbackModule(moduleId);
      }
    }

    // Ensure module has valid structure - always set to fallback if invalid
    if (!module || !module.units || module.units.length === 0) {
      module = generateFallbackModule(moduleId);
    }

    // Ensure module is never null at this point
    if (!module) {
      module = generateFallbackModule(moduleId);
    }

    const moduleProgressMap = user.moduleProgress as unknown as Map<string, any>;

    // Initialize module progress
    moduleProgressMap.set(moduleId, {
      currentUnit: 0,
      unitsCompleted: [],
      totalXP: 0,
      stars: new Map(),
      timeSpent: 0
    });

    await user.save();

    res.json({
      success: true,
      data: {
        preQuizScore: Math.round(score),
        module,
        firstUnit: module.units[0],
        knowledgeProfile
      }
    });
  } catch (error: any) {
    console.error('Error submitting pre-quiz:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/lesson-modules/:moduleId/unit/:unitId/quiz-submit
 * Submit quiz for a unit and get next unit or battle
 */
export const submitUnitQuiz = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId, unitId } = req.params;
    const { answers, timeTaken } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Calculate score
    const score = calculateQuizScore(answers);
    const xpEarned = calculateXP(score, timeTaken);

    const moduleProgressMap = user.moduleProgress as unknown as Map<string, any>;

    // Update module progress
    const moduleProgress = moduleProgressMap.get(moduleId) || {
      currentUnit: 0,
      unitsCompleted: [],
      totalXP: 0,
      stars: new Map(),
      timeSpent: 0
    };

    moduleProgress.totalXP += xpEarned;
    moduleProgress.timeSpent += timeTaken;
    moduleProgress.unitsCompleted.push(Number(unitId));
    moduleProgress.currentUnit = Number(unitId) + 1;

    // Calculate stars (based on score and time)
    const starsEarned = calculateStars(score, timeTaken);
    moduleProgress.stars.set(Number(unitId), starsEarned);

    moduleProgressMap.set(moduleId, moduleProgress);
    user.totalLessonXP = (user.totalLessonXP || 0) + xpEarned;

    const knowledgeProfileMap = user.knowledgeProfile as unknown as Map<string, any>;

    // Update knowledge profile for adaptivity
    const knowledgeProfile = knowledgeProfileMap.get(moduleId);
    if (knowledgeProfile) {
      knowledgeProfile.lastQuizScore = score;
      if (score < 60) {
        knowledgeProfile.adaptationData.mistakesCount++;
      }
      knowledgeProfileMap.set(moduleId, knowledgeProfile);
    }

    // Generate next unit adaptively or prepare battle
    const isLevelEnd = (Number(unitId) + 1) % 3 === 0; // Battle every 3 units
    let nextUnit = null;

    if (!isLevelEnd) {
      try {
        nextUnit = await generateAdaptiveUnit(
          moduleId,
          Number(unitId) + 1,
          score,
          knowledgeProfile || {},
          user.skillLevel || 'beginner'
        );
      } catch (error) {
        console.warn('Gemini generation failed for next unit');
        nextUnit = generateFallbackUnit(Number(unitId) + 1);
      }
    }

    await user.save();

    res.json({
      success: true,
      data: {
        score,
        passed: score >= 70,
        xpEarned,
        starsEarned,
        nextUnit: !isLevelEnd ? nextUnit : null,
        battleTime: isLevelEnd,
        detailedFeedback: {
          correctAnswers: Math.round(score / 20),
          totalQuestions: 5,
          incorrectTopics: []
        }
      }
    });
  } catch (error: any) {
    console.error('Error submitting unit quiz:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/lesson-modules/:moduleId/battle/result
 * Submit battle result and advance or fail
 */
export const submitBattleResult = async (req: AuthRequest, res: Response) => {
  try {
    const { moduleId } = req.params;
    const { unitId, won, battleStats } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const moduleProgressMap = user.moduleProgress as unknown as Map<string, any>;
    const moduleProgress = moduleProgressMap.get(moduleId);
    if (!moduleProgress) return res.status(400).json({ success: false, message: 'Module not started' });

    if (!won) {
      // Battle lost - user can retry
      return res.json({
        success: true,
        data: {
          won: false,
          message: 'Battle lost. Review the previous units and try again!',
          starsEarned: 0,
          xpEarned: 0,
          canRetry: true
        }
      });
    }

    // Battle won
    const starsEarned = Math.min(3, Math.max(1, Math.round(battleStats.playerAccuracy / 33)));
    const xpEarned = 500 + (starsEarned * 100);

    moduleProgress.stars.set(unitId, starsEarned);
    moduleProgress.totalXP += xpEarned;
    user.totalLessonXP = (user.totalLessonXP || 0) + xpEarned;

    // Check if module is completed
    const isModuleComplete = moduleProgress.unitsCompleted.length >= 5;

    if (isModuleComplete) {
      moduleProgress.completedAt = new Date();
      // Unlock next module
      if (!user.unlockedModules.includes('next-module-id')) {
        user.unlockedModules.push('next-module-id');
      }
    }

    moduleProgressMap.set(moduleId, moduleProgress);
    await user.save();

    res.json({
      success: true,
      data: {
        won: true,
        starsEarned,
        xpEarned,
        moduleProgress,
        levelUp: user.totalLessonXP > 1000,
        moduleComplete: isModuleComplete,
        nextLevelUnlocked: isModuleComplete
      }
    });
  } catch (error: any) {
    console.error('Error submitting battle result:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============ HELPER FUNCTIONS ============

function calculateQuizScore(answers: { [key: string]: string }): number {
  const correctCount = Object.values(answers).filter(a => a === 'correct').length;
  return Math.round((correctCount / Object.keys(answers).length) * 100);
}

function calculateXP(score: number, timeTaken: number): number {
  const scoreXP = 50 + (score * 2);
  const timeBonus = Math.max(0, 300 - (timeTaken / 1000)) * 0.5;
  return Math.round(scoreXP + timeBonus);
}

function calculateStars(score: number, timeTaken: number): number {
  if (score >= 90 && timeTaken < 600000) return 3;
  if (score >= 80) return 2;
  if (score >= 60) return 1;
  return 0;
}

// ============ MODULE CONVERSION FUNCTIONS ============

/**
 * Fetch module from MongoDB (created by admin) and convert to lesson format
 */
async function fetchModuleFromDatabase(moduleId: string) {
  try {
    // Try to find by MongoDB _id
    let module = await Module.findById(moduleId).lean();
    
    // If not found by _id, try to find by title or other identifier
    if (!module) {
      module = await Module.findOne({ 
        $or: [
          { title: new RegExp(moduleId, 'i') },
          { _id: moduleId }
        ]
      }).lean();
    }

    if (!module) return null;

    // Convert Module format to Lesson format
    return convertModuleToLesson(module);
  } catch (error) {
    console.error('Error fetching module from database:', error);
    return null;
  }
}

/**
 * Convert Module document to Lesson format
 */
function convertModuleToLesson(moduleDoc: any) {
  const units = [];
  
  // Create main unit with the module content
  const mainUnit = {
    unitId: 1,
    title: moduleDoc.title || 'Lesson Unit',
    difficulty: getDifficultyNumber(moduleDoc.difficulty),
    narrative: `You are learning ${moduleDoc.title}. This is an essential skill in ${moduleDoc.language}.`,
    theory: {
      title: moduleDoc.title,
      content: moduleDoc.content || '',
      keyPoints: extractKeyPoints(moduleDoc.content),
      codeExamples: extractCodeExamples(moduleDoc.content),
      analogies: `Learn ${moduleDoc.title} through practical examples and interactive challenges.`
    },
    interactiveContent: {
      type: 'code-challenge',
      description: `Complete the ${moduleDoc.title} challenge`
    },
    quiz: {
      questions: (moduleDoc.questions || []).map((q: any, idx: number) => ({
        id: `q${idx + 1}`,
        question: q.question,
        type: 'multiple-choice',
        options: q.options,
        correctAnswer: q.options[q.correctAnswer] || q.correctAnswer,
        explanation: q.explanation,
        difficulty: getDifficultyNumber(moduleDoc.difficulty)
      })),
      passingScore: 70,
      timeLimit: 600
    }
  };

  units.push(mainUnit);

  // Create additional unit from summary if needed
  if (moduleDoc.tags && moduleDoc.tags.length > 0) {
    const summaryUnit = {
      unitId: 2,
      title: `${moduleDoc.title} - Practice`,
      difficulty: getDifficultyNumber(moduleDoc.difficulty),
      narrative: `Now let's practice what you've learned about ${moduleDoc.title}!`,
      theory: {
        title: 'Practice & Review',
        content: `Key topics: ${moduleDoc.tags.join(', ')}`,
        keyPoints: moduleDoc.tags,
        codeExamples: [],
        analogies: 'Apply your knowledge in real-world scenarios'
      },
      interactiveContent: {
        type: 'practice-exercise',
        description: 'Solve real-world problems'
      },
      quiz: {
        questions: (moduleDoc.questions || []).map((q: any, idx: number) => ({
          id: `practice_q${idx + 1}`,
          question: `Practice: ${q.question}`,
          type: 'multiple-choice',
          options: q.options,
          correctAnswer: q.options[q.correctAnswer] || q.correctAnswer,
          explanation: q.explanation,
          difficulty: getDifficultyNumber(moduleDoc.difficulty)
        })),
        passingScore: 75,
        timeLimit: 900
      }
    };
    units.push(summaryUnit);
  }

  return {
    moduleId: moduleDoc._id?.toString() || moduleDoc.id,
    title: moduleDoc.title,
    language: moduleDoc.language,
    difficulty: moduleDoc.difficulty,
    totalUnits: units.length,
    units,
    battleInfo: {
      enemyName: `${moduleDoc.title} Master`,
      enemyDescription: `A skilled expert in ${moduleDoc.title} who will test your knowledge`
    }
  };
}

/**
 * Extract key points from content (markdown/HTML)
 */
function extractKeyPoints(content: string): string[] {
  if (!content) return [];
  
  const lines = content.split('\n');
  const keyPoints: string[] = [];
  
  lines.forEach(line => {
    // Extract headers (##, ###) and bullet points
    if (line.match(/^#+\s/) || line.match(/^-\s/) || line.match(/^\*/)) {
      const cleaned = line.replace(/^#+\s|^-\s|^\*\s/, '').trim();
      if (cleaned && !cleaned.startsWith('http') && keyPoints.length < 5) {
        keyPoints.push(cleaned);
      }
    }
  });

  return keyPoints.length > 0 ? keyPoints : ['Core concepts', 'Practical application', 'Best practices'];
}

/**
 * Extract code examples from content
 */
function extractCodeExamples(content: string): string[] {
  if (!content) return [];
  
  const codeBlocks: string[] = [];
  const regex = /```[\s\S]*?```/g;
  const matches = content.match(regex);
  
  return matches ? matches.slice(0, 3) : [];
}

/**
 * Convert difficulty string to number
 */
function getDifficultyNumber(difficulty: string): number {
  const map: { [key: string]: number } = {
    'beginner': 1,
    'intermediate': 5,
    'advanced': 9
  };
  return map[difficulty?.toLowerCase()] || 5;
}

// Fallback functions when Gemini fails
function generateFallbackPreQuiz(moduleId: string) {
  return {
    quizId: `pre-quiz-${moduleId}`,
    title: `Knowledge Assessment: ${moduleId}`,
    questions: [
      {
        id: 'pq1',
        question: 'What is your experience level with this topic?',
        type: 'multiple-choice',
        options: ['No experience', 'Some basics', 'Intermediate', 'Advanced'],
        correctAnswer: 'No experience',
        explanation: 'This helps us customize your learning path',
        difficulty: 1
      }
    ],
    passingScore: 50,
    timeLimit: 300
  };
}

function generateFallbackModule(moduleId: string) {
  return {
    moduleId,
    title: `Learn ${moduleId}`,
    language: 'JavaScript',
    difficulty: 'intermediate',
    totalUnits: 5,
    units: Array.from({ length: 5 }, (_, i) => generateFallbackUnit(i + 1)),
    battleInfo: {
      enemyName: 'Code Guardian',
      enemyDescription: 'A mighty guardian of knowledge'
    }
  };
}

function generateFallbackUnit(unitId: number) {
  return {
    unitId,
    title: `Unit ${unitId}`,
    difficulty: 5,
    narrative: `You begin your quest...`,
    theory: {
      title: 'Core Concept',
      content: 'Loading from server. This content is powered by AI personalization.',
      keyPoints: ['Point 1', 'Point 2'],
      codeExamples: ['example1'],
      analogies: 'Think of it like...'
    },
    interactiveContent: { type: 'visualization', description: 'Interactive element' },
    quiz: {
      questions: Array.from({ length: 3 }, (_, i) => ({
        id: `q${i + 1}`,
        question: 'Sample question?',
        type: 'multiple-choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: 'This is correct',
        difficulty: 5
      })),
      passingScore: 70,
      timeLimit: 600
    }
  };
}