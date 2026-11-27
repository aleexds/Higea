'use strict';

module.exports = (sequelize, DataTypes) => {
  const DataDeletionRequest = sequelize.define(
    'DataDeletionRequest',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      reason: { type: DataTypes.TEXT, allowNull: true },
      identity_confirmed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: DataTypes.ENUM('pending', 'processing', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      legal_retention_note: { type: DataTypes.TEXT, allowNull: true },
      processed_at: { type: DataTypes.DATE, allowNull: true },
      notified_at: { type: DataTypes.DATE, allowNull: true },
    },
    { tableName: 'data_deletion_requests', underscored: true }
  );

  DataDeletionRequest.associate = (models) => {
    DataDeletionRequest.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  };

  return DataDeletionRequest;
};
