


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_return_request"("request_id" bigint, "notes" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_return_request RECORD;
    v_order_item RECORD;
    v_order_totals RECORD;
    v_order_id bigint;
BEGIN
    -- 1. Get the return request details
    SELECT * INTO v_return_request
    FROM public.return_requests
    WHERE id = request_id;

    IF v_return_request IS NULL THEN
        RAISE EXCEPTION 'Return request not found.';
    END IF;

    IF v_return_request.status != 'pending' THEN
        RAISE EXCEPTION 'Return request has already been processed.';
    END IF;
    
    v_order_id := v_return_request.order_id;

    -- 2. Update the return request status
    UPDATE public.return_requests
    SET 
        status = 'approved',
        admin_notes = notes
    WHERE id = request_id;

    -- 3. Loop through items
    FOR v_order_item IN
        SELECT 
            ri.quantity, 
            ri.should_restock, 
            oi.id AS order_item_id, 
            oi.variant_id
        FROM public.return_items AS ri
        JOIN public.order_items AS oi ON ri.order_item_id = oi.id
        WHERE ri.return_request_id = request_id
    LOOP
        -- 4a. Restock inventory AND LOG IT (Critical Fix)
        IF v_order_item.should_restock THEN
            -- Update stock
            UPDATE public.inventory_levels
            SET on_hand = on_hand + v_order_item.quantity
            WHERE variant_id = v_order_item.variant_id;

            -- Insert Audit Log
            INSERT INTO public.inventory_adjustments 
                (variant_id, quantity_change, reason, user_id)
            VALUES 
                (
                    v_order_item.variant_id, 
                    v_order_item.quantity, 
                    'Return Request #' || request_id, 
                    v_return_request.user_id -- Attribute to the customer who returned it
                );
        END IF;
        
        -- 4b. Update order item
        UPDATE public.order_items
        SET returned_quantity = returned_quantity + v_order_item.quantity
        WHERE id = v_order_item.order_item_id;
        
    END LOOP;

    -- 5. Check total refund status
    SELECT 
        SUM(quantity) AS total_ordered, 
        SUM(returned_quantity) AS total_returned
    INTO v_order_totals
    FROM public.order_items
    WHERE order_id = v_order_id;

    -- 6. Update main order status
    IF v_order_totals.total_returned >= v_order_totals.total_ordered THEN
        UPDATE public.orders
        SET status = 'refunded'
        WHERE id = v_order_id;
    ELSE
        UPDATE public.orders
        SET status = 'partially-refunded'
        WHERE id = v_order_id;
    END IF;

    RETURN 'Return approved, inventory updated, and audit log created.';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to approve return: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."approve_return_request"("request_id" bigint, "notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.user_roles
  WHERE user_id = auth.uid();

  RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "deleted_at" timestamp with time zone,
    "image_url" "text",
    "position" integer DEFAULT 0
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_products_by_tags"("tag_names" "text"[]) RETURNS SETOF "public"."products"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RETURN QUERY
    WITH ranked_products AS (
        SELECT
            p.id,
            COUNT(p.id) AS matches
        FROM
            products p
        -- Join with the Unified Categories table instead of Tags
        JOIN
            product_categories pc ON p.id = pc.product_id
        JOIN
            categories c ON pc.category_id = c.id
        WHERE
            -- Only look at Attributes (not Navigation catalogs)
            c.type = 'attribute'
            -- Match the AI-generated tags against Attribute names (case-insensitive)
            AND c.name ILIKE ANY(tag_names)
            AND p.deleted_at IS NULL
        GROUP BY
            p.id
        ORDER BY
            matches DESC
        LIMIT 20
    )
    SELECT p.*
    FROM products p
    JOIN ranked_products rp ON p.id = rp.id
    ORDER BY rp.matches DESC;
END;
$$;


ALTER FUNCTION "public"."search_products_by_tags"("tag_names" "text"[]) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."addresses" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "address_line_1" "text" NOT NULL,
    "address_line_2" "text",
    "city" "text" NOT NULL,
    "state_province_region" "text" NOT NULL,
    "postal_code" "text" NOT NULL,
    "country" "text" NOT NULL,
    "is_default" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."addresses" OWNER TO "postgres";


ALTER TABLE "public"."addresses" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."addresses_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_id" bigint,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "seo_title" "text",
    "seo_description" "text",
    "deleted_at" timestamp with time zone,
    "type" "text" DEFAULT 'catalog'::"text" NOT NULL,
    "display_style" "text" DEFAULT 'list'::"text",
    "value" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    CONSTRAINT "categories_type_check" CHECK (("type" = ANY (ARRAY['catalog'::"text", 'attribute'::"text"])))
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


ALTER TABLE "public"."categories" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."collections" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "is_featured" boolean DEFAULT false NOT NULL,
    "seo_title" "text",
    "seo_description" "text",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."collections" OWNER TO "postgres";


ALTER TABLE "public"."collections" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."collections_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."discounts" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "value" numeric NOT NULL,
    "start_date" timestamp with time zone,
    "end_date" timestamp with time zone,
    "is_active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."discounts" OWNER TO "postgres";


ALTER TABLE "public"."discounts" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."discounts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "body_html" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


ALTER TABLE "public"."email_templates" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."email_templates_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory_adjustments" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variant_id" bigint,
    "user_id" bigint,
    "quantity_change" bigint NOT NULL,
    "reason" "text" NOT NULL
);


