import type { MonitoringService as MonitoringServiceType } from '../../services/MonitoringService';

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  setUser: jest.fn(),
  addBreadcrumb: jest.fn(),
  wrap: jest.fn((component: unknown) => component),
}));

interface EnvConfig {
  environment: string;
  sentryDsn?: string;
}

const DSN = 'https://key@o1.ingest.sentry.io/1';

// Load a fresh MonitoringService with a controlled environment config so each
// test can exercise the init gating independently.
const load = (env: EnvConfig) => {
  let Service!: typeof MonitoringServiceType;
  let Sentry!: ReturnType<typeof require>;
  jest.isolateModules(() => {
    jest.doMock('../../utils/environment', () => ({ config: env }));
    Sentry = require('@sentry/react-native');
    Service = require('../../services/MonitoringService').MonitoringService;
  });
  return { Service, Sentry };
};

describe('MonitoringService', () => {
  describe('init gating', () => {
    it('initializes when a DSN is present in a non-dev environment', () => {
      const { Service, Sentry } = load({ environment: 'production', sentryDsn: DSN });
      Service.init();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({ dsn: DSN, environment: 'production' })
      );
      expect(Service.isEnabled).toBe(true);
    });

    it('does not initialize without a DSN', () => {
      const { Service, Sentry } = load({ environment: 'production' });
      Service.init();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(Service.isEnabled).toBe(false);
    });

    it('does not initialize in the development environment (protects quota)', () => {
      const { Service, Sentry } = load({ environment: 'development', sentryDsn: DSN });
      Service.init();

      expect(Sentry.init).not.toHaveBeenCalled();
      expect(Service.isEnabled).toBe(false);
    });

    it('is idempotent', () => {
      const { Service, Sentry } = load({ environment: 'production', sentryDsn: DSN });
      Service.init();
      Service.init();

      expect(Sentry.init).toHaveBeenCalledTimes(1);
    });
  });

  describe('when disabled', () => {
    it('captureException is a no-op', () => {
      const { Service, Sentry } = load({ environment: 'production' });
      Service.captureException(new Error('boom'));

      expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('wrap returns the component unchanged', () => {
      const { Service, Sentry } = load({ environment: 'production' });
      const Comp = () => null;

      expect(Service.wrap(Comp)).toBe(Comp);
      expect(Sentry.wrap).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    const setup = () => {
      const loaded = load({ environment: 'production', sentryDsn: DSN });
      loaded.Service.init();
      return loaded;
    };

    it('forwards captureException with extra context', () => {
      const { Service, Sentry } = setup();
      const error = new Error('boom');
      Service.captureException(error, { componentStack: 'x' });

      expect(Sentry.captureException).toHaveBeenCalledWith(error, {
        extra: { componentStack: 'x' },
      });
    });

    it('forwards captureException without context', () => {
      const { Service, Sentry } = setup();
      const error = new Error('boom');
      Service.captureException(error);

      expect(Sentry.captureException).toHaveBeenCalledWith(error, undefined);
    });

    it('forwards captureMessage with a default info level', () => {
      const { Service, Sentry } = setup();
      Service.captureMessage('hello');

      expect(Sentry.captureMessage).toHaveBeenCalledWith('hello', 'info');
    });

    it('sets and clears the user', () => {
      const { Service, Sentry } = setup();
      Service.setUser('household-123');
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'household-123' });

      Service.setUser(null);
      expect(Sentry.setUser).toHaveBeenCalledWith(null);
    });

    it('wrap delegates to Sentry.wrap', () => {
      const { Service, Sentry } = setup();
      const Comp = () => null;
      Service.wrap(Comp);

      expect(Sentry.wrap).toHaveBeenCalledWith(Comp);
    });
  });
});
