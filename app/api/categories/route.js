// app/api/categories/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'catalog' or 'attribute'
    const mode = searchParams.get('mode'); // 'public' (storefront) or 'admin'

    try {
        let query = supabase
            .from('categories')
            .select('*')
            .is('deleted_at', null)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        // 1. Filter by Type (Menu vs Filters)
        if (type) {
            query = query.eq('type', type);
        }

        // 2. Storefront Visibility Logic (Time-Fencing)
        if (mode === 'public') {
            const now = new Date().toISOString();

            // Mandatory Active Check
            query = query.eq('is_active', true);

            // Time Fencing: (start_date IS NULL OR start_date <= NOW)
            // AND (end_date IS NULL OR end_date >= NOW)
            query = query.or(`start_date.is.null,start_date.lte.${now}`);
            query = query.or(`end_date.is.null,end_date.gte.${now}`);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: 'Failed to fetch categories.', details: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    const body = await request.json();

    // Destructure new fields
    const {
        name,
        description,
        parent_id,
        type = 'catalog', // Default to catalog
        display_style = 'list',
        value,
        is_active = true,
        sort_order = 0,
        start_date,
        end_date,
        seo_title,
        seo_description
    } = body;

    if (!name) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    try {
        // Check for existing active or archived category
        const { data: existing, error: checkError } = await supabase
            .from('categories')
            .select('id, deleted_at')
            .eq('slug', slug)
            .eq('type', type)
            .single();

        if (checkError && checkError.code !== 'PGRST116') throw checkError;

        if (existing) {
            if (existing.deleted_at) {
                // Restore archived
                const { data: restored, error: restoreError } = await supabase
                    .from('categories')
                    .update({
                        deleted_at: null,
                        description: description || null,
                        parent_id: parent_id || null,
                        display_style,
                        value: value || null,
                        is_active,
                        sort_order,
                        start_date: start_date || null,
                        end_date: end_date || null,
                        seo_title: seo_title || null,
                        seo_description: seo_description || null
                    })
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (restoreError) throw restoreError;
                return NextResponse.json(restored);
            } else {
                return NextResponse.json({ error: 'A category with this name/slug already exists.' }, { status: 409 });
            }
        }

        // Create new
        const { data, error } = await supabase
            .from('categories')
            .insert([{
                name,
                slug,
                description,
                parent_id: parent_id || null,
                type,
                display_style,
                value: value || null,
                is_active,
                sort_order,
                start_date: start_date || null,
                end_date: end_date || null,
                seo_title: seo_title || null,
                seo_description: seo_description || null
            }])
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);

    } catch (error) {
        console.error('Error creating category:', error);
        return NextResponse.json({ error: 'Failed to create category.', details: error.message }, { status: 500 });
    }
}