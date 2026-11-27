'use strict';

module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    'Role',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: {
        type: DataTypes.ENUM('admin', 'doctor', 'patient', 'auditor'),
        allowNull: false,
        unique: true,
      },
      description: { type: DataTypes.STRING(255), allowNull: true },
    },
    { tableName: 'roles', underscored: true }
  );

  Role.associate = (models) => {
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: 'role_id',
      otherKey: 'user_id',
      as: 'users',
    });
  };

  return Role;
};
