'use strict';

const bcrypt = require('bcrypt');
const db = require('../models');
const { AppError } = require('../middlewares/error.middleware');

async function getActiveLegalDocuments() {
  return db.LegalDocument.findAll({
    where: { is_active: true },
    order: [['doc_type', 'ASC'], ['effective_date', 'DESC']],
  });
}

async function getUserConsents(userId) {
  return db.UserConsent.findAll({
    where: { user_id: userId },
    include: [{ model: db.LegalDocument, as: 'legalDocument', attributes: ['id', 'doc_type', 'version', 'title'] }],
    order: [['accepted_at', 'DESC']],
  });
}

async function updateUserConsent({ userId, consent_type, accepted, ip_address, user_agent }) {
  const doc = ['privacy_policy', 'terms_of_service'].includes(consent_type)
    ? await db.LegalDocument.findOne({ where: { doc_type: consent_type, is_active: true } })
    : null;

  return db.UserConsent.create({
    user_id: userId,
    legal_document_id: doc ? doc.id : null,
    consent_type,
    accepted: Boolean(accepted),
    ip_address: ip_address || null,
    user_agent: user_agent || null,
    accepted_at: new Date(),
    revoked_at: accepted ? null : new Date(),
  });
}

async function requestAccountDeletion({ userId, password, reason }) {
  const user = await db.User.findByPk(userId);
  if (!user || user.status === 'anonymized') {
    throw new AppError('Cuenta no encontrada o ya anonimizada.', 404, 'USER_NOT_FOUND');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Confirmación de identidad fallida: contraseña incorrecta.', 401, 'IDENTITY_CONFIRMATION_FAILED');
  }

  const retentionNote =
    'Conforme a la Ley N.º 8968 de Costa Rica y normativa sanitaria vigente, los datos identificativos personales han sido anonimizados; únicamente se conservan registros clínicos anonimizados por obligación legal y trazabilidad médica.';

  const deletionRequest = await db.sequelize.transaction(async (t) => {
    const reqRecord = await db.DataDeletionRequest.create(
      {
        user_id: user.id,
        reason: reason || 'Solicitud voluntaria de baja del usuario (Derecho de Supresión Ley N.º 8968).',
        identity_confirmed: true,
        status: 'completed',
        legal_retention_note: retentionNote,
        processed_at: new Date(),
        notified_at: new Date(),
      },
      { transaction: t }
    );

    await user.update(
      {
        full_name: `Usuario Anonimizado #${user.id}`,
        email: `anon_${user.id}_${Date.now()}@anonymized.higea.local`,
        cedula: null,
        phone: null,
        status: 'anonymized',
        reset_token_hash: null,
        reset_token_expires_at: null,
      },
      { transaction: t }
    );

    return reqRecord;
  });

  return {
    request: deletionRequest,
    notification: {
      sent: true,
      message: 'Su solicitud de baja y anonimización fue procesada conforme a la Ley N.º 8968.',
      legal_retention_note: retentionNote,
    },
  };
}

module.exports = {
  getActiveLegalDocuments,
  getUserConsents,
  updateUserConsent,
  requestAccountDeletion,
};
