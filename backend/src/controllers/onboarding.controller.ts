import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    practiceId: string;
  };
}

export const getOnboardingStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user?.practiceId;
    
    if (!practiceId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const practice = await prisma.practice.findUnique({
      where: { id: practiceId },
      select: {
        id: true,
        name: true,
        email: true,
        onboardingCompleted: true,
        onboardingStep: true,
        onboardingCompletedAt: true
      }
    });

    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }

    return res.json({
      onboardingCompleted: practice.onboardingCompleted || false,
      currentStep: practice.onboardingStep || 1,
      completedAt: practice.onboardingCompletedAt
    });
  } catch (error) {
    console.error('Error fetching onboarding status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOnboardingStep = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user?.practiceId;
    const { step, data } = req.body;
    
    if (!practiceId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingStep: step
      }
    });

    return res.json({
      success: true,
      currentStep: practice.onboardingStep
    });
  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const completeOnboarding = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user?.practiceId;
    
    if (!practiceId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingCompleted: true,
        onboardingCompletedAt: new Date()
      }
    });

    return res.json({
      success: true,
      onboardingCompleted: practice.onboardingCompleted,
      completedAt: practice.onboardingCompletedAt
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const restartOnboarding = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const practiceId = req.user?.practiceId;
    
    if (!practiceId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const practice = await prisma.practice.update({
      where: { id: practiceId },
      data: {
        onboardingCompleted: false,
        onboardingStep: 1,
        onboardingCompletedAt: null
      }
    });

    return res.json({
      success: true,
      onboardingCompleted: practice.onboardingCompleted,
      currentStep: practice.onboardingStep
    });
  } catch (error) {
    console.error('Error restarting onboarding:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
