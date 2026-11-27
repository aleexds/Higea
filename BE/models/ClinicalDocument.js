'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClinicalDocument = sequelize.define(
    'ClinicalDocument',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      title: { type: DataTypes.STRING(200), allowNull: false },
      category: {
        type: DataTypes.ENUM('radiology', 'pharmacology', 'laboratory', 'triage', 'governance', 'general'),
        allowNull: false,
        defaultValue: 'general',
      },
      source: { type: DataTypes.STRING(200), allowNull: true },
      content: { type: DataTypes.TEXT('long'), allowNull: false },
      tags: { type: DataTypes.JSON, allowNull: true },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'clinical_documents', underscored: true }
  );

  ClinicalDocument.associate = (models) => {
    ClinicalDocument.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    ClinicalDocument.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' });
  };

  return ClinicalDocument;
};
