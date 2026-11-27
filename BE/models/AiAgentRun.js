'use strict';

module.exports = (sequelize, DataTypes) => {
  const AiAgentRun = sequelize.define(
    'AiAgentRun',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      agent_name: { type: DataTypes.STRING(100), allowNull: false },
      role_used: { type: DataTypes.STRING(40), allowNull: false },
      model_provider: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'gemini' },
      model_name: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'gemini-2.0-flash' },
      input_payload: { type: DataTypes.JSON, allowNull: true },
      output_payload: { type: DataTypes.JSON, allowNull: true },
      latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      status: {
        type: DataTypes.ENUM('success', 'error', 'blocked_guardrail'),
        allowNull: false,
        defaultValue: 'success',
      },
      error_message: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'ai_agent_runs', underscored: true, updatedAt: false }
  );

  AiAgentRun.associate = (models) => {
    AiAgentRun.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    AiAgentRun.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    AiAgentRun.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
  };

  return AiAgentRun;
};
