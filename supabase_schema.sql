-- AUTOSLASH DASHBOARD V4 : THE ORACLE INFRASTRUCTURE
-- INFRASTRUCTURE MAÎTRESSE : MULTI-TENANT NEURAL ROUTING

-- ACTION 1: PURGE SQL (RESET TOTAL)
DROP TABLE IF EXISTS public.agent_config CASCADE;
DROP TABLE IF EXISTS public.system_logs CASCADE;
DROP TABLE IF EXISTS public.oracle_global_settings CASCADE;
DROP TABLE IF EXISTS public.enterprise_backups CASCADE;
DROP TABLE IF EXISTS public.api_credentials CASCADE;
DROP TABLE IF EXISTS public.compliance_docs CASCADE;
DROP TABLE IF EXISTS public.communication_logs CASCADE;
DROP TABLE IF EXISTS public.domain_experts CASCADE;
DROP TABLE IF EXISTS public.system_health_records CASCADE;
DROP TABLE IF EXISTS public.agent_metrics CASCADE;
DROP TABLE IF EXISTS public.token_usage_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.client_subscriptions CASCADE;
DROP TABLE IF EXISTS public.plan_definitions CASCADE;
DROP TABLE IF EXISTS public.enterprise_kb CASCADE;
DROP TABLE IF EXISTS public.skills_library CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.enterprises CASCADE;
DROP TABLE IF EXISTS public.fleet_registry CASCADE;

-- ACTION 2: CRÉATION DES ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type_enum') THEN
        CREATE TYPE plan_type_enum AS ENUM ('STARTUP', 'BUSINESS', 'ENTERPRISE', 'ELITE');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'system_status_enum') THEN
        CREATE TYPE system_status_enum AS ENUM ('STABLE', 'WARNING', 'CRITICAL');
    END IF;
END $$;

-- 1. Table Maîtresse : Enterprises
CREATE TABLE public.enterprises (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sector TEXT,
    package_type plan_type_enum DEFAULT 'STARTUP',
    status system_status_enum DEFAULT 'STABLE',
    warning_flag BOOLEAN DEFAULT FALSE,
    region TEXT DEFAULT 'EU-WEST-1',
    comm_mode TEXT DEFAULT 'AUTONOMOUS',
    brand_color TEXT DEFAULT '#4ade80',
    total_tokens_consumed BIGINT DEFAULT 0,
    token_budget BIGINT DEFAULT 1000000,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles (RBAC)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    is_admin BOOLEAN DEFAULT FALSE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT
);

