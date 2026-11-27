'use strict';

module.exports = (sequelize, DataTypes) => {
  const Medication = sequelize.define(
    'Medication',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      name: { type: DataTypes.STRING(150), allowNull: false },
      dosage: { type: DataTypes.STRING(80), allowNull: false },
      route: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'oral' },
      instructions: { type: DataTypes.TEXT, allowNull: true },
      food_warnings: { type: DataTypes.STRING(255), allowNull: true },
      start_date: { type: DataTypes.DATEONLY, allowNull: false },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'completed', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
    },
    { tableName: 'medications', underscored: true }
  );

  Medication.associate = (models) => {
    Medication.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
    Medication.belongsTo(models.User, { foreignKey: 'doctor_id', as: 'doctor' });
    Medication.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    Medication.hasMany(models.MedicationSchedule, { foreignKey: 'medication_id', as: 'schedules' });
  };

  return Medication;
};
