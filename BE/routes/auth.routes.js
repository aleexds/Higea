'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validate.middleware');

router.post(
  '/register',
  validateBody({
    full_name: { required: true, type: 'string', minLength: 3, maxLength: 150 },
    email: { required: true, type: 'string', email: true, maxLength: 150 },
    password: { required: true, type: 'string', minLength: 8, maxLength: 100 },
    cedula: { required: false, type: 'string', cedula: true },
    phone: { required: false, type: 'string', minLength: 8, maxLength: 30 },
    accept_privacy: { required: true, type: 'boolean' },
    accept_terms: { required: true, type: 'boolean' },
  }),
  authController.register
);

router.post(
  '/login',
  validateBody({
    email: { required: true, type: 'string', email: true },
    password: { required: true, type: 'string', minLength: 1 },
  }),
  authController.login
);

router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.me);

router.post(
  '/forgot-password',
  validateBody({
    email: { required: true, type: 'string', email: true },
  }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  validateBody({
    email: { required: true, type: 'string', email: true },
    token: { required: true, type: 'string', minLength: 10 },
    new_password: { required: true, type: 'string', minLength: 8, maxLength: 100 },
  }),
  authController.resetPassword
);

module.exports = router;
