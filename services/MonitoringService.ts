import type { ComponentType } from 'react';
import * as Sentry from '@sentry/react-native';
import { config } from '../utils/environment';

type CaptureContext = Record<string, unknown>;

// Wraps Sentry so components/services never touch the SDK directly.
// Disabled in local development to protect the free-tier quota.
export class MonitoringService {
  private static initialized = false;

  static init(): void {
    if (this.initialized) return;
    if (!config.sentryDsn) return;
    if (config.environment === 'development') return;

    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.environment,
      sendDefaultPii: false,
      tracesSampleRate: 0.2,
    });
    this.initialized = true;
  }

  static get isEnabled(): boolean {
    return this.initialized;
  }

  static captureException(error: unknown, context?: CaptureContext): void {
    if (!this.initialized) return;
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }

  static captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.initialized) return;
    Sentry.captureMessage(message, level);
  }

  static setUser(householdId: string | null): void {
    if (!this.initialized) return;
    Sentry.setUser(householdId ? { id: householdId } : null);
  }

  static addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.initialized) return;
    Sentry.addBreadcrumb(breadcrumb);
  }

  static wrap<P extends Record<string, unknown>>(
    component: ComponentType<P>
  ): ComponentType<P> {
    return this.initialized ? Sentry.wrap(component) : component;
  }
}
