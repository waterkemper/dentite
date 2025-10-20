import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { BenefitsEngine } from '../services/benefitsEngine';

export class BenefitsController {
  private benefitsEngine: BenefitsEngine;

  constructor() {
    this.benefitsEngine = new BenefitsEngine();
  }

  /**
   * Get patients with expiring benefits
   */
  getExpiringBenefits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { practiceId } = req.user!;
      const { days = 60, minAmount = 200 } = req.query;

      const expiringPatients = await this.benefitsEngine.getExpiringBenefits(
        practiceId,
        Number(days),
        Number(minAmount)
      );

      res.json({
        patients: expiringPatients,
        summary: {
          totalPatients: expiringPatients.length,
          totalValue: expiringPatients.reduce(
            (sum, p) => sum + p.remainingBenefits,
            0
          ),
        },
      });
    } catch (error) {
      console.error('Get expiring benefits error:', error);
      res.status(500).json({ error: 'Failed to fetch expiring benefits' });
    }
  };

  /**
   * Calculate benefits for specific patient
   */
  calculateBenefits = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { patientId } = req.params;
      const { practiceId } = req.user!;

      const benefits = await this.benefitsEngine.calculatePatientBenefits(
        patientId,
        practiceId
      );

      if (!benefits) {
        res.status(404).json({ error: 'Patient not found or no insurance data' });
        return;
      }

      res.json(benefits);
    } catch (error) {
      console.error('Calculate benefits error:', error);
      res.status(500).json({ error: 'Failed to calculate benefits' });
    }
  };
}

