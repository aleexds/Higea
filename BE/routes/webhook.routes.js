'use strict';

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { validateBody } = require('../middlewares/validate.middleware');

router.post(
  '/n8n/onboarding',
  validateBody({
    user_id: { required: true, type: 'number' },
  }),
  webhookController.n8nOnboarding
);

router.post('/n8n/sync-bccr', webhookController.n8nSyncBccr);

router.post(
  '/n8n/data-deletion',
  validateBody({
    deletion_request_id: { required: true, type: 'number' },
  }),
  webhookController.n8nDataDeletion
);

module.exports = router;
