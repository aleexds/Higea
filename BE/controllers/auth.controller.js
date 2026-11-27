'use strict';

const db = require('../models');
const authService = require('../services/auth.service');
const { revokeToken } = require('../middlewares/auth.middleware');

async function register(req, res, next) {
  try {
    const data = await authService.register({
      ...req.body,
      role: 'patient', // Registro público siempre inicia como paciente (seguridad)
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });
    return res.status(201).json({
      success: true,
      message: 'Cuenta registrada exitosamente con consentimiento informado.',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  try {
    const data = await authService.login(req.body);
    return res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      data,
    });
  } catch (err) {
    return next(err);
  }
}

async function logout(req, res) {
  if (req.user?.jti) {
    revokeToken(req.user.jti, req.user.exp);
  }
  return res.status(200).json({
    success: true,
    message: 'Sesión cerrada y token revocado correctamente.',
  });
}

async function changePassword(req, res, next) {
  try {
    const data = await authService.changePassword({
      userId: req.user.id,
      current_password: req.body.current_password,
      new_password: req.body.new_password,
    });
    if (req.user?.jti) {
      revokeToken(req.user.jti, req.user.exp);
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'reset_token_hash', 'reset_token_expires_at'] },
      include: [
        { model: db.Role, as: 'roles', attributes: ['id', 'name'] },
        { model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug', 'plan'] },
      ],
    });
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const data = await authService.requestPasswordReset(req.body.email);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const data = await authService.resetPassword(req.body);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
};
