'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const passwordHash = await bcrypt.hash('Higea2026!', 10);

    // 1. Roles
    await queryInterface.bulkInsert('roles', [
      { id: 1, name: 'admin', description: 'Administrador SaaS y Clínico (B2B): gestión de tenants, API keys, métricas y BCCR.', created_at: now, updated_at: now },
      { id: 2, name: 'doctor', description: 'Médico y Especialista en Diagnóstico: pacientes asignados, órdenes, validación de reportes y agentes IA.', created_at: now, updated_at: now },
      { id: 3, name: 'patient', description: 'Paciente (Portal tipo EDUS): consulta de reportes aprobados, medicamentos, citas y asistente.', created_at: now, updated_at: now },
      { id: 4, name: 'auditor', description: 'Auditor de Cumplimiento: acceso de solo lectura a bitácoras de IA, APIs y gobernanza Ley 8968.', created_at: now, updated_at: now },
    ]);

    // 2. Tenants
    await queryInterface.bulkInsert('tenants', [
      {
        id: 1,
        name: 'Clínica San Juan de Dios - Diagnóstico Higea',
        slug: 'clinica-san-juan-higea',
        legal_id: '3-101-745210',
        plan: 'enterprise',
        status: 'active',
        contact_email: 'direccion@clinicasanjuan.cr',
        phone: '+506 2257-6282',
        settings: JSON.stringify({ timezone: 'America/Costa_Rica', country: 'CR', edus_sync: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        name: 'Centro de Imágenes Metropolitano CR',
        slug: 'centro-imagenes-metro',
        legal_id: '3-101-889012',
        plan: 'clinical',
        status: 'active',
        contact_email: 'operaciones@imagenesmetro.cr',
        phone: '+506 2522-1000',
        settings: JSON.stringify({ timezone: 'America/Costa_Rica', country: 'CR', edus_sync: false }),
        created_at: now,
        updated_at: now,
      },
    ]);

    // 3. Users (password for all demo accounts: Higea2026!)
    await queryInterface.bulkInsert('users', [
      {
        id: 1,
        tenant_id: 1,
        full_name: 'Alex Fabián Cubero Duarte',
        email: 'admin@higea.cr',
        cedula: '1-1450-0912',
        phone: '+506 8800-1000',
        password_hash: passwordHash,
        specialty: 'Administración SaaS',
        license_number: null,
        status: 'active',
        two_factor_enabled: true,
        notification_prefs: JSON.stringify({ email: true, security_alerts: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        tenant_id: 1,
        full_name: 'Dra. Elena Ramos Morales',
        email: 'elena.ramos@higea.cr',
        cedula: '1-1409-0823',
        phone: '+506 2542-0000',
        password_hash: passwordHash,
        specialty: 'Medicina Interna y Radiología',
        license_number: 'MED-CR-11489',
        status: 'active',
        two_factor_enabled: true,
        notification_prefs: JSON.stringify({ urgent_triage: true, telehealth_reminders: true, drug_interactions: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        tenant_id: 1,
        full_name: 'Carlos Morales Vega',
        email: 'carlos.morales@higea.cr',
        cedula: '1-1425-0892',
        phone: '+506 8701-2345',
        password_hash: passwordHash,
        specialty: null,
        license_number: null,
        status: 'active',
        two_factor_enabled: false,
        notification_prefs: JSON.stringify({ medication_reminders: true, appointment_reminders: true }),
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        tenant_id: 1,
        full_name: 'Lic. Mariana Solís Auditora',
        email: 'auditor@higea.cr',
        cedula: '1-1310-0441',
        phone: '+506 8822-3344',
        password_hash: passwordHash,
        specialty: 'Cumplimiento Ley N.º 8968',
        license_number: 'AUD-CR-4021',
        status: 'active',
        two_factor_enabled: true,
        notification_prefs: JSON.stringify({ compliance_digest: true }),
        created_at: now,
        updated_at: now,
      },
    ]);

    // 4. User Roles
    await queryInterface.bulkInsert('user_roles', [
      { user_id: 1, role_id: 1, assigned_at: now },
      { user_id: 2, role_id: 2, assigned_at: now },
      { user_id: 3, role_id: 3, assigned_at: now },
      { user_id: 4, role_id: 4, assigned_at: now },
    ]);

    // 5. Demo API Key
    const demoKeyHash = crypto.createHash('sha256').update('hg_live_demo_sanjuan_2026').digest('hex');
    await queryInterface.bulkInsert('api_keys', [
      {
        id: 1,
        tenant_id: 1,
        name: 'Motor DICOM/Ingest Producción',
        key_prefix: 'hg_live_demo',
        key_hash: demoKeyHash,
        scopes: JSON.stringify(['studies:write', 'reports:read', 'webhooks:receive']),
        status: 'active',
        created_by: 1,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 6. Patient profile + Doctor-Patient assignment
    await queryInterface.bulkInsert('patients', [
      {
        id: 1,
        user_id: 3,
        tenant_id: 1,
        medical_record_number: 'EXP-2026-0001',
        date_of_birth: '1968-05-14',
        gender: 'M',
        blood_type: 'O+',
        allergies: 'Penicilina (rash leve)',
        chronic_conditions: 'Diabetes Mellitus Tipo 2, Dislipidemia controlada',
        clinical_status: 'observation',
        insurance_info: 'Seguro Activo CCSS / Privado Higea',
        emergency_contact: 'Ana Vega (Esposa) +506 8888-9999',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('doctor_patients', [
      { id: 1, doctor_id: 2, patient_id: 1, is_primary: true, status: 'active', assigned_at: now },
    ]);

    // 7. Clinical Orders
    await queryInterface.bulkInsert('clinical_orders', [
      {
        id: 1,
        tenant_id: 1,
        patient_id: 1,
        doctor_id: 2,
        order_type: 'radiology',
        title: 'TAC Torácico con Contraste',
        description: 'Control de nódulo pulmonar basal derecho y evaluación de función renal previa por uso de Metformina.',
        priority: 'high',
        status: 'completed',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        tenant_id: 1,
        patient_id: 1,
        doctor_id: 2,
        order_type: 'laboratory',
        title: 'Perfil Lipídico, Creatinina y HbA1c',
        description: 'Control metabólico trimestral y tasa de filtración glomerular estimada.',
        priority: 'normal',
        status: 'in_progress',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 8. Diagnostic Studies
    await queryInterface.bulkInsert('diagnostic_studies', [
      {
        id: 1,
        order_id: 1,
        patient_id: 1,
        tenant_id: 1,
        modality: 'ct',
        title: 'TAC Torácico c/ Contraste',
        file_url: 'https://storage.higea.cr/studies/exp-2026-0001-tac-torax.dcm',
        metadata: JSON.stringify({ slices: 240, contrast: true, region: 'thorax', creatinine_mg_dl: 1.82, egfr: 38 }),
        performed_at: now,
        status: 'reported',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        order_id: 2,
        patient_id: 1,
        tenant_id: 1,
        modality: 'lab_panel',
        title: 'Perfil Lipídico, Creatinina y HbA1c',
        file_url: 'https://storage.higea.cr/studies/exp-2026-0001-lab-2026.pdf',
        metadata: JSON.stringify({ glucose_fasting: 108, hba1c: 6.4, ldl: 98, hdl: 48, creatinine: 1.82, egfr: 38 }),
        performed_at: now,
        status: 'pre_analyzed',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 9. Diagnostic Reports (1 approved visible to patient, 1 pending_validation hidden from patient)
    await queryInterface.bulkInsert('diagnostic_reports', [
      {
        id: 1,
        study_id: 1,
        patient_id: 1,
        doctor_id: 2,
        ai_draft: 'Pre-análisis IA: Se observa nódulo pulmonar sólido de 6 mm en lóbulo inferior derecho sin adenopatías mediastinales ni derrame pleural.',
        findings: 'Parénquima pulmonar sin consolidaciones agudas. Nódulo pulmonar basal derecho de 6 mm de bordes regulares, estable.',
        conclusion: 'Estudio interpretado sin hallazgos de complicación aguda. Nódulo pulmonar basal derecho de 6 mm en seguimiento semestral recomendado.',
        priority: 'normal',
        status: 'approved',
        validated_by: 2,
        validated_at: now,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        study_id: 2,
        patient_id: 1,
        doctor_id: 2,
        ai_draft: 'Pre-análisis IA: Glucosa en ayunas 108 mg/dL, HbA1c 6.4% (control aceptable). Creatinina 1.82 mg/dL con TFG estimada 38 mL/min/1.73m² requiere revisión médica antes de contraste yodado.',
        findings: 'Pendiente revisión médica final.',
        conclusion: null,
        priority: 'high',
        status: 'pending_validation',
        validated_by: null,
        validated_at: null,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 10. Medications & Schedules
    await queryInterface.bulkInsert('medications', [
      {
        id: 1,
        patient_id: 1,
        doctor_id: 2,
        tenant_id: 1,
        name: 'Metformina',
        dosage: '850 mg',
        route: 'oral',
        instructions: 'Tomar 1 comprimido cada 12 horas con las comidas principales.',
        food_warnings: 'Tomar con alimentos para proteger el estómago. Evitar consumo excesivo de alcohol.',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        patient_id: 1,
        doctor_id: 2,
        tenant_id: 1,
        name: 'Atorvastatina',
        dosage: '20 mg',
        route: 'oral',
        instructions: 'Tomar 1 comprimido por la noche antes de dormir.',
        food_warnings: 'Evitar jugo de toronja en grandes cantidades.',
        start_date: '2026-09-01',
        end_date: '2026-12-31',
        status: 'active',
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('medication_schedules', [
      { id: 1, medication_id: 1, time_of_day: 'morning', scheduled_time: '08:00:00', dose_amount: '1 tableta', notes: 'Con el desayuno', is_active: true, created_at: now, updated_at: now },
      { id: 2, medication_id: 1, time_of_day: 'afternoon', scheduled_time: '13:00:00', dose_amount: '1 tableta', notes: 'Con el almuerzo', is_active: true, created_at: now, updated_at: now },
      { id: 3, medication_id: 2, time_of_day: 'night', scheduled_time: '21:00:00', dose_amount: '1 tableta', notes: 'Antes de dormir', is_active: true, created_at: now, updated_at: now },
    ]);

    // 11. Appointments
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    await queryInterface.bulkInsert('appointments', [
      {
        id: 1,
        tenant_id: 1,
        patient_id: 1,
        doctor_id: 2,
        scheduled_at: tomorrow,
        duration_minutes: 30,
        modality: 'telehealth',
        location_or_link: 'https://meet.higea.cr/sala-04',
        reason: 'Revisión de resultados de TAC Torácico y ajuste de tratamiento',
        preparation_notes: 'Tener a mano registro de presión arterial y lista de medicamentos.',
        status: 'confirmed',
        reminder_sent: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        tenant_id: 1,
        patient_id: 1,
        doctor_id: 2,
        scheduled_at: nextWeek,
        duration_minutes: 45,
        modality: 'in_person',
        location_or_link: 'Clínica San Juan de Dios - Torre Médica B, Consultorio 204',
        reason: 'Control presencial metabólico y función renal',
        preparation_notes: 'Ayuno estricto de 8 horas para control lipídico y perfil metabólico.',
        status: 'scheduled',
        reminder_sent: false,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 12. Clinical Documents (RAG Knowledge Base)
    await queryInterface.bulkInsert('clinical_documents', [
      {
        id: 1,
        tenant_id: 1,
        title: 'Guía ESUR v10.0 / ACR 2023: Manejo de Metformina y Medios de Contraste Yodados',
        category: 'radiology',
        source: 'European Society of Urogenital Radiology (ESUR) & ACR Manual on Contrast Media',
        content: 'En pacientes con TFG estimada entre 30 y 44 mL/min/1.73m² que reciben medio de contraste yodado intravenoso, se recomienda suspender la Metformina al momento del procedimiento o 48 horas antes si existe riesgo de lesión renal aguda, y reanudar tras comprobar estabilidad de creatinina sérica a las 48 horas posteriores. Se sugiere hidratación profiláctica con solución salina isotónica 0.9% a 1 mL/kg/h desde 3-4 horas antes hasta 4-6 horas después del estudio.',
        tags: JSON.stringify(['metformina', 'contraste', 'esur', 'acr', 'tfg', 'renal', 'tac']),
        created_by: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        tenant_id: 1,
        title: 'Protocolo de Farmacovigilancia: Estatinas e Interacciones Frecuentes',
        category: 'pharmacology',
        source: 'Protocolo Clínico Higea / Farmacopea CR',
        content: 'La Atorvastatina no presenta contraindicación directa con medios de contraste yodados ni con Metformina. Su metabolismo depende de CYP3A4, por lo que debe evitarse el consumo excesivo de jugo de toronja e inhibidores potentes de CYP3A4 como claritromicina o itraconazol. Se recomienda monitoreo basal y periódico de transaminasas (AST/ALT) y síntomas musculares.',
        tags: JSON.stringify(['atorvastatina', 'metformina', 'interacciones', 'farmacovigilancia', 'estatinas']),
        created_by: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        tenant_id: 1,
        title: 'Política Interna de Cumplimiento Ley N.º 8968 en Salud Digital',
        category: 'governance',
        source: 'Ley N.º 8968 de Costa Rica y Reglamento de Expediente Digital',
        content: 'Todo tratamiento de datos personales sensibles de salud requiere consentimiento informado explícito, trazabilidad de accesos y separación estricta por roles. Ante una solicitud de supresión de cuenta, los datos identificativos personales deben anonimizarse, resguardando únicamente los registros clínicos anonimizados requeridos por la normativa sanitaria vigente de Costa Rica.',
        tags: JSON.stringify(['ley 8968', 'privacidad', 'arco', 'anonimizacion', 'consentimiento']),
        created_by: 1,
        created_at: now,
        updated_at: now,
      },
    ]);

    // 13. Legal Documents (Ley N.º 8968)
    await queryInterface.bulkInsert('legal_documents', [
      {
        id: 1,
        doc_type: 'privacy_policy',
        version: '1.0',
        title: 'Política de Privacidad y Protección de Datos Personales (Ley N.º 8968)',
        content: [
          '1. Datos recopilados: Higea recopila datos identificativos (nombre, cédula, correo, teléfono) y datos clínicos sensibles (órdenes, estudios diagnósticos, recetas y citas) a través del registro web y la atención en clínicas afiliadas.',
          '2. Finalidad y base legal: Los datos se tratan exclusivamente para la gestión clínica, seguimiento farmacológico, apoyo diagnóstico supervisado por profesionales médicos y cumplimiento legal conforme a la Ley N.º 8968 de Costa Rica, basados en su consentimiento informado.',
          '3. Transferencia a terceros: Higea utiliza proveedores de modelos de IA y servicios externos (como el BCCR para indicadores económicos) aplicando minimización de datos y sin usar datos clínicos identificables para entrenar modelos comerciales.',
          '4. Seguridad y conservación: Contraseñas cifradas con bcrypt, autenticación JWT, control de acceso por roles en servidor y bitácoras auditables. Los registros clínicos se conservan según los plazos legales sanitarios vigentes.',
          '5. Derechos ARCO: Usted puede ejercer sus derechos de Acceso, Rectificación, Cancelación y Oposición, incluyendo la solicitud verificada de eliminación/anonimización desde su perfil.',
        ].join('\n\n'),
        is_active: true,
        effective_date: '2026-11-01',
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        doc_type: 'terms_of_service',
        version: '1.0',
        title: 'Términos y Condiciones de Uso de la Plataforma Higea',
        content: [
          '1. Objeto: Higea es una plataforma SaaS B2B2C de apoyo a la gestión clínica, diagnóstico por imágenes y seguimiento farmacológico.',
          '2. Supervisión médica obligatoria: Los resultados generados por agentes de Inteligencia Artificial constituyen borradores de apoyo y nunca reemplazan el criterio médico profesional. Ningún reporte diagnóstico es visible al paciente sin validación formal de un médico.',
          '3. Uso aceptable: Los usuarios se comprometen a mantener la confidencialidad de sus credenciales y utilizar la plataforma conforme a su rol asignado.',
          '4. Limitación de responsabilidad: Las respuestas de los agentes de IA son informativas y sujetas a verificación clínica. En caso de emergencia médica, el paciente debe acudir de inmediato al centro de salud más cercano o llamar al 9-1-1.',
        ].join('\n\n'),
        is_active: true,
        effective_date: '2026-11-01',
        created_at: now,
        updated_at: now,
      },
    ]);

    // 14. User Consents
    await queryInterface.bulkInsert('user_consents', [
      { user_id: 1, legal_document_id: 1, consent_type: 'privacy_policy', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 1, legal_document_id: 2, consent_type: 'terms_of_service', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 2, legal_document_id: 1, consent_type: 'privacy_policy', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 2, legal_document_id: 2, consent_type: 'terms_of_service', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 3, legal_document_id: 1, consent_type: 'privacy_policy', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 3, legal_document_id: 2, consent_type: 'terms_of_service', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 4, legal_document_id: 1, consent_type: 'privacy_policy', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
      { user_id: 4, legal_document_id: 2, consent_type: 'terms_of_service', accepted: true, ip_address: '127.0.0.1', accepted_at: now },
    ]);

    // 15. Initial BCCR Exchange Rate
    await queryInterface.bulkInsert('exchange_rates', [
      {
        id: 1,
        source: 'BCCR',
        buy_rate: 508.5200,
        sell_rate: 512.4500,
        rate_date: now.toISOString().slice(0, 10),
        fetched_at: now,
        created_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    const tables = [
      'exchange_rates',
      'user_consents',
      'legal_documents',
      'clinical_documents',
      'appointments',
      'medication_schedules',
      'medications',
      'diagnostic_reports',
      'diagnostic_studies',
      'clinical_orders',
      'doctor_patients',
      'patients',
      'api_keys',
      'user_roles',
      'users',
      'tenants',
      'roles',
    ];
    for (const table of tables) {
      await queryInterface.bulkDelete(table, null, {});
    }
  },
};
