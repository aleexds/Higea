'use strict';

module.exports = (sequelize, DataTypes) => {
  const Tenant = sequelize.define(
    'Tenant',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      slug: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      legal_id: { type: DataTypes.STRING(30), allowNull: true, comment: 'Cédula jurídica' },
      plan: {
        type: DataTypes.ENUM('starter', 'clinical', 'enterprise'),
        allowNull: false,
        defaultValue: 'clinical',
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      contact_email: { type: DataTypes.STRING(150), allowNull: true },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      settings: { type: DataTypes.JSON, allowNull: true },
    },
    { tableName: 'tenants', underscored: true }
  );

  Tenant.associate = (models) => {
    Tenant.hasMany(models.User, { foreignKey: 'tenant_id', as: 'users' });
    Tenant.hasMany(models.ApiKey, { foreignKey: 'tenant_id', as: 'apiKeys' });
    Tenant.hasMany(models.Patient, { foreignKey: 'tenant_id', as: 'patients' });
    Tenant.hasMany(models.ClinicalOrder, { foreignKey: 'tenant_id', as: 'clinicalOrders' });
    Tenant.hasMany(models.DiagnosticStudy, { foreignKey: 'tenant_id', as: 'diagnosticStudies' });
    Tenant.hasMany(models.Appointment, { foreignKey: 'tenant_id', as: 'appointments' });
    Tenant.hasMany(models.AiAgentRun, { foreignKey: 'tenant_id', as: 'agentRuns' });
  };

  return Tenant;
};
