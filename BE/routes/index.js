'use strict';

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const adminRoutes = require('./admin.routes');
const clinicalRoutes = require('./clinical.routes');
const patientRoutes = require('./patient.routes');
const agentRoutes = require('./agent.routes');
const governanceRoutes = require('./governance.routes');
const webhookRoutes = require('./webhook.routes');

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'Higea Clinical SaaS API',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/clinical', clinicalRoutes);
router.use('/patient', patientRoutes);
router.use('/agents', agentRoutes);
router.use('/governance', governanceRoutes);
router.use('/webhooks', webhookRoutes);

module.exports = router;
