'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. tenants
    await queryInterface.createTable('tenants', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING(150), allowNull: false },
      slug: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      legal_id: { type: Sequelize.STRING(30), allowNull: true },
      plan: {
        type: Sequelize.ENUM('starter', 'clinical', 'enterprise'),
        allowNull: false,
        defaultValue: 'clinical',
      },
      status: {
        type: Sequelize.ENUM('active', 'suspended', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      contact_email: { type: Sequelize.STRING(150), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      settings: { type: Sequelize.JSON, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 2. roles
    await queryInterface.createTable('roles', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      name: {
        type: Sequelize.ENUM('admin', 'doctor', 'patient', 'auditor'),
        allowNull: false,
        unique: true,
      },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 3. users
    await queryInterface.createTable('users', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      full_name: { type: Sequelize.STRING(150), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      cedula: { type: Sequelize.STRING(25), allowNull: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      specialty: { type: Sequelize.STRING(120), allowNull: true },
      license_number: { type: Sequelize.STRING(50), allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive', 'anonymized'),
        allowNull: false,
        defaultValue: 'active',
      },
      two_factor_enabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      notification_prefs: { type: Sequelize.JSON, allowNull: true },
      reset_token_hash: { type: Sequelize.STRING(255), allowNull: true },
      reset_token_expires_at: { type: Sequelize.DATE, allowNull: true },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 4. user_roles
    await queryInterface.createTable('user_roles', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'roles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('user_roles', {
      fields: ['user_id', 'role_id'],
      type: 'unique',
      name: 'uq_user_roles_user_role',
    });

    // 5. api_keys
    await queryInterface.createTable('api_keys', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: { type: Sequelize.STRING(120), allowNull: false },
      key_prefix: { type: Sequelize.STRING(20), allowNull: false },
      key_hash: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      scopes: { type: Sequelize.JSON, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
      },
      last_used_at: { type: Sequelize.DATE, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 6. patients
    await queryInterface.createTable('patients', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      medical_record_number: { type: Sequelize.STRING(40), allowNull: false, unique: true },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      gender: { type: Sequelize.ENUM('M', 'F', 'other', 'unspecified'), defaultValue: 'unspecified' },
      blood_type: { type: Sequelize.STRING(10), allowNull: true },
      allergies: { type: Sequelize.TEXT, allowNull: true },
      chronic_conditions: { type: Sequelize.TEXT, allowNull: true },
      clinical_status: {
        type: Sequelize.ENUM('stable', 'observation', 'critical'),
        allowNull: false,
        defaultValue: 'stable',
      },
      insurance_info: { type: Sequelize.STRING(150), allowNull: true },
      emergency_contact: { type: Sequelize.STRING(150), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 7. doctor_patients
    await queryInterface.createTable('doctor_patients', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doctor_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      is_primary: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addConstraint('doctor_patients', {
      fields: ['doctor_id', 'patient_id'],
      type: 'unique',
      name: 'uq_doctor_patients_pair',
    });

    // 8. clinical_orders
    await queryInterface.createTable('clinical_orders', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      order_type: {
        type: Sequelize.ENUM('radiology', 'laboratory', 'pharmacy', 'consultation'),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(180), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
      },
      status: {
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 9. diagnostic_studies
    await queryInterface.createTable('diagnostic_studies', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'clinical_orders', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      modality: {
        type: Sequelize.ENUM('xray', 'ct', 'mri', 'ultrasound', 'lab_panel', 'other'),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(180), allowNull: false },
      file_url: { type: Sequelize.STRING(500), allowNull: true },
      metadata: { type: Sequelize.JSON, allowNull: true },
      performed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      status: {
        type: Sequelize.ENUM('uploaded', 'pre_analyzed', 'reported'),
        allowNull: false,
        defaultValue: 'uploaded',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 10. ai_agent_runs (before diagnostic_reports because diagnostic_reports references it)
    await queryInterface.createTable('ai_agent_runs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      agent_name: { type: Sequelize.STRING(100), allowNull: false },
      role_used: { type: Sequelize.STRING(40), allowNull: false },
      model_provider: { type: Sequelize.STRING(50), allowNull: false, defaultValue: 'gemini' },
      model_name: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'gemini-2.0-flash' },
      input_payload: { type: Sequelize.JSON, allowNull: true },
      output_payload: { type: Sequelize.JSON, allowNull: true },
      latency_ms: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      status: {
        type: Sequelize.ENUM('success', 'error', 'blocked_guardrail'),
        allowNull: false,
        defaultValue: 'success',
      },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('ai_agent_runs', ['agent_name', 'created_at'], { name: 'idx_ai_agent_runs_agent_date' });

    // 11. diagnostic_reports
    await queryInterface.createTable('diagnostic_reports', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      study_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'diagnostic_studies', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      ai_draft: { type: Sequelize.TEXT, allowNull: true },
      findings: { type: Sequelize.TEXT, allowNull: true },
      conclusion: { type: Sequelize.TEXT, allowNull: true },
      priority: {
        type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
      },
      status: {
        type: Sequelize.ENUM('pending_validation', 'approved', 'rejected'),
        allowNull: false,
        defaultValue: 'pending_validation',
      },
      validated_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      validated_at: { type: Sequelize.DATE, allowNull: true },
      ai_agent_run_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'ai_agent_runs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('diagnostic_reports', ['patient_id', 'status'], { name: 'idx_diagnostic_reports_patient_status' });

    // 12. medications
    await queryInterface.createTable('medications', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      dosage: { type: Sequelize.STRING(80), allowNull: false },
      route: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'oral' },
      instructions: { type: Sequelize.TEXT, allowNull: true },
      food_warnings: { type: Sequelize.STRING(255), allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'completed', 'suspended'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 13. medication_schedules
    await queryInterface.createTable('medication_schedules', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      medication_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'medications', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      time_of_day: {
        type: Sequelize.ENUM('morning', 'afternoon', 'night', 'as_needed'),
        allowNull: false,
      },
      scheduled_time: { type: Sequelize.TIME, allowNull: true },
      dose_amount: { type: Sequelize.STRING(60), allowNull: false, defaultValue: '1 tableta' },
      notes: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 14. appointments
    await queryInterface.createTable('appointments', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      patient_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'patients', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      doctor_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      scheduled_at: { type: Sequelize.DATE, allowNull: false },
      duration_minutes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 30 },
      modality: {
        type: Sequelize.ENUM('in_person', 'telehealth'),
        allowNull: false,
        defaultValue: 'in_person',
      },
      location_or_link: { type: Sequelize.STRING(255), allowNull: true },
      reason: { type: Sequelize.STRING(255), allowNull: false },
      preparation_notes: { type: Sequelize.TEXT, allowNull: true },
      status: {
        type: Sequelize.ENUM('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      reminder_sent: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 15. clinical_documents (base RAG)
    await queryInterface.createTable('clinical_documents', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      tenant_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'tenants', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      category: {
        type: Sequelize.ENUM('radiology', 'pharmacology', 'laboratory', 'triage', 'governance', 'general'),
        allowNull: false,
        defaultValue: 'general',
      },
      source: { type: Sequelize.STRING(200), allowNull: true },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      tags: { type: Sequelize.JSON, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 16. external_api_logs
    await queryInterface.createTable('external_api_logs', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      service_name: { type: Sequelize.STRING(80), allowNull: false },
      endpoint: { type: Sequelize.STRING(500), allowNull: false },
      method: { type: Sequelize.STRING(10), allowNull: false, defaultValue: 'GET' },
      status_code: { type: Sequelize.INTEGER, allowNull: true },
      latency_ms: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      request_summary: { type: Sequelize.JSON, allowNull: true },
      response_summary: { type: Sequelize.JSON, allowNull: true },
      success: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      error_message: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // 17. exchange_rates
    await queryInterface.createTable('exchange_rates', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      source: { type: Sequelize.STRING(60), allowNull: false, defaultValue: 'BCCR' },
      buy_rate: { type: Sequelize.DECIMAL(10, 4), allowNull: false },
      sell_rate: { type: Sequelize.DECIMAL(10, 4), allowNull: false },
      rate_date: { type: Sequelize.DATEONLY, allowNull: false },
      fetched_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
    });

    // 18. legal_documents
    await queryInterface.createTable('legal_documents', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      doc_type: {
        type: Sequelize.ENUM('privacy_policy', 'terms_of_service'),
        allowNull: false,
      },
      version: { type: Sequelize.STRING(20), allowNull: false },
      title: { type: Sequelize.STRING(200), allowNull: false },
      content: { type: Sequelize.TEXT('long'), allowNull: false },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      effective_date: { type: Sequelize.DATEONLY, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });

    // 19. user_consents
    await queryInterface.createTable('user_consents', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      legal_document_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: 'legal_documents', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      consent_type: {
        type: Sequelize.ENUM('privacy_policy', 'terms_of_service', 'ai_telemetry', 'clinical_notifications'),
        allowNull: false,
      },
      accepted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      ip_address: { type: Sequelize.STRING(64), allowNull: true },
      user_agent: { type: Sequelize.STRING(255), allowNull: true },
      accepted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
    });

    // 20. data_deletion_requests
    await queryInterface.createTable('data_deletion_requests', {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      reason: { type: Sequelize.TEXT, allowNull: true },
      identity_confirmed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      status: {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'rejected'),
        allowNull: false,
        defaultValue: 'pending',
      },
      legal_retention_note: { type: Sequelize.TEXT, allowNull: true },
      processed_at: { type: Sequelize.DATE, allowNull: true },
      notified_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') },
    });
  },

  async down(queryInterface) {
    const tables = [
      'data_deletion_requests',
      'user_consents',
      'legal_documents',
      'exchange_rates',
      'external_api_logs',
      'clinical_documents',
      'appointments',
      'medication_schedules',
      'medications',
      'diagnostic_reports',
      'ai_agent_runs',
      'diagnostic_studies',
      'clinical_orders',
      'doctor_patients',
      'patients',
      'api_keys',
      'user_roles',
      'users',
      'roles',
      'tenants',
    ];
    for (const table of tables) {
      await queryInterface.dropTable(table);
    }
  },
};
