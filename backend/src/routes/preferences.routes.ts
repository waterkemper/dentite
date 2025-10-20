import { Router } from 'express';
import { PreferencesController } from '../controllers/preferences.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const preferencesController = new PreferencesController();

// Get patient preferences
router.get('/patients/:patientId', authenticateToken, preferencesController.getPreferences);

// Update patient preferences
router.put('/patients/:patientId', authenticateToken, preferencesController.updatePreferences);

// Get all opted-out patients for practice
router.get('/opted-out', authenticateToken, preferencesController.getOptedOutPatients);

// Public unsubscribe endpoint (no auth)
router.get('/unsubscribe', preferencesController.unsubscribePage);

export default router;

