CREATE TYPE public.proposal_status AS ENUM ('draft', 'sent', 'approved');

CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    sku text,
    unit_price numeric(14,2) NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT products_unit_price_non_negative CHECK (unit_price >= 0)
);

CREATE UNIQUE INDEX products_sku_unique_idx
ON public.products(sku)
WHERE sku IS NOT NULL;

CREATE TABLE public.deal_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity numeric(12,2) NOT NULL DEFAULT 1,
    unit_price numeric(14,2) NOT NULL,
    discount_amount numeric(14,2) NOT NULL DEFAULT 0,
    total_amount numeric(14,2) GENERATED ALWAYS AS ((quantity * unit_price) - discount_amount) STORED,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT deal_products_quantity_positive CHECK (quantity > 0),
    CONSTRAINT deal_products_unit_price_non_negative CHECK (unit_price >= 0),
    CONSTRAINT deal_products_discount_non_negative CHECK (discount_amount >= 0),
    CONSTRAINT deal_products_total_non_negative CHECK (((quantity * unit_price) - discount_amount) >= 0)
);

CREATE TABLE public.proposals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id uuid NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
    version integer NOT NULL,
    status public.proposal_status NOT NULL DEFAULT 'draft',
    title text NOT NULL,
    content jsonb NOT NULL DEFAULT '{}'::jsonb,
    total_value numeric(14,2) NOT NULL DEFAULT 0,
    pdf_url text,
    approved_at timestamptz,
    created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT proposals_version_positive CHECK (version > 0),
    CONSTRAINT proposals_total_value_non_negative CHECK (total_value >= 0),
    CONSTRAINT proposals_deal_version_unique UNIQUE (deal_id, version)
);

CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    action text NOT NULL,
    target_table text NOT NULL,
    target_id uuid NOT NULL,
    before jsonb,
    after jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX deal_products_deal_id_idx ON public.deal_products(deal_id);
CREATE INDEX deal_products_product_id_idx ON public.deal_products(product_id);
CREATE INDEX proposals_deal_id_idx ON public.proposals(deal_id);
CREATE INDEX proposals_status_idx ON public.proposals(status);
CREATE INDEX audit_logs_actor_id_idx ON public.audit_logs(actor_id);
CREATE INDEX audit_logs_target_idx ON public.audit_logs(target_table, target_id);

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER deal_products_set_updated_at
BEFORE UPDATE ON public.deal_products
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER proposals_set_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.recalculate_deal_value(target_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.deals
    SET value = COALESCE((
        SELECT SUM(total_amount)
        FROM public.deal_products
        WHERE deal_id = target_deal_id
    ), 0)
    WHERE id = target_deal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_deal_value_from_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.recalculate_deal_value(OLD.deal_id);
        RETURN OLD;
    END IF;

    PERFORM public.recalculate_deal_value(NEW.deal_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER deal_products_recalculate_deal_value
AFTER INSERT OR UPDATE OR DELETE ON public.deal_products
FOR EACH ROW
EXECUTE FUNCTION public.recalculate_deal_value_from_item();

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deal_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_select_authenticated
ON public.products
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY products_write_admin
ON public.products
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY deal_products_select_visible
ON public.deal_products
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_access_owner(d.owner_id)
    )
);

CREATE POLICY deal_products_write_visible
ON public.deal_products
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_write_owner(d.owner_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_write_owner(d.owner_id)
    )
);

CREATE POLICY proposals_select_visible
ON public.proposals
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_access_owner(d.owner_id)
    )
);

CREATE POLICY proposals_write_visible
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_write_owner(d.owner_id)
    )
);

CREATE POLICY proposals_update_visible
ON public.proposals
FOR UPDATE
TO authenticated
USING (
    status <> 'approved'::public.proposal_status
    AND EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_write_owner(d.owner_id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.deals d
        WHERE d.id = deal_id
          AND d.deleted_at IS NULL
          AND public.crm_can_write_owner(d.owner_id)
    )
);

CREATE POLICY audit_logs_select_admin
ON public.audit_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY audit_logs_insert_authenticated
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (actor_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_products TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.proposals TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_deal_value(uuid) TO authenticated;
