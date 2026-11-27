'use strict';

module.exports = (sequelize, DataTypes) => {
  const LegalDocument = sequelize.define(
    'LegalDocument',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doc_type: {
        type: DataTypes.ENUM('privacy_policy', 'terms_of_service'),
        allowNull: false,
      },
      version: { type: DataTypes.STRING(20), allowNull: false },
      title: { type: DataTypes.STRING(200), allowNull: false },
      content: { type: DataTypes.TEXT('long'), allowNull: false },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      effective_date: { type: DataTypes.DATEONLY, allowNull: false },
    },
    { tableName: 'legal_documents', underscored: true }
  );

  LegalDocument.associate = (models) => {
    LegalDocument.hasMany(models.UserConsent, { foreignKey: 'legal_document_id', as: 'consents' });
  };

  return LegalDocument;
};
