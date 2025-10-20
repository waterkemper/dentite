import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../lib/prisma';

export class OrthoController {
  // Payment Plans
  getPaymentPlans = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.query as { patientId?: string };
      const where: any = {};
      if (patientId) where.patientId = patientId;
      const plans = await (prisma as any).paymentPlan?.findMany?.({ where, orderBy: { createdAt: 'desc' } }) ?? [];
      res.json({ data: plans });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch payment plans' });
    }
  };

  createPaymentPlan = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const plan = await (prisma as any).paymentPlan?.create?.({ data: req.body });
      res.status(201).json({ data: plan });
    } catch (e) {
      res.status(400).json({ error: 'Failed to create payment plan' });
    }
  };

  // Treatment Phases
  getTreatmentPhases = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const phases = await (prisma as any).treatmentPhase?.findMany?.({
        where: { patientId },
        orderBy: [{ phaseNumber: 'asc' }, { startDate: 'asc' }],
      });
      res.json({ data: phases });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch treatment phases' });
    }
  };

  createTreatmentPhase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const phase = await (prisma as any).treatmentPhase?.create?.({ data: req.body });
      res.status(201).json({ data: phase });
    } catch (e) {
      res.status(400).json({ error: 'Failed to create treatment phase' });
    }
  };

  updateTreatmentPhase = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const phase = await (prisma as any).treatmentPhase?.update?.({ where: { id }, data: req.body });
      res.json({ data: phase });
    } catch (e) {
      res.status(400).json({ error: 'Failed to update treatment phase' });
    }
  };

  // Payment Transactions
  getPaymentTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { planId } = req.params;
      const txs = await (prisma as any).paymentTransaction?.findMany?.({ where: { paymentPlanId: planId }, orderBy: { paymentDate: 'desc' } }) ?? [];
      res.json({ data: txs });
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch payment transactions' });
    }
  };
}