ALTER TABLE "public"."inventory_adjustments" OWNER TO "postgres";


ALTER TABLE "public"."inventory_adjustments" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_adjustments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."inventory_levels" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "variant_id" bigint NOT NULL,
    "on_hand" bigint DEFAULT '0'::bigint NOT NULL,
    "committed" bigint DEFAULT '0'::bigint NOT NULL
);


ALTER TABLE "public"."inventory_levels" OWNER TO "postgres";


ALTER TABLE "public"."inventory_levels" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."inventory_levels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."option_sets" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "title" "text" NOT NULL,
    "priority" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "rules" "jsonb" DEFAULT '[]'::"jsonb",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."option_sets" OWNER TO "postgres";


ALTER TABLE "public"."option_sets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."option_sets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_discounts" (
    "order_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "discount_id" bigint NOT NULL
);


ALTER TABLE "public"."order_discounts" OWNER TO "postgres";


ALTER TABLE "public"."order_discounts" ALTER COLUMN "order_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."order_discounts_order_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" bigint,
    "variant_id" bigint,
    "quantity" bigint NOT NULL,
    "price_at_purchase" numeric NOT NULL,
    "returned_quantity" bigint DEFAULT 0 NOT NULL,
    "custom_options" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


ALTER TABLE "public"."order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "shipping_address_id" bigint,
    "subtotal" numeric NOT NULL,
    "total_amount" numeric NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "shipping_carrier" "text",
    "tracking_number" "text",
    CONSTRAINT "status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'paid'::"text", 'shipped'::"text", 'delivered'::"text", 'cancelled'::"text", 'refunded'::"text", 'partially-refunded'::"text"])))
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


ALTER TABLE "public"."orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "product_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "category_id" bigint NOT NULL
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


ALTER TABLE "public"."product_categories" ALTER COLUMN "product_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_categories_product_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_collections" (
    "product_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "collection_id" bigint NOT NULL
);


ALTER TABLE "public"."product_collections" OWNER TO "postgres";


ALTER TABLE "public"."product_collections" ALTER COLUMN "product_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_collections_product_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_images" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "product_id" bigint,
    "image_url" "text" NOT NULL,
    "alt_text" "text",
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."product_images" OWNER TO "postgres";


ALTER TABLE "public"."product_images" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_images_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_options" (
    "id" bigint NOT NULL,
    "option_set_id" bigint,
    "type" "text" NOT NULL,
    "label" "text" NOT NULL,
    "is_required" boolean DEFAULT false,
    "position" integer DEFAULT 0,
    "values" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."product_options" OWNER TO "postgres";


ALTER TABLE "public"."product_options" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_options_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "sku" "text" NOT NULL,
    "price" numeric DEFAULT '0'::numeric NOT NULL,
    "size" "text",
    "color" "text",
    "product_id" bigint
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


ALTER TABLE "public"."product_variants" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."product_variants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."products" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."products_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "purchase_order_id" bigint,
    "variant_id" bigint,
    "quantity" bigint NOT NULL,
    "cost_price" numeric
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


ALTER TABLE "public"."purchase_order_items" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_order_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "supplier_id" bigint,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "order_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expected_date" timestamp with time zone
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


