import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { OrthoController } from '../controllers/ortho.controller';

const router = Router();
const controller = new OrthoController();

router.use(authenticateToken);

router.get('/payment-plans', controller.getPaymentPlans);
router.post('/payment-plans', controller.createPaymentPlan);

router.get('/treatment-phases/:patientId', controller.getTreatmentPhases);
router.post('/treatment-phases', controller.createTreatmentPhase);
router.put('/treatment-phases/:id', controller.updateTreatmentPhase);

router.get('/payment-transactions/:planId', controller.getPaymentTransactions);

export default router;


