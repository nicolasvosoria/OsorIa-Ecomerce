const nextConfig = {
  /* config options here */
  // Next.js 16 - Configuración actualizada
  // Nota: eslint ya no se configura aquí, se maneja en eslint.config.mjs
  cacheComponents: true, // Requerido para 'use cache' directive (movido fuera de experimental en Next.js 16)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Deshabilitar Turbopack para evitar problemas con fuentes de Google
  experimental: {
    turbo: false,
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
