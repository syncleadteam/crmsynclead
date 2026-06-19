DO $$
DECLARE
    seed_user_id uuid;
BEGIN
    SELECT id
    INTO seed_user_id
    FROM auth.users
    ORDER BY created_at
    LIMIT 1;

    IF seed_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuario encontrado em auth.users. Crie um usuario no Supabase Auth antes de rodar o seed.';
    END IF;

    INSERT INTO public.users (id, email, full_name, role, is_active)
    SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'Usuario Teste'), 'admin', true
    FROM auth.users
    WHERE id = seed_user_id
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(public.users.full_name, EXCLUDED.full_name),
        is_active = true;

    INSERT INTO public.pipelines (id, name, description, is_active)
    VALUES (
        '10000000-0000-4000-8000-000000000001',
        'Vendas B2B',
        'Pipeline ficticio para testes de CRM',
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.pipeline_stages (id, pipeline_id, name, position, probability, is_won_stage, is_lost_stage)
    VALUES
        ('10000000-0000-4000-8000-000000000101', '10000000-0000-4000-8000-000000000001', 'Prospecção', 1, 10, false, false),
        ('10000000-0000-4000-8000-000000000102', '10000000-0000-4000-8000-000000000001', 'Diagnóstico', 2, 30, false, false),
        ('10000000-0000-4000-8000-000000000103', '10000000-0000-4000-8000-000000000001', 'Proposta', 3, 60, false, false),
        ('10000000-0000-4000-8000-000000000104', '10000000-0000-4000-8000-000000000001', 'Ganho', 4, 100, true, false),
        ('10000000-0000-4000-8000-000000000105', '10000000-0000-4000-8000-000000000001', 'Perdido', 5, 0, false, true)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        position = EXCLUDED.position,
        probability = EXCLUDED.probability,
        is_won_stage = EXCLUDED.is_won_stage,
        is_lost_stage = EXCLUDED.is_lost_stage;

    INSERT INTO public.companies (id, name, document_number, segment, owner_id)
    VALUES
        ('20000000-0000-4000-8000-000000000001', 'Aurora Tech Ltda', '11222333000101', 'SaaS', seed_user_id),
        ('20000000-0000-4000-8000-000000000002', 'Brava Logistica', '22333444000102', 'Logistica', seed_user_id),
        ('20000000-0000-4000-8000-000000000003', 'Clima Solar Energia', '33444555000103', 'Energia', seed_user_id),
        ('20000000-0000-4000-8000-000000000004', 'Delta Health', '44555666000104', 'Saude', seed_user_id)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        document_number = EXCLUDED.document_number,
        segment = EXCLUDED.segment,
        owner_id = EXCLUDED.owner_id,
        deleted_at = NULL;

    INSERT INTO public.contacts (id, full_name, email, phone, company_id, owner_id, source)
    VALUES
        ('30000000-0000-4000-8000-000000000001', 'Marina Costa', 'marina.costa@example.com', '+55 11 90000-1001', '20000000-0000-4000-8000-000000000001', seed_user_id, 'site'),
        ('30000000-0000-4000-8000-000000000002', 'Rafael Nunes', 'rafael.nunes@example.com', '+55 21 90000-1002', '20000000-0000-4000-8000-000000000002', seed_user_id, 'indicacao'),
        ('30000000-0000-4000-8000-000000000003', 'Camila Rocha', 'camila.rocha@example.com', '+55 31 90000-1003', '20000000-0000-4000-8000-000000000003', seed_user_id, 'evento'),
        ('30000000-0000-4000-8000-000000000004', 'Tiago Almeida', 'tiago.almeida@example.com', '+55 41 90000-1004', '20000000-0000-4000-8000-000000000004', seed_user_id, 'linkedin'),
        ('30000000-0000-4000-8000-000000000005', 'Beatriz Lima', 'beatriz.lima@example.com', '+55 51 90000-1005', '20000000-0000-4000-8000-000000000001', seed_user_id, 'campanha')
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        company_id = EXCLUDED.company_id,
        owner_id = EXCLUDED.owner_id,
        source = EXCLUDED.source,
        deleted_at = NULL;

    INSERT INTO public.deals (id, title, company_id, contact_id, pipeline_id, stage_id, value, status, owner_id, expected_close_date, closed_at)
    VALUES
        ('40000000-0000-4000-8000-000000000001', 'Implantacao CRM Aurora', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000103', 18500.00, 'open', seed_user_id, current_date + 20, NULL),
        ('40000000-0000-4000-8000-000000000002', 'Automacao Brava', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000102', 9200.00, 'open', seed_user_id, current_date + 35, NULL),
        ('40000000-0000-4000-8000-000000000003', 'Portal Clima Solar', '20000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000104', 27000.00, 'won', seed_user_id, current_date - 5, now() - interval '2 days'),
        ('40000000-0000-4000-8000-000000000004', 'Relatorios Delta', '20000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000101', 7400.00, 'open', seed_user_id, current_date + 12, NULL)
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        company_id = EXCLUDED.company_id,
        contact_id = EXCLUDED.contact_id,
        pipeline_id = EXCLUDED.pipeline_id,
        stage_id = EXCLUDED.stage_id,
        value = EXCLUDED.value,
        status = EXCLUDED.status,
        owner_id = EXCLUDED.owner_id,
        expected_close_date = EXCLUDED.expected_close_date,
        closed_at = EXCLUDED.closed_at,
        deleted_at = NULL;

    INSERT INTO public.leads (id, contact_id, status, score, owner_id, converted_deal_id)
    VALUES
        ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'converted', 92, seed_user_id, '40000000-0000-4000-8000-000000000001'),
        ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'qualified', 73, seed_user_id, NULL),
        ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'converted', 88, seed_user_id, '40000000-0000-4000-8000-000000000003'),
        ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', 'contacted', 55, seed_user_id, NULL),
        ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', 'new', 41, seed_user_id, NULL)
    ON CONFLICT (id) DO UPDATE
    SET contact_id = EXCLUDED.contact_id,
        status = EXCLUDED.status,
        score = EXCLUDED.score,
        owner_id = EXCLUDED.owner_id,
        converted_deal_id = EXCLUDED.converted_deal_id,
        disqualification_reason = NULL,
        deleted_at = NULL;

    INSERT INTO public.products (id, name, description, sku, unit_price, is_active)
    VALUES
        ('60000000-0000-4000-8000-000000000001', 'Plano CRM Starter', 'Licenca mensal para ate 5 usuarios', 'CRM-STARTER', 499.00, true),
        ('60000000-0000-4000-8000-000000000002', 'Implantacao Assistida', 'Pacote de configuracao inicial e treinamento', 'SERV-IMPL', 3500.00, true),
        ('60000000-0000-4000-8000-000000000003', 'Integracao API', 'Conector customizado para sistemas externos', 'SERV-API', 6200.00, true)
    ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        description = EXCLUDED.description,
        sku = EXCLUDED.sku,
        unit_price = EXCLUDED.unit_price,
        is_active = EXCLUDED.is_active;

    INSERT INTO public.tasks (id, title, type, related_entity_type, related_entity_id, due_at, status, assigned_to)
    VALUES
        ('70000000-0000-4000-8000-000000000001', 'Enviar proposta revisada', 'email', 'deal', '40000000-0000-4000-8000-000000000001', now() + interval '1 day', 'pending', seed_user_id),
        ('70000000-0000-4000-8000-000000000002', 'Ligar para alinhamento tecnico', 'call', 'contact', '30000000-0000-4000-8000-000000000002', now() + interval '2 days', 'pending', seed_user_id),
        ('70000000-0000-4000-8000-000000000003', 'Reuniao de kickoff', 'meeting', 'deal', '40000000-0000-4000-8000-000000000003', now() - interval '1 day', 'completed', seed_user_id)
    ON CONFLICT (id) DO UPDATE
    SET title = EXCLUDED.title,
        type = EXCLUDED.type,
        related_entity_type = EXCLUDED.related_entity_type,
        related_entity_id = EXCLUDED.related_entity_id,
        due_at = EXCLUDED.due_at,
        status = EXCLUDED.status,
        assigned_to = EXCLUDED.assigned_to,
        completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN COALESCE(public.tasks.completed_at, now()) ELSE NULL END,
        canceled_at = NULL;
END $$;
