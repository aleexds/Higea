'use strict';

module.exports = (sequelize, DataTypes) => {
  const ApiKey = sequelize.define(
    'ApiKey',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      name: { type: DataTypes.STRING(120), allowNull: false },
      key_prefix: { type: DataTypes.STRING(20), allowNull: false },
      key_hash: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      scopes: { type: DataTypes.JSON, allowNull: true },
      status: {
        type: DataTypes.ENUM('active', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
      },
      last_used_at: { type: DataTypes.DATE, allowNull: true },
      created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
      revoked_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'api_keys', underscored: true }
  );

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.Tenant, { foreignKey: 'tenant_id', as: 'tenant' });
    ApiKey.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  };

  return ApiKey;
};
