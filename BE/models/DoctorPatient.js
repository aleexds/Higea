'use strict';

module.exports = (sequelize, DataTypes) => {
  const DoctorPatient = sequelize.define(
    'DoctorPatient',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doctor_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      patient_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      is_primary: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'doctor_patients', underscored: true, timestamps: false }
  );

  DoctorPatient.associate = (models) => {
    DoctorPatient.belongsTo(models.User, { foreignKey: 'doctor_id', as: 'doctor' });
    DoctorPatient.belongsTo(models.Patient, { foreignKey: 'patient_id', as: 'patient' });
  };

  return DoctorPatient;
};
