'use client';

import {useState, useEffect} from 'react';

const API_BASE = 'https://provinces.open-api.vn/api';

export function useVietnamProvinces() {
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch Provinces on mount
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                const res = await fetch(`${API_BASE}/?depth=1`);
                const data = await res.json();
                setProvinces(data);
            } catch (error) {
                console.error("Failed to load provinces", error);
            }
        };
        fetchProvinces();
    }, []);

    const fetchDistricts = async (provinceCode) => {
        setDistricts([]);
        setWards([]);
        if (!provinceCode) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`);
            const data = await res.json();
            setDistricts(data.districts);
        } catch (error) {
            console.error("Failed to load districts", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchWards = async (districtCode) => {
        setWards([]);
        if (!districtCode) return;

        setIsLoading(true);
        try {
            const res = await fetch(`${API_BASE}/d/${districtCode}?depth=2`);
            const data = await res.json();
            setWards(data.wards);
        } catch (error) {
            console.error("Failed to load wards", error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        provinces,
        districts,
        wards,
        fetchDistricts,
        fetchWards,
        isLoading
    };
}