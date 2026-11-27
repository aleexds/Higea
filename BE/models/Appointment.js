'use strict';

module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    'Appointment',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      scheduled_at: { type: DataTypes.DATE, allowNull: false },
      duration_minutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 30 },
      modality: {
        type: DataTypes.ENUM('in_person', 'telehealth'),
        allowNull: false,
        defaultValue: 'in_person',
      },
      location_or_link: { type: DataTypes.STRING(255), allowNull: true },
      reason: { type: DataTypes.STRING(255), allowNull: false },
      preparation_notes: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      reminder_sent: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    { tableName: 'appointments', underscored: true }
  );

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    Appointment.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
    Appointment.belongsTo(models.User, { foreignKey: 'doctor_id', as: 'doctor' });
  };

  return Appointment;
};
