'use strict';

module.exports = (sequelize, DataTypes) => {
  const ClinicalOrder = sequelize.define(
    'ClinicalOrder',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      order_type: {
        type: DataTypes.ENUM('radiology', 'laboratory', 'pharmacy', 'consultation'),
        allowNull: false,
      },
      title: { type: DataTypes.STRING(180), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
      },
      status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
    },
    { tableName: 'clinical_orders', underscored: true }
  );

  ClinicalOrder.associate = (models) => {
    ClinicalOrder.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    ClinicalOrder.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
    ClinicalOrder.belongsTo(models.User, { foreignKey: 'doctor_id', as: 'doctor' });
    ClinicalOrder.hasMany(models.DiagnosticStudy, { foreignKey: 'order_id', as: 'studies' });
  };

  return ClinicalOrder;
};
