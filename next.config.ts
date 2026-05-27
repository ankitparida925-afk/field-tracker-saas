import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control',    value: 'on' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'geolocation=(self), camera=(self), microphone=(self)' },
  {
    key:   'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload', // 2 years HSTS
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      // Map tiles: allow wildcard * to verify and diagnose CSP issues
      "img-src * data: blob:",
      // API calls: allow wildcard *
      "connect-src *",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ['ol'],
  headers: async () => [
    {
      // Apply security headers to all routes
      source:  '/(.*)',
      headers: securityHeaders,
    },
  ],

  // Force HTTPS redirects in production
  async redirects() {
    return process.env.NODE_ENV === 'production'
      ? [
          {
            source:      '/:path*',
            has:         [{ type: 'header', key: 'x-forwarded-proto', value: 'http' }],
            destination: 'https://:host/:path*',
            permanent:   true,
          },
        ]
      : [];
  },

  // Proxy API requests and Socket.io connections to Express Backend
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${backendUrl}/socket.io/:path*`,
      },
    ];
  },
};

export default nextConfig;