ALTER TABLE "public"."purchase_orders" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."purchase_orders_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."return_items" (
    "id" bigint NOT NULL,
    "return_request_id" bigint NOT NULL,
    "order_item_id" bigint NOT NULL,
    "quantity" bigint NOT NULL,
    "should_restock" boolean DEFAULT true NOT NULL
);


ALTER TABLE "public"."return_items" OWNER TO "postgres";


ALTER TABLE "public"."return_items" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."return_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."return_requests" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "order_id" bigint NOT NULL,
    "user_id" bigint,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "reason" "text",
    "admin_notes" "text"
);


ALTER TABLE "public"."return_requests" OWNER TO "postgres";


ALTER TABLE "public"."return_requests" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."return_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" bigint,
    "product_id" bigint,
    "rating" smallint,
    "comment" "text",
    "is_approved" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


ALTER TABLE "public"."reviews" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL,
    "contact_person" "text",
    "email" "text",
    "phone" "text",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


ALTER TABLE "public"."suppliers" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."suppliers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "phone" "text",
    "is_admin" boolean DEFAULT false NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE "public"."users" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."users_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."variant_attributes" (
    "id" bigint NOT NULL,
    "variant_id" bigint,
    "attribute_value_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."variant_attributes" OWNER TO "postgres";


ALTER TABLE "public"."variant_attributes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."variant_attributes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


ALTER TABLE "public"."wishlists" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."wishlists_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collections"
    ADD CONSTRAINT "collections_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."discounts"
    ADD CONSTRAINT "discounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_variant_id_key" UNIQUE ("variant_id");



