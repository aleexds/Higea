'use strict';

module.exports = (sequelize, DataTypes) => {
  const ExternalApiLog = sequelize.define(
    'ExternalApiLog',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      service_name: { type: DataTypes.STRING(80), allowNull: false },
      endpoint: { type: DataTypes.STRING(500), allowNull: false },
      method: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'GET' },
      status_code: { type: DataTypes.INTEGER, allowNull: true },
      latency_ms: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      request_summary: { type: DataTypes.JSON, allowNull: true },
      response_summary: { type: DataTypes.JSON, allowNull: true },
      success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      error_message: { type: DataTypes.TEXT, allowNull: true },
    },
    { tableName: 'external_api_logs', underscored: true, updatedAt: false }
  );

  return ExternalApiLog;
};
