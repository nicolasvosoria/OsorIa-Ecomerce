const nextConfig = {
  /* config options here */
  // Next.js 16 - Configuración actualizada
  // Nota: eslint ya no se configura aquí, se maneja en eslint.config.mjs
  cacheComponents: true, // Requerido para 'use cache' directive (movido fuera de experimental en Next.js 16)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Deshabilitar Turbopack para evitar problemas con fuentes de Google
  // En Next.js 16, Turbopack se deshabilita configurando experimental.turbo a false
  experimental: {
    turbo: false,
  },
  // Configuración de webpack para asegurar compatibilidad
  webpack: (config, { isServer }) => {
    // Asegurar que no se use Turbopack
    if (config.resolve) {
      config.resolve.alias = {
        ...config.resolve.alias,
      };
    }
    return config;
  },
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zylq-002.dx.commercecloud.salesforce.com',
      },
      {
        protocol: 'https',
        hostname: 'edge.disstg.commercecloud.salesforce.com',
      },
    ],
  },
};

export default nextConfig;
