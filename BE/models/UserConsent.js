'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserConsent = sequelize.define(
    'UserConsent',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      legal_document_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      consent_type: {
        type: DataTypes.ENUM('privacy_policy', 'terms_of_service', 'ai_telemetry', 'clinical_notifications'),
        allowNull: false,
      },
      accepted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ip_address: { type: DataTypes.STRING(64), allowNull: true },
      user_agent: { type: DataTypes.STRING(255), allowNull: true },
      accepted_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'user_consents', underscored: true, timestamps: false }
  );

  UserConsent.associate = (models) => {
    UserConsent.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserConsent.belongsTo(models.LegalDocument, { foreignKey: 'legal_document_id', as: 'legalDocument' });
  };

  return UserConsent;
};
