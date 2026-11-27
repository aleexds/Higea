'use strict';

module.exports = (sequelize, DataTypes) => {
  const ExchangeRate = sequelize.define(
    'ExchangeRate',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      source: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'BCCR' },
      buy_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      sell_rate: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
      rate_date: { type: DataTypes.DATEONLY, allowNull: false },
      fetched_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    },
    { tableName: 'exchange_rates', underscored: true, updatedAt: false }
  );

  return ExchangeRate;
};
