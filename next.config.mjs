// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: '**.supabase.co', // Covers your Supabase project domain
            },
            {
                protocol: 'https',
                hostname: '**.supabase.in', // Alternative Supabase domain just in case
            }
        ],
    },
};

export default nextConfig;