'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      full_name: { type: DataTypes.STRING(150), allowNull: false },
      email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
      cedula: { type: DataTypes.STRING(25), allowNull: true, comment: 'Cédula de identidad CR' },
      phone: { type: DataTypes.STRING(30), allowNull: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },
      specialty: { type: DataTypes.STRING(120), allowNull: true },
      license_number: { type: DataTypes.STRING(50), allowNull: true, comment: 'Código profesional médico' },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'anonymized'),
        allowNull: false,
        defaultValue: 'active',
      },
      two_factor_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      notification_prefs: { type: DataTypes.JSON, allowNull: true },
      reset_token_hash: { type: DataTypes.STRING(255), allowNull: true },
      reset_token_expires_at: { type: DataTypes.DATE, allowNull: true },
      last_login_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'users', underscored: true }
  );

  User.associate = (models) => {
    User.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    User.belongsToMany(models.Role, {
      through: models.UserRole,
      foreignKey: 'user_id',
      otherKey: 'role_id',
      as: 'roles',
    });
    User.hasOne(models.Patient, { foreignKey: 'user_id', as: 'patientProfile' });
    User.belongsToMany(models.Patient, {
      through: models.DoctorPatient,
      foreignKey: 'doctor_id',
      otherKey: 'patient_id',
      as: 'assignedPatients',
    });
    User.hasMany(models.UserConsent, { foreignKey: 'user_id', as: 'consents' });
    User.hasMany(models.DataDeletionRequest, { foreignKey: 'user_id', as: 'deletionRequests' });
    User.hasMany(models.AiAgentRun, { foreignKey: 'user_id', as: 'agentRuns' });
  };

  return User;
};
