'use strict';

module.exports = (sequelize, DataTypes) => {
  const Patient = sequelize.define(
    'Patient',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      medical_record_number: { type: DataTypes.STRING(40), allowNull: false, unique: true },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.ENUM('M', 'F', 'other', 'unspecified'), defaultValue: 'unspecified' },
      blood_type: { type: DataTypes.STRING(10), allowNull: true },
      allergies: { type: DataTypes.TEXT, allowNull: true },
      chronic_conditions: { type: DataTypes.TEXT, allowNull: true },
      clinical_status: {
        type: DataTypes.ENUM('stable', 'observation', 'critical'),
        allowNull: false,
        defaultValue: 'stable',
      },
      insurance_info: { type: DataTypes.STRING(150), allowNull: true },
      emergency_contact: { type: DataTypes.STRING(150), allowNull: true },
    },
    { tableName: 'patients', underscored: true }
  );

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Patient.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    Patient.belongsToMany(models.User, {
      through: models.DoctorPatient,
      foreignKey: 'patient_id',
      otherKey: 'doctor_id',
      as: 'doctors',
    });
    Patient.hasMany(models.ClinicalOrder, { foreignKey: 'patient_id', as: 'clinicalOrders' });
    Patient.hasMany(models.DiagnosticStudy, { foreignKey: 'patient_id', as: 'diagnosticStudies' });
    Patient.hasMany(models.DiagnosticReport, { foreignKey: 'patient_id', as: 'diagnosticReports' });
    Patient.hasMany(models.Medication, { foreignKey: 'patient_id', as: 'medications' });
    Patient.hasMany(models.Appointment, { foreignKey: 'patient_id', as: 'appointments' });
  };

  return Patient;
};
