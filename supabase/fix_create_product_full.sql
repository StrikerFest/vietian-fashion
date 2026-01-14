-- FIX: Correcting JSONB access in create_product_full function
-- The error was caused by trying to use ->> directly on a record variable instead of the .value column.

CREATE OR REPLACE FUNCTION "public"."create_product_full"("payload" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
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
                v_image.value->>'image_url', -- Fixed: Access .value
                COALESCE((v_image.value->>'is_primary')::BOOLEAN, false), -- Fixed: Access .value
                COALESCE(v_image.value->>'alt_text', payload->>'name') -- Fixed: Access .value
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
            v_variant.value->>'sku', -- Fixed: Access .value
            (v_variant.value->>'price')::NUMERIC -- Fixed: Access .value
        ) RETURNING id INTO v_variant_id;

        -- Insert Inventory
        INSERT INTO inventory_levels (
            variant_id, 
            on_hand
        ) VALUES (
            v_variant_id,
            COALESCE((v_variant.value->>'on_hand')::INT, 0) -- Fixed: Access .value
        );

        -- Insert Variant Attributes
        IF jsonb_typeof(v_variant.value->'attribute_value_ids') = 'array' THEN -- Fixed: Access .value
            INSERT INTO variant_attributes (variant_id, attribute_value_id)
            SELECT v_variant_id, (value)::BIGINT
            FROM jsonb_array_elements_text(v_variant.value->'attribute_value_ids'); -- Fixed: Access .value
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

    -- Insert Attribute Categories
    IF jsonb_typeof(payload->'attribute_ids') = 'array' THEN
        INSERT INTO product_categories (product_id, category_id)
        SELECT v_product_id, (value)::BIGINT
        FROM jsonb_array_elements_text(payload->'attribute_ids')
        WHERE (value)::BIGINT != COALESCE((payload->>'category_id')::BIGINT, -1)
        ON CONFLICT DO NOTHING;
    END IF;

    -- Return the Created Product Data
    RETURN (
        SELECT row_to_json(p) FROM products p WHERE p.id = v_product_id
    );

EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$;
