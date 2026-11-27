'use strict';

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { validateBody } = require('../middlewares/validate.middleware');
const { createRateLimiter } = require('../middlewares/security.middleware');

const authStrictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Demasiados intentos de autenticación. Espere 15 minutos antes de reintentar.',
});

router.post(
  '/register',
  authStrictLimiter,
  validateBody({
    full_name: { required: true, type: 'string', minLength: 3, maxLength: 150 },
    email: { required: true, type: 'string', email: true, maxLength: 150 },
    password: { required: true, type: 'string', strongPassword: true },
    cedula: { required: false, type: 'string', cedula: true },
    phone: { required: false, type: 'string', minLength: 8, maxLength: 30 },
    accept_privacy: { required: true, type: 'boolean' },
    accept_terms: { required: true, type: 'boolean' },
  }),
  authController.register
);

router.post(
  '/login',
  authStrictLimiter,
  validateBody({
    email: { required: true, type: 'string', email: true },
    password: { required: true, type: 'string', minLength: 1 },
  }),
  authController.login
);

router.post('/logout', authenticateJWT, authController.logout);
router.get('/me', authenticateJWT, authController.me);

router.post(
  '/change-password',
  authenticateJWT,
  validateBody({
    current_password: { required: true, type: 'string', minLength: 1 },
    new_password: { required: true, type: 'string', strongPassword: true },
  }),
  authController.changePassword
);

router.post(
  '/forgot-password',
  authStrictLimiter,
  validateBody({
    email: { required: true, type: 'string', email: true },
  }),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  authStrictLimiter,
  validateBody({
    email: { required: true, type: 'string', email: true },
    token: { required: true, type: 'string', minLength: 10 },
    new_password: { required: true, type: 'string', strongPassword: true },
  }),
  authController.resetPassword
);

module.exports = router;