ALTER TABLE ONLY "public"."option_sets"
    ADD CONSTRAINT "option_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_discounts"
    ADD CONSTRAINT "order_discounts_pkey" PRIMARY KEY ("order_id", "created_at", "discount_id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id", "category_id");



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_pkey" PRIMARY KEY ("product_id", "collection_id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_order_item_id_return_request_id_key" UNIQUE ("order_item_id", "return_request_id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."return_requests"
    ADD CONSTRAINT "return_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."settings"
    ADD CONSTRAINT "settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_attributes"
    ADD CONSTRAINT "variant_attributes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_attributes"
    ADD CONSTRAINT "variant_attributes_variant_id_attribute_value_id_key" UNIQUE ("variant_id", "attribute_value_id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_product_id_key" UNIQUE ("user_id", "product_id");



CREATE INDEX "idx_categories_deleted_at" ON "public"."categories" USING "btree" ("deleted_at");



CREATE INDEX "idx_collections_deleted_at" ON "public"."collections" USING "btree" ("deleted_at");



CREATE INDEX "idx_discounts_deleted_at" ON "public"."discounts" USING "btree" ("deleted_at");



CREATE INDEX "idx_inventory_levels_variant_id" ON "public"."inventory_levels" USING "btree" ("variant_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_orders_user_id" ON "public"."orders" USING "btree" ("user_id");



CREATE INDEX "idx_product_variants_product_id" ON "public"."product_variants" USING "btree" ("product_id");



CREATE INDEX "idx_products_deleted_at" ON "public"."products" USING "btree" ("deleted_at");



CREATE INDEX "idx_products_position" ON "public"."products" USING "btree" ("position" DESC);



CREATE INDEX "idx_reviews_deleted_at" ON "public"."reviews" USING "btree" ("deleted_at");



CREATE INDEX "idx_suppliers_deleted_at" ON "public"."suppliers" USING "btree" ("deleted_at");



CREATE INDEX "idx_users_deleted_at" ON "public"."users" USING "btree" ("deleted_at");



CREATE INDEX "return_items_order_item_id_idx" ON "public"."return_items" USING "btree" ("order_item_id");



CREATE INDEX "return_items_return_request_id_idx" ON "public"."return_items" USING "btree" ("return_request_id");



CREATE INDEX "return_requests_order_id_idx" ON "public"."return_requests" USING "btree" ("order_id");



ALTER TABLE ONLY "public"."addresses"
    ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."inventory_adjustments"
    ADD CONSTRAINT "inventory_adjustments_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."inventory_levels"
    ADD CONSTRAINT "inventory_levels_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_discounts"
    ADD CONSTRAINT "order_discounts_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "public"."discounts"("id");



ALTER TABLE ONLY "public"."order_discounts"
    ADD CONSTRAINT "order_discounts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_shipping_address_id_fkey" FOREIGN KEY ("shipping_address_id") REFERENCES "public"."addresses"("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id");



ALTER TABLE ONLY "public"."product_collections"
    ADD CONSTRAINT "product_collections_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_images"
    ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."product_options"
    ADD CONSTRAINT "product_options_option_set_id_fkey" FOREIGN KEY ("option_set_id") REFERENCES "public"."option_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."return_items"
    ADD CONSTRAINT "return_items_return_request_id_fkey" FOREIGN KEY ("return_request_id") REFERENCES "public"."return_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."return_requests"
    ADD CONSTRAINT "return_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."return_requests"
    ADD CONSTRAINT "return_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_attributes"
    ADD CONSTRAINT "variant_attributes_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_attributes"
    ADD CONSTRAINT "variant_attributes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admin full access option_sets" ON "public"."option_sets" USING ((( SELECT "user_roles"."role"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admin full access product_options" ON "public"."product_options" USING ((( SELECT "user_roles"."role"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins manage templates" ON "public"."email_templates" USING ((( SELECT "user_roles"."role"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow admin update" ON "public"."settings" USING ((( SELECT "user_roles"."role"
   FROM "public"."user_roles"
  WHERE ("user_roles"."user_id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Allow public read access" ON "public"."settings" FOR SELECT USING (true);



CREATE POLICY "Can see own role" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read access option_sets" ON "public"."option_sets" FOR SELECT USING (true);



CREATE POLICY "Public read access product_options" ON "public"."product_options" FOR SELECT USING (true);



CREATE POLICY "Users manage own wishlist" ON "public"."wishlists" USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."option_sets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."variant_attributes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."approve_return_request"("request_id" bigint, "notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_return_request"("request_id" bigint, "notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_return_request"("request_id" bigint, "notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_products_by_tags"("tag_names" "text"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products_by_tags"("tag_names" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products_by_tags"("tag_names" "text"[]) TO "service_role";


















GRANT ALL ON TABLE "public"."addresses" TO "anon";
GRANT ALL ON TABLE "public"."addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."addresses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."addresses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."collections" TO "anon";
GRANT ALL ON TABLE "public"."collections" TO "authenticated";
GRANT ALL ON TABLE "public"."collections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collections_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."discounts" TO "anon";
GRANT ALL ON TABLE "public"."discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."discounts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."discounts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."discounts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."discounts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."email_templates_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_adjustments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_adjustments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_levels" TO "anon";
GRANT ALL ON TABLE "public"."inventory_levels" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_levels" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_levels_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_levels_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_levels_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."option_sets" TO "anon";
GRANT ALL ON TABLE "public"."option_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."option_sets" TO "service_role";



GRANT ALL ON SEQUENCE "public"."option_sets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."option_sets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."option_sets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_discounts" TO "anon";
GRANT ALL ON TABLE "public"."order_discounts" TO "authenticated";
GRANT ALL ON TABLE "public"."order_discounts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_discounts_order_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_discounts_order_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_discounts_order_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_categories_product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_categories_product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_categories_product_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_collections" TO "anon";
GRANT ALL ON TABLE "public"."product_collections" TO "authenticated";
GRANT ALL ON TABLE "public"."product_collections" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_collections_product_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_collections_product_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_collections_product_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_images" TO "anon";
GRANT ALL ON TABLE "public"."product_images" TO "authenticated";
GRANT ALL ON TABLE "public"."product_images" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_images_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_options" TO "anon";
GRANT ALL ON TABLE "public"."product_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_options" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_options_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_options_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_options_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."return_items" TO "anon";
GRANT ALL ON TABLE "public"."return_items" TO "authenticated";
GRANT ALL ON TABLE "public"."return_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."return_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."return_requests" TO "anon";
GRANT ALL ON TABLE "public"."return_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."return_requests" TO "service_role";



GRANT ALL ON SEQUENCE "public"."return_requests_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."return_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."return_requests_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."settings" TO "anon";
GRANT ALL ON TABLE "public"."settings" TO "authenticated";
GRANT ALL ON TABLE "public"."settings" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."users_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."variant_attributes" TO "anon";
GRANT ALL ON TABLE "public"."variant_attributes" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_attributes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."variant_attributes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."variant_attributes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."variant_attributes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";



GRANT ALL ON SEQUENCE "public"."wishlists_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."wishlists_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."wishlists_id_seq" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































