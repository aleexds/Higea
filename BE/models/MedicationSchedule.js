'use strict';

module.exports = (sequelize, DataTypes) => {
  const MedicationSchedule = sequelize.define(
    'MedicationSchedule',
    {
      id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      medication_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
      time_of_day: {
        type: DataTypes.ENUM('morning', 'afternoon', 'night', 'as_needed'),
        allowNull: false,
      },
      scheduled_time: { type: DataTypes.TIME, allowNull: true },
      dose_amount: { type: DataTypes.STRING(60), allowNull: false, defaultValue: '1 tableta' },
      notes: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    },
    { tableName: 'medication_schedules', underscored: true }
  );

  MedicationSchedule.associate = (models) => {
    MedicationSchedule.belongsTo(models.Medication, { foreignKey: 'medication_id', as: 'medication' });
  };

  return MedicationSchedule;
};
