import { Router } from 'express';
import { WebhooksController } from '../controllers/webhooks.controller';

const router = Router();
const webhooksController = new WebhooksController();

// SendGrid webhook for email events
router.post('/sendgrid', webhooksController.handleSendGridWebhook);

// Twilio webhook for SMS status callbacks
router.post('/twilio', webhooksController.handleTwilioWebhook);

// Twilio incoming message handler (for STOP keyword)
router.post('/twilio-incoming', webhooksController.handleTwilioIncoming);

// Basic placeholder for Ortho2Edge webhook receiver.
// TODO: Add signature verification based on APIM/Webhook API documentation.
router.post('/ortho2edge', async (req, res) => {
  try {
    // Ingest event with idempotency safeguards once spec is finalized
    res.status(202).json({ received: true });
  } catch (e) {
    res.status(400).json({ error: 'Invalid webhook' });
  }
});

export default router;


