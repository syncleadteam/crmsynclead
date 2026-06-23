CREATE OR REPLACE FUNCTION public.submit_landing_infrastructure_lead(
    _client jsonb,
    _agents_quantity text,
    _module_codes text[],
    _observations text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_owner_id uuid;
    v_company_id uuid;
    v_contact_id uuid;
    v_lead_id uuid;
    v_activity_id uuid;
    v_modules jsonb;
    v_total numeric := 0;
    v_score integer := 25;
    v_client_name text := nullif(trim(_client->>'client_name'), '');
    v_phone text := nullif(trim(_client->>'phone'), '');
    v_email text := lower(nullif(trim(_client->>'email'), ''));
    v_company_name text := nullif(trim(_client->>'company_name'), '');
    v_business_sector text := nullif(trim(_client->>'business_sector'), '');
BEGIN
    IF v_client_name IS NULL THEN
        RAISE EXCEPTION 'client_name is required';
    END IF;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'email is required';
    END IF;

    IF v_company_name IS NULL THEN
        RAISE EXCEPTION 'company_name is required';
    END IF;

    IF _agents_quantity NOT IN ('1_agente', '2_agentes', '3_agentes') THEN
        RAISE EXCEPTION 'agents_quantity is invalid';
    END IF;

    SELECT id
    INTO v_owner_id
    FROM public.users
    WHERE is_active = true
    ORDER BY
        CASE role
            WHEN 'admin' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'seller' THEN 3
            ELSE 4
        END,
        created_at
    LIMIT 1;

    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'No active CRM user available to own landing leads';
    END IF;

    WITH selected_modules AS (
        SELECT DISTINCT catalog.code, catalog.name, catalog.price, catalog.position
        FROM (
            VALUES
                ('attendance_agent', 'Agente de Atendimento', 497::numeric, 10),
                ('sales_agent', 'Agente de Vendas', 597::numeric, 20),
                ('support_agent', 'Agente de Suporte', 497::numeric, 30),
                ('faq_ai', 'FAQ Inteligente', 197::numeric, 40),
                ('technical_ai', 'Base Tecnica Avancada', 297::numeric, 50),
                ('auto_scheduling', 'Agendamento Automatico', 247::numeric, 60),
                ('automatic_reminders', 'Lembretes Automaticos', 147::numeric, 70),
                ('whatsapp_group_notifications', 'Resumo em Grupo WhatsApp', 197::numeric, 80),
                ('media_sending', 'Envio de Midia', 197::numeric, 90),
                ('bulk_messaging', 'Disparo em Massa', 297::numeric, 100),
                ('followup', 'Follow Up', 197::numeric, 110)
        ) AS catalog(code, name, price, position)
        WHERE catalog.code = ANY(_module_codes)
    )
    SELECT
        COALESCE(jsonb_agg(
            jsonb_build_object('code', code, 'name', name, 'price', price)
            ORDER BY position
        ), '[]'::jsonb),
        COALESCE(sum(price), 0)
    INTO v_modules, v_total
    FROM selected_modules;

    v_score := LEAST(100, v_score + jsonb_array_length(v_modules) * 6);

    SELECT id
    INTO v_company_id
    FROM public.companies
    WHERE owner_id = v_owner_id
      AND deleted_at IS NULL
      AND lower(name) = lower(v_company_name)
    ORDER BY created_at
    LIMIT 1;

    IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, segment, owner_id)
        VALUES (v_company_name, v_business_sector, v_owner_id)
        RETURNING id INTO v_company_id;
    ELSE
        UPDATE public.companies
        SET segment = COALESCE(v_business_sector, segment)
        WHERE id = v_company_id;
    END IF;

    SELECT id
    INTO v_contact_id
    FROM public.contacts
    WHERE owner_id = v_owner_id
      AND deleted_at IS NULL
      AND lower(email) = v_email
    ORDER BY created_at
    LIMIT 1;

    IF v_contact_id IS NULL THEN
        INSERT INTO public.contacts (full_name, email, phone, company_id, owner_id, source)
        VALUES (v_client_name, v_email, v_phone, v_company_id, v_owner_id, 'landing_page')
        RETURNING id INTO v_contact_id;
    ELSE
        UPDATE public.contacts
        SET full_name = v_client_name,
            phone = COALESCE(v_phone, phone),
            company_id = v_company_id,
            source = COALESCE(source, 'landing_page')
        WHERE id = v_contact_id;
    END IF;

    INSERT INTO public.leads (contact_id, status, score, owner_id)
    VALUES (v_contact_id, 'new', v_score, v_owner_id)
    RETURNING id INTO v_lead_id;

    INSERT INTO public.activities (
        entity_type,
        entity_id,
        actor_type,
        actor_id,
        action,
        metadata
    )
    VALUES (
        'lead',
        v_lead_id,
        'system',
        NULL,
        'landing_infrastructure_form_submitted',
        jsonb_build_object(
            'source', 'landing_page',
            'form', 'infrastructure_personalization',
            'client', jsonb_build_object(
                'client_name', v_client_name,
                'phone', v_phone,
                'email', v_email,
                'company_name', v_company_name,
                'business_sector', v_business_sector
            ),
            'agents_quantity', _agents_quantity,
            'module_codes', to_jsonb(_module_codes),
            'modules', v_modules,
            'estimated_monthly_total', v_total,
            'observations', nullif(trim(_observations), '')
        )
    )
    RETURNING id INTO v_activity_id;

    RETURN jsonb_build_object(
        'leadId', v_lead_id,
        'quoteId', v_lead_id,
        'companyId', v_company_id,
        'contactId', v_contact_id,
        'activityId', v_activity_id,
        'ownerId', v_owner_id,
        'modules', v_modules,
        'total', v_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_landing_infrastructure_lead(jsonb, text, text[], text) TO anon, authenticated;
