const nextConfig = {
  /* config options here */
  // Next.js 16 - Configuración actualizada
  // Nota: eslint ya no se configura aquí, se maneja en eslint.config.mjs
  cacheComponents: true, // Requerido para 'use cache' directive (movido fuera de experimental en Next.js 16)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Fijar root del workspace para evitar warnings por lockfiles externos en entornos compartidos.
  turbopack: {
    root: process.cwd(),
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
  // Optimizaciones de compilación
  experimental: {
    // Optimizar imports de paquetes grandes
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  // Configuración de compilación
  compiler: {
    // Remover console.log en producción (opcional, puede ayudar con performance)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
};

export default nextConfig;
