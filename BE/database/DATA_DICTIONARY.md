# Diccionario de Datos — Higea (MySQL 3FN)

| # | Tabla | Dominio | Propósito | Llaves Principales / Foráneas |
|---|---|---|---|---|
| 1 | `tenants` | Seguridad / SaaS | Clínicas o centros médicos multi-tenant, plan y configuración. | PK `id`, UK `slug` |
| 2 | `roles` | Seguridad | Catálogo de roles (`admin`, `doctor`, `patient`, `auditor`). | PK `id`, UK `name` |
| 3 | `users` | Seguridad | Cuentas de usuario con hash `bcrypt`, estado (`active`, `inactive`, `anonymized`) y datos profesionales. | PK `id`, UK `email`, FK `tenant_id -> tenants.id` |
| 4 | `user_roles` | Seguridad | Relación N:M entre usuarios y roles. | PK `id`, UK `(user_id, role_id)`, FK `user_id`, FK `role_id` |
| 5 | `api_keys` | Seguridad / SaaS | Llaves de API hasheadas por tenant con prefijo, alcances y estado (`active`, `revoked`). | PK `id`, UK `key_hash`, FK `tenant_id`, FK `created_by` |
| 6 | `patients` | Clínico | Expediente clínico del paciente (1:1 con `users`), alergias, condiciones crónicas y estado clínico. | PK `id`, UK `user_id`, UK `medical_record_number`, FK `tenant_id` |
| 7 | `doctor_patients` | Clínico | Cartera N:M de pacientes asignados a cada médico. | PK `id`, UK `(doctor_id, patient_id)`, FK `doctor_id`, FK `patient_id` |
| 8 | `clinical_orders` | Clínico | Órdenes de radiología, laboratorio, farmacia o consulta con prioridad y estado. | PK `id`, FK `tenant_id`, FK `patient_id`, FK `doctor_id` |
| 9 | `diagnostic_studies` | Clínico | Estudios diagnósticos cargados (modalidad, URL, metadatos JSON). | PK `id`, FK `order_id`, FK `patient_id`, FK `tenant_id` |
| 10 | `diagnostic_reports` | Clínico | Borradores IA y reportes diagnósticos con estado `pending_validation` / `approved` / `rejected` y firma médica (`validated_by`, `validated_at`). | PK `id`, FK `study_id`, FK `patient_id`, FK `doctor_id`, FK `validated_by`, FK `ai_agent_run_id` |
| 11 | `medications` | Farmacológico | Prescripciones activas/históricas con dosis, vía, instrucciones y advertencias de alimentación. | PK `id`, FK `patient_id`, FK `doctor_id`, FK `tenant_id` |
| 12 | `medication_schedules` | Farmacológico | Horarios de toma por medicamento (`morning`, `afternoon`, `night`, `as_needed`). | PK `id`, FK `medication_id` |
| 13 | `appointments` | Clínico | Citas presenciales y teleconsultas con preparación, modalidad y estado. | PK `id`, FK `tenant_id`, FK `patient_id`, FK `doctor_id` |
| 14 | `ai_agent_runs` | IA / Auditoría | Bitácora obligatoria de ejecución de los 8 agentes IA (entradas, salidas, modelo, latencia, estado/guardrail). | PK `id`, FK `tenant_id`, FK `user_id`, FK `patient_id` |
| 15 | `clinical_documents` | IA / RAG | Guías clínicas y protocolos cargados como base de conocimiento para el Agente 5 (RAG). | PK `id`, FK `tenant_id`, FK `created_by` |
| 16 | `external_api_logs` | Integraciones | Registro de consumo de APIs externas (BCCR, proveedores IA) con código HTTP, latencia y errores. | PK `id` |
| 17 | `exchange_rates` | Integraciones | Histórico diario de tipo de cambio de compra y venta del dólar del BCCR. | PK `id` |
| 18 | `legal_documents` | Gobernanza Ley 8968 | Versiones activas de Política de Privacidad y Términos y Condiciones. | PK `id` |
| 19 | `user_consents` | Gobernanza Ley 8968 | Registro auditable de consentimiento informado explícito por usuario, fecha, IP y documento legal. | PK `id`, FK `user_id`, FK `legal_document_id` |
| 20 | `data_deletion_requests` | Gobernanza Ley 8968 | Solicitudes verificadas de baja/anonimización de cuenta, nota de retención legal y notificación. | PK `id`, FK `user_id` |
