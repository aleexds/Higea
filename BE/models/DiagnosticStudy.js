'use strict';

module.exports = (sequelize, DataTypes) => {
  const DiagnosticStudy = sequelize.define(
    'DiagnosticStudy',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      modality: {
        type: DataTypes.ENUM('xray', 'ct', 'mri', 'ultrasound', 'lab_panel', 'other'),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(180), allowNull: false },
      file_url: { type: DataTypes.STRING(500), allowNull: true },
      metadata: { type: DataTypes.JSON, allowNull: true },
      performed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM('uploaded', 'pre_analyzed', 'reported'),
        allowNull: false,
        defaultValue: 'uploaded',
      },
    },
    { tableName: 'diagnostic_studies', underscored: true }
  );

  DiagnosticStudy.associate = (models) => {
    DiagnosticStudy.belongsTo(models.ClinicalOrder, { foreignKey: 'order_id', as: 'order' });
    DiagnosticStudy.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
    DiagnosticStudy.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    DiagnosticStudy.hasMany(models.DiagnosticReport, { foreignKey: 'study_id', as: 'reports' });
  };

  return DiagnosticStudy;
};
