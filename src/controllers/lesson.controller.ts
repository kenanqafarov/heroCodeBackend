import { Request, Response } from 'express';
import User, { IUser, KnowledgeProfile } from '../models/User';
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

    // Available modules in the system
    const availableModules = [
      { id: 'javascript-basics', title: 'JavaScript Fundamentals', difficulty: 'beginner', estimatedTime: 60 },
      { id: 'react-basics', title: 'React Essentials', difficulty: 'intermediate', estimatedTime: 90 },
      { id: 'typescript-advanced', title: 'TypeScript Mastery', difficulty: 'advanced', estimatedTime: 120 },
      { id: 'node-backend', title: 'Node.js Backend Development', difficulty: 'intermediate', estimatedTime: 100 },
      { id: 'web-performance', title: 'Web Performance Optimization', difficulty: 'advanced', estimatedTime: 80 },
      { id: 'database-design', title: 'Database Design & SQL', difficulty: 'intermediate', estimatedTime: 90 },
      { id: 'web3-intro', title: 'Web3 & Smart Contracts', difficulty: 'advanced', estimatedTime: 110 },
    ];

    const modulesList = availableModules.map(mod => ({
      ...mod,
      isLocked: !user.unlockedModules.includes(mod.id),
      progress: user.moduleProgress?.get(mod.id)
        ? Math.round((user.moduleProgress.get(mod.id)!.unitsCompleted.length / 5) * 100)
        : 0,
      userStats: user.moduleProgress?.get(mod.id)
        ? {
          bestScore: 0, // Would aggregate from quiz submissions
          attempts: user.moduleProgress.get(mod.id)!.unitsCompleted.length || 0,
          timeSpent: user.moduleProgress.get(mod.id)!.timeSpent || 0
        }
        : undefined
    }));

    res.json({
      success: true,
      data: {
        availableModules: modulesList,
        unlockedModules: user.unlockedModules,
        totalLessonXP: user.totalLessonXP || 0,
        moduleProgress: Object.fromEntries(user.moduleProgress || new Map())
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

    // Check if module is unlocked
    if (!user.unlockedModules.includes(moduleId)) {
      return res.status(403).json({ success: false, message: 'Module is locked' });
    }

    // Initialize knowledge profile if doesn't exist
    if (!user.knowledgeProfile.has(moduleId)) {
      user.knowledgeProfile.set(moduleId, {
        knownTopics: [],
        weakTopics: [],
        lastQuizScore: 0,
        adaptationData: {
          preferredPace: 'medium',
          learningStyle: 'interactive',
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
        knowledgeProfile: user.knowledgeProfile.get(moduleId)
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
    const { answers, sessionId } = req.body;

    const user = await User.findById(req.user!.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Calculate pre-quiz score
    const preQuiz = await generatePreQuiz(moduleId, user.skillLevel || 'beginner');
    let score = 0;
    const weakTopics: string[] = [];

    preQuiz.questions.forEach((q: any) => {
      if (answers[q.id] === q.correctAnswer) {
        score += 100 / preQuiz.questions.length;
      } else {
        if (q.topic) weakTopics.push(q.topic);
      }
    });

    // Update knowledge profile
    const knowledgeProfile = user.knowledgeProfile.get(moduleId) || {
      knownTopics: [],
      weakTopics: [],
      lastQuizScore: 0,
      adaptationData: {
        preferredPace: 'medium',
        learningStyle: 'interactive',
        difficultyMultiplier: 1,
        mistakesCount: 0
      }
    };

    knowledgeProfile.lastQuizScore = Math.round(score);
    knowledgeProfile.weakTopics = [...new Set(weakTopics)];
    user.knowledgeProfile.set(moduleId, knowledgeProfile);

    // Generate personalized module using Gemini
    let module;
    try {
      module = await generatePersonalizedModule(
        moduleId,
        knowledgeProfile,
        user.skillLevel || 'beginner'
      );
    } catch (error) {
      console.warn('Gemini generation failed, using fallback module');
      module = generateFallbackModule(moduleId);
    }

    // Initialize module progress
    user.moduleProgress.set(moduleId, {
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

    // Update module progress
    const moduleProgress = user.moduleProgress.get(moduleId) || {
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

    user.moduleProgress.set(moduleId, moduleProgress);
    user.totalLessonXP = (user.totalLessonXP || 0) + xpEarned;

    // Update knowledge profile for adaptivity
    const knowledgeProfile = user.knowledgeProfile.get(moduleId);
    if (knowledgeProfile) {
      knowledgeProfile.lastQuizScore = score;
      if (score < 60) {
        knowledgeProfile.adaptationData.mistakesCount++;
      }
      user.knowledgeProfile.set(moduleId, knowledgeProfile);
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
          correctAnswers: Math.round(score / 20), // Assuming 5 questions each worth 20%
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

    const moduleProgress = user.moduleProgress.get(moduleId);
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
    const isModuleComplete = moduleProgress.unitsCompleted.length >= 5; // Assuming 5-7 units

    if (isModuleComplete) {
      moduleProgress.completedAt = new Date();
      // Unlock next module
      if (!user.unlockedModules.includes('next-module-id')) {
        user.unlockedModules.push('next-module-id');
      }
    }

    user.moduleProgress.set(moduleId, moduleProgress);
    await user.save();

    res.json({
      success: true,
      data: {
        won: true,
        starsEarned,
        xpEarned,
        moduleProgress,
        levelUp: user.totalLessonXP > 1000, // Simple level up logic
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
  // Simplified - in production would verify against actual quiz
  const correctCount = Object.values(answers).filter(a => a === 'correct').length;
  return Math.round((correctCount / Object.keys(answers).length) * 100);
}

function calculateXP(score: number, timeTaken: number): number {
  // Base XP from score (50-250)
  const scoreXP = 50 + (score * 2);
  // Time bonus (faster = more XP)
  const timeBonus = Math.max(0, 300 - (timeTaken / 1000)) * 0.5;
  return Math.round(scoreXP + timeBonus);
}

function calculateStars(score: number, timeTaken: number): number {
  // 1 star: score >= 60
  // 2 stars: score >= 80
  // 3 stars: score >= 90 AND quick completion
  if (score >= 90 && timeTaken < 600000) return 3;
  if (score >= 80) return 2;
  if (score >= 60) return 1;
  return 0;
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
