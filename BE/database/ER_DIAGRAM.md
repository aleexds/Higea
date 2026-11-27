# Diagrama Entidad-Relación (ER) — Higea

Base de datos relacional normalizada en **Tercera Forma Normal (3FN)** implementada en **MySQL** con **Sequelize**.

## Dominios de Datos
1. **Seguridad y Multi-Tenancy**: `tenants`, `users`, `roles`, `user_roles`, `api_keys`
2. **Gestión Clínica y Farmacológica**: `patients`, `doctor_patients`, `clinical_orders`, `diagnostic_studies`, `diagnostic_reports`, `medications`, `medication_schedules`, `appointments`
3. **Trazabilidad de IA, RAG e Integraciones**: `ai_agent_runs`, `clinical_documents`, `external_api_logs`, `exchange_rates`
4. **Gobernanza de Datos (Ley N.º 8968)**: `legal_documents`, `user_consents`, `data_deletion_requests`

```mermaid
erDiagram
    tenants ||--o{ users : "has"
    tenants ||--o{ api_keys : "owns"
    tenants ||--o{ patients : "serves"
    tenants ||--o{ clinical_orders : "hosts"
    tenants ||--o{ diagnostic_studies : "stores"
    tenants ||--o{ appointments : "schedules"
    tenants ||--o{ ai_agent_runs : "audits"

    users ||--o{ user_roles : "assigned"
    roles ||--o{ user_roles : "grants"
    users ||--o| patients : "has_profile"
    users ||--o{ doctor_patients : "treats"
    patients ||--o{ doctor_patients : "assigned_to"

    patients ||--o{ clinical_orders : "receives"
    users ||--o{ clinical_orders : "orders"
    clinical_orders ||--o{ diagnostic_studies : "generates"
    patients ||--o{ diagnostic_studies : "undergoes"
    diagnostic_studies ||--o{ diagnostic_reports : "produces"
    patients ||--o{ diagnostic_reports : "owns"
    ai_agent_runs |o--o{ diagnostic_reports : "drafts"

    patients ||--o{ medications : "prescribed"
    medications ||--o{ medication_schedules : "has_schedule"
    patients ||--o{ appointments : "attends"
    users ||--o{ appointments : "conducts"

    users ||--o{ user_consents : "accepts"
    legal_documents ||--o{ user_consents : "versioned_in"
    users ||--o{ data_deletion_requests : "requests"
    users ||--o{ ai_agent_runs : "invokes"
    users ||--o{ clinical_documents : "uploads"
```

## Cardinalidades Clave
- `users` ↔ `roles`: **N:M** mediante `user_roles` (clave única compuesta `user_id, role_id`).
- `users` (médicos) ↔ `patients`: **N:M** mediante `doctor_patients`.
- `users` ↔ `patients`: **1:1** (`patients.user_id` único).
- `tenants` → `api_keys`: **1:N** (cada clínica puede rotar o revocar múltiples llaves).
- `diagnostic_studies` → `diagnostic_reports`: **1:N** con flujo obligatorio `pending_validation` → `approved` (validado por un médico).
- `medications` → `medication_schedules`: **1:N** (horarios mañana/tarde/noche).
- `legal_documents` → `user_consents`: **1:N** (trazabilidad de aceptación por versión de Política de Privacidad y Términos).
