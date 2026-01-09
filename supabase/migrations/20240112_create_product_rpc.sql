-- Migration: Create Product Atomic RPC
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION create_product_full(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually admin/postgres)
AS $$
DECLARE
    v_product_id BIGINT;
    v_variant_id BIGINT;
    v_variant RECORD;
    v_image RECORD;
    v_attr_id BIGINT;
    v_col_id BIGINT;
    v_cat_id BIGINT;
    v_sku_check RECORD;
    v_sku_list TEXT[];
BEGIN
    -- 1. Validation: Check for duplicate SKUs in the payload
    -- We can't easily check internal duplicates in JSONB in pure SQL without a complex query, 
    -- so we assume the caller (API) did a basic check. 
    -- But we MUST check against the database.
    
    -- Extract SKUs from payload to check existence
    SELECT ARRAY_AGG(v->>'sku') INTO v_sku_list
    FROM jsonb_array_elements(payload->'variants') AS v;

    IF EXISTS (
        SELECT 1 FROM product_variants WHERE sku = ANY(v_sku_list)
    ) THEN
        RAISE EXCEPTION 'SKU already exists in database.';
    END IF;

    -- 2. Insert Product
    INSERT INTO products (
        name, 
        description, 
        image_url, 
        seo_title, 
        seo_description, 
        position, 
        status
    ) VALUES (
        payload->>'name',
        payload->>'description',
        payload->>'image_url', -- Main Legacy Image
        payload->>'seo_title',
        payload->>'seo_description',
        COALESCE((payload->>'position')::INT, 0),
        COALESCE(payload->>'status', 'draft')
    ) RETURNING id INTO v_product_id;

    -- 3. Insert Images
    IF jsonb_array_length(payload->'images') > 0 THEN
        FOR v_image IN SELECT * FROM jsonb_array_elements(payload->'images')
        LOOP
            INSERT INTO product_images (
                product_id, 
                image_url, 
                is_primary, 
                alt_text
            ) VALUES (
                v_product_id,
                v_image->>'image_url',
                COALESCE((v_image->>'is_primary')::BOOLEAN, false),
                COALESCE(v_image->>'alt_text', payload->>'name')
            );
        END LOOP;
    END IF;

    -- 4. Insert Variants & Inventory & Attributes
    FOR v_variant IN SELECT * FROM jsonb_array_elements(payload->'variants')
    LOOP
        -- Insert Variant
        INSERT INTO product_variants (
            product_id, 
            sku, 
            price
        ) VALUES (
            v_product_id,
            v_variant->>'sku',
            (v_variant->>'price')::NUMERIC
        ) RETURNING id INTO v_variant_id;

        -- Insert Inventory
        INSERT INTO inventory_levels (
            variant_id, 
            on_hand
        ) VALUES (
            v_variant_id,
            COALESCE((v_variant->>'on_hand')::INT, 0)
        );

        -- Insert Variant Attributes
        -- v_variant->'attribute_value_ids' is expected to be an array of IDs
        IF jsonb_typeof(v_variant->'attribute_value_ids') = 'array' THEN
            INSERT INTO variant_attributes (variant_id, attribute_value_id)
            SELECT v_variant_id, (value)::BIGINT
            FROM jsonb_array_elements_text(v_variant->'attribute_value_ids');
        END IF;
    END LOOP;

    -- 5. Insert Collections
    IF jsonb_typeof(payload->'collection_ids') = 'array' THEN
        INSERT INTO product_collections (product_id, collection_id)
        SELECT v_product_id, (value)::BIGINT
        FROM jsonb_array_elements_text(payload->'collection_ids');
    END IF;

    -- 6. Insert Categories (Catalog + Attributes)
    -- Insert Main Category
    IF payload->>'category_id' IS NOT NULL THEN
        INSERT INTO product_categories (product_id, category_id)
        VALUES (v_product_id, (payload->>'category_id')::BIGINT);
    END IF;

    -- Insert Attribute Categories (if they are passed as 'attribute_ids' array in payload)
    IF jsonb_typeof(payload->'attribute_ids') = 'array' THEN
        INSERT INTO product_categories (product_id, category_id)
        SELECT v_product_id, (value)::BIGINT
        FROM jsonb_array_elements_text(payload->'attribute_ids')
        WHERE (value)::BIGINT != COALESCE((payload->>'category_id')::BIGINT, -1) -- Avoid duplicate
        ON CONFLICT DO NOTHING; -- Just in case
    END IF;

    -- Return the Created Product Data
    RETURN (
        SELECT row_to_json(p) FROM products p WHERE p.id = v_product_id
    );

EXCEPTION WHEN OTHERS THEN
    -- Propagate error to cancel transaction
    RAISE;
END;
$$;
