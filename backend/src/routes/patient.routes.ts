import { Router } from 'express';
import { PatientController } from '../controllers/patient.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();
const patientController = new PatientController();

// All routes require authentication
router.use(authenticateToken);

/**
 * GET /api/patients
 * Get all patients with benefits data
 */
router.get('/', patientController.getPatients);

/**
 * GET /api/patients/:id
 * Get patient detail with full benefits breakdown
 */
router.get('/:id', patientController.getPatientById);

/**
 * POST /api/patients/sync
 * Trigger PMS sync (OpenDental or Ortho2Edge)
 */
router.post('/sync', patientController.syncFromPMS);

/**
 * Manual patient CRUD
 */
router.post('/', patientController.createPatient);
router.put('/:id', patientController.updatePatient);

export default router;

