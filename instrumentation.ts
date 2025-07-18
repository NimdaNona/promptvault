import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'promptvault',
    // Additional configuration for enhanced observability
    attributes: {
      'app.version': process.env.npm_package_version || '0.1.0',
      'app.environment': process.env.NODE_ENV || 'production',
    },
  });
}