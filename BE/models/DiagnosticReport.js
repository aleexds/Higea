'use strict';

module.exports = (sequelize, DataTypes) => {
  const DiagnosticReport = sequelize.define(
    'DiagnosticReport',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      study_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      ai_draft: { type: DataTypes.TEXT, allowNull: true },
      findings: { type: DataTypes.TEXT, allowNull: true },
      conclusion: { type: DataTypes.TEXT, allowNull: true },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
      },
      status: {
        type: DataTypes.ENUM('pending_validation', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending_validation',
      },
      validated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      validated_at: { type: DataTypes.DATE, allowNull: true },
      ai_agent_run_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    },
    { tableName: 'diagnostic_reports', underscored: true }
  );

  DiagnosticReport.associate = (models) => {
    DiagnosticReport.belongsTo(models.DiagnosticStudy, { foreignKey: 'study_id', as: 'study' });
    DiagnosticReport.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
    DiagnosticReport.belongsTo(models.User, { foreignKey: 'doctor_id', as: 'doctor' });
    DiagnosticReport.belongsTo(models.User, { foreignKey: 'validated_by', as: 'validator' });
    DiagnosticReport.belongsTo(models.AiAgentRun, { foreignKey: 'ai_agent_run_id', as: 'agentRun' });
  };

  return DiagnosticReport;
};