-- 3. Agents (Protocoles)
CREATE TABLE public.agents (
    id TEXT PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    system_prompt TEXT,
    model_config JSONB DEFAULT '{"model": "gemini-1.5-pro", "provider": "google"}'::jsonb,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Skills Library
CREATE TABLE public.skills_library (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enterprise KB (Knowledge Hub)
CREATE TABLE public.enterprise_kb (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    category TEXT,
    embedding VECTOR(1536), -- If pgvector is enabled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Plan Definitions
CREATE TABLE public.plan_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    token_limit BIGINT,
    agent_limit INTEGER,
    price_cents INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Client Subscriptions
CREATE TABLE public.client_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plan_definitions(id),
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    actor_id UUID REFERENCES public.profiles(id),
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Token Usage Logs
CREATE TABLE public.token_usage_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES public.agents(id),
    tokens_count INTEGER NOT NULL,
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Agent Metrics
CREATE TABLE public.agent_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    agent_id TEXT REFERENCES public.agents(id) ON DELETE CASCADE,
    latency_ms INTEGER,
    success_rate FLOAT,
    avg_tokens_per_req INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. System Health Records
CREATE TABLE public.system_health_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    component TEXT,
    status TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Domain Experts
CREATE TABLE public.domain_experts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    expertise TEXT,
    bio TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Communication Logs
CREATE TABLE public.communication_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    channel TEXT,
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Compliance Docs
CREATE TABLE public.compliance_docs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    title TEXT,
    doc_url TEXT,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. API Credentials
CREATE TABLE public.api_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    provider TEXT,
    encrypted_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Enterprise Backups
CREATE TABLE public.enterprise_backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    backup_url TEXT,
    size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 17. Oracle Global Settings
CREATE TABLE public.oracle_global_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 18. System Logs (Dynamization Requirement)
CREATE TABLE public.system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    raw_data JSONB,
    status_color TEXT,
    error_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. Agent Config (Dynamization Requirement)
CREATE TABLE public.agent_config (
    agent_id TEXT PRIMARY KEY,
    enterprise_id UUID REFERENCES public.enterprises(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT,
    status TEXT DEFAULT 'IDLE',
    current_task TEXT,
    neural_load INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ACTION 3: RLS POLICIES
ALTER TABLE public.enterprises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read for enterprises" ON public.enterprises FOR SELECT USING (true);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Simplified policies for demonstration
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents broad access" ON public.agents FOR ALL USING (true);

ALTER TABLE public.skills_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills broad access" ON public.skills_library FOR ALL USING (true);

ALTER TABLE public.enterprise_kb ENABLE ROW LEVEL SECURITY;
CREATE POLICY "KB broad access" ON public.enterprise_kb FOR ALL USING (true);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "System logs broad access" ON public.system_logs FOR ALL USING (true);

ALTER TABLE public.agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agent config broad access" ON public.agent_config FOR ALL USING (true);

-- ACTION 4: SEED DATA
INSERT INTO public.plan_definitions (name, token_limit, agent_limit, price_cents)
VALUES 
    ('STARTUP_PLAN', 1000000, 2, 2900),
    ('BUSINESS_PLAN', 5000000, 10, 9900),
    ('ENTERPRISE_PLAN', 50000000, 100, 49900);

-- Insert dummy enterprises for initial table load
INSERT INTO public.enterprises (id, name, sector, package_type, status, brand_color)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Nexus Global', 'TECH', 'ENTERPRISE', 'STABLE', '#4ade80'),
    ('00000000-0000-0000-0000-000000000002', 'Aether Dynamics', 'FINANCE', 'BUSINESS', 'WARNING', '#3b82f6'),
    ('00000000-0000-0000-0000-000000000003', 'Alpha Systems', 'HEALTH', 'STARTUP', 'STABLE', '#f97316');

INSERT INTO public.agents (id, enterprise_id, name, status)
VALUES 
    ('ORCH_01', '00000000-0000-0000-0000-000000000001', 'Nexus Orchestrator', 'active'),
    ('DEV_01', '00000000-0000-0000-0000-000000000002', 'Dynamics Dev Agent', 'active');

-- SEED AGENT_CONFIG
INSERT INTO public.agent_config (agent_id, enterprise_id, name, role, status, current_task, neural_load)
VALUES 
    ('ARCHITECTE', '00000000-0000-0000-0000-000000000001', 'Oracle Architect', 'System Design', 'PROCESSING', 'Refining Neural Lattice Architecture', 85),
    ('BACKEND', '00000000-0000-0000-0000-000000000001', 'Core Engine', 'Data Layer', 'IDLE', NULL, 12),
    ('FRONTEND', '00000000-0000-0000-0000-000000000002', 'Visual Synapse', 'UI/UX', 'PROCESSING', 'Optimizing Dashboard Latency', 45),
    ('QA', '00000000-0000-0000-0000-000000000003', 'Lattice Guard', 'Testing', 'IDLE', NULL, 0),
    ('AI_CORE', '00000000-0000-0000-0000-000000000001', 'Cortex Prime', 'AI Logic', 'PROCESSING', 'Analyzing Multi-Tenant Patterns', 92);

-- SEED SYSTEM_LOGS (Last 7 days)
INSERT INTO public.system_logs (enterprise_id, event_type, raw_data, status_color, created_at)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'DEPLOYMENT', '{"version": "v3.1", "status": "success"}', '#4ade80', NOW() - INTERVAL '6 days'),
    ('00000000-0000-0000-0000-000000000002', 'WARNING', '{"message": "Packet delay spikes detected"}', '#fbbf24', NOW() - INTERVAL '5 days'),
    ('00000000-0000-0000-0000-000000000003', 'DEPLOYMENT', '{"version": "v1.0", "status": "live"}', '#4ade80', NOW() - INTERVAL '4 days'),
    ('00000000-0000-0000-0000-000000000001', 'CRITICAL', '{"error": "Neural sync collision"}', '#ef4444', NOW() - INTERVAL '3 days'),
    ('00000000-0000-0000-0000-000000000002', 'DEPLOYMENT', '{"version": "v3.2", "status": "success"}', '#4ade80', NOW() - INTERVAL '2 days'),
    ('00000000-0000-0000-0000-000000000003', 'WARNING', '{"message": "Memory threshold exceeded"}', '#fbbf24', NOW() - INTERVAL '1 day'),
    ('00000000-0000-0000-0000-000000000001', 'DEPLOYMENT', '{"version": "v4.0", "status": "active"}', '#4ade80', NOW());
