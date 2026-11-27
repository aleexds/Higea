'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { AppError } = require('../middlewares/error.middleware');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

function signToken(user, roles) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError('JWT_SECRET no está configurado.', 500, 'CONFIG_ERROR');
  }

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles,
      tenant_id: user.tenant_id || null,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );
}

async function register({
  full_name,
  email,
  password,
  cedula,
  phone,
  tenant_id,
  role = 'patient',
  accept_privacy,
  accept_terms,
  ip_address,
  user_agent,
}) {
  if (!accept_privacy || !accept_terms) {
    throw new AppError(
      'Debe aceptar explícitamente la Política de Privacidad y los Términos y Condiciones (Ley N.º 8968).',
      400,
      'CONSENT_REQUIRED'
    );
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.User.findOne({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('Ya existe una cuenta registrada con este correo electrónico.', 409, 'EMAIL_EXISTS');
  }

  const roleRecord = await db.Role.findOne({ where: { name: role } });
  if (!roleRecord) {
    throw new AppError(`El rol '${role}' no es válido.`, 400, 'INVALID_ROLE');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = await db.sequelize.transaction(async (t) => {
    const user = await db.User.create(
      {
        tenant_id: tenant_id || 1,
        full_name: full_name.trim(),
        email: normalizedEmail,
        cedula: cedula ? cedula.trim() : null,
        phone: phone ? phone.trim() : null,
        password_hash: passwordHash,
        status: 'active',
      },
      { transaction: t }
    );

    await db.UserRole.create(
      { user_id: user.id, role_id: roleRecord.id, assigned_at: new Date() },
      { transaction: t }
    );

    if (role === 'patient') {
      const mrn = `EXP-${new Date().getFullYear()}-${String(user.id).padStart(4, '0')}`;
      await db.Patient.create(
        {
          user_id: user.id,
          tenant_id: user.tenant_id,
          medical_record_number: mrn,
          clinical_status: 'stable',
        },
        { transaction: t }
      );
    }

    const activeDocs = await db.LegalDocument.findAll({
      where: { is_active: true },
      transaction: t,
    });

    const privacyDoc = activeDocs.find((d) => d.doc_type === 'privacy_policy');
    const termsDoc = activeDocs.find((d) => d.doc_type === 'terms_of_service');

    await db.UserConsent.bulkCreate(
      [
        {
          user_id: user.id,
          legal_document_id: privacyDoc ? privacyDoc.id : null,
          consent_type: 'privacy_policy',
          accepted: true,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          accepted_at: new Date(),
        },
        {
          user_id: user.id,
          legal_document_id: termsDoc ? termsDoc.id : null,
          consent_type: 'terms_of_service',
          accepted: true,
          ip_address: ip_address || null,
          user_agent: user_agent || null,
          accepted_at: new Date(),
        },
      ],
      { transaction: t }
    );

    return user;
  });

  const roles = [role];
  const token = signToken(result, roles);

  return {
    token,
    user: {
      id: result.id,
      full_name: result.full_name,
      email: result.email,
      cedula: result.cedula,
      tenant_id: result.tenant_id,
      roles,
    },
  };
}

async function login({ email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.User.findOne({
    where: { email: normalizedEmail },
    include: [{ model: db.Role, as: 'roles', attributes: ['id', 'name'] }],
  });

  if (!user || user.status !== 'active') {
    throw new AppError('Credenciales inválidas o cuenta inactiva.', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Credenciales inválidas o cuenta inactiva.', 401, 'INVALID_CREDENTIALS');
  }

  await user.update({ last_login_at: new Date() });

  const roles = (user.roles || []).map((r) => r.name);
  const token = signToken(user, roles);

  return {
    token,
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      cedula: user.cedula,
      specialty: user.specialty,
      tenant_id: user.tenant_id,
      roles,
    },
  };
}

async function requestPasswordReset(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.User.findOne({ where: { email: normalizedEmail, status: 'active' } });
  if (!user) {
    // Respuesta genérica para evitar enumeración de correos
    return { message: 'Si el correo existe, se ha generado un código de recuperación.' };
  }

  const rawToken = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await user.update({
    reset_token_hash: tokenHash,
    reset_token_expires_at: expiresAt,
  });

  return {
    message: 'Si el correo existe, se ha generado un código de recuperación.',
    ...(process.env.NODE_ENV !== 'production' ? { dev_reset_token: rawToken, expires_at: expiresAt } : {}),
  };
}

async function resetPassword({ email, token, new_password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const user = await db.User.findOne({
    where: {
      email: normalizedEmail,
      reset_token_hash: tokenHash,
      status: 'active',
    },
  });

  if (!user || !user.reset_token_expires_at || new Date(user.reset_token_expires_at) < new Date()) {
    throw new AppError('Token de recuperación inválido o expirado.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(new_password, SALT_ROUNDS);
  await user.update({
    password_hash: passwordHash,
    reset_token_hash: null,
    reset_token_expires_at: null,
  });

  return { message: 'Contraseña restablecida correctamente.' };
}

module.exports = {
  register,
  login,
  requestPasswordReset,
  resetPassword,
  signToken,
};
