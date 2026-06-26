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
    v_deal_id uuid;
    v_pipeline_id uuid;
    v_stage_id uuid;
    v_activity_id uuid;
    v_deal_activity_id uuid;
    v_modules jsonb;
    v_total numeric := 0;
    v_score integer := 25;
    v_client_name text := nullif(trim(_client->>'client_name'), '');
    v_phone text := nullif(trim(_client->>'phone'), '');
    v_email text := lower(nullif(trim(_client->>'email'), ''));
    v_company_name text := nullif(trim(_client->>'company_name'), '');
    v_business_sector text := nullif(trim(_client->>'business_sector'), '');
    v_requested_count integer;
    v_active_count integer;
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

    SELECT p.id, ps.id
    INTO v_pipeline_id, v_stage_id
    FROM public.pipelines p
    JOIN public.pipeline_stages ps ON ps.pipeline_id = p.id
    WHERE p.is_active = true
    ORDER BY
        p.created_at,
        CASE WHEN ps.is_won_stage OR ps.is_lost_stage THEN 1 ELSE 0 END,
        ps.position,
        ps.created_at
    LIMIT 1;

    IF v_pipeline_id IS NULL OR v_stage_id IS NULL THEN
        RAISE EXCEPTION 'No active CRM pipeline stage available for landing opportunities';
    END IF;

    SELECT COUNT(DISTINCT code)
    INTO v_requested_count
    FROM unnest(_module_codes) AS code;

    SELECT COUNT(DISTINCT landing_form_code)
    INTO v_active_count
    FROM public.products
    WHERE is_active = true
      AND landing_form_code = ANY(_module_codes)
      AND landing_form_category IN ('agent', 'module');

    IF v_requested_count <> v_active_count THEN
        RAISE EXCEPTION 'One or more selected landing products are inactive or invalid';
    END IF;

    WITH selected_modules AS (
        SELECT DISTINCT
            p.landing_form_code AS code,
            p.name,
            p.unit_price AS price,
            p.landing_form_position AS position,
            p.landing_form_category AS category
        FROM public.products p
        WHERE p.is_active = true
          AND p.landing_form_code = ANY(_module_codes)
          AND p.landing_form_category IN ('agent', 'module')
    )
    SELECT
        COALESCE(jsonb_agg(
            jsonb_build_object('code', code, 'name', name, 'price', price)
            ORDER BY CASE category WHEN 'agent' THEN 1 ELSE 2 END, position
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

    INSERT INTO public.deals (
        title,
        company_id,
        contact_id,
        pipeline_id,
        stage_id,
        value,
        status,
        owner_id
    )
    VALUES (
        'Orcamento SyncLead - ' || v_company_name,
        v_company_id,
        v_contact_id,
        v_pipeline_id,
        v_stage_id,
        v_total,
        'open',
        v_owner_id
    )
    RETURNING id INTO v_deal_id;

    INSERT INTO public.leads (contact_id, status, score, owner_id, converted_deal_id)
    VALUES (v_contact_id, 'converted', v_score, v_owner_id, v_deal_id)
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
            'converted_deal_id', v_deal_id,
            'observations', nullif(trim(_observations), '')
        )
    )
    RETURNING id INTO v_activity_id;

    INSERT INTO public.activities (
        entity_type,
        entity_id,
        actor_type,
        actor_id,
        action,
        metadata
    )
    VALUES (
        'deal',
        v_deal_id,
        'system',
        NULL,
        'created_from_landing_lead',
        jsonb_build_object(
            'source', 'landing_page',
            'lead_id', v_lead_id,
            'modules', v_modules,
            'estimated_monthly_total', v_total
        )
    )
    RETURNING id INTO v_deal_activity_id;

    RETURN jsonb_build_object(
        'leadId', v_lead_id,
        'quoteId', v_deal_id,
        'dealId', v_deal_id,
        'companyId', v_company_id,
        'contactId', v_contact_id,
        'pipelineId', v_pipeline_id,
        'stageId', v_stage_id,
        'activityId', v_activity_id,
        'dealActivityId', v_deal_activity_id,
        'ownerId', v_owner_id,
        'modules', v_modules,
        'total', v_total
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_landing_infrastructure_lead(jsonb, text, text[], text) TO anon, authenticated;
