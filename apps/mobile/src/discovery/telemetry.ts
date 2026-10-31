import { Platform } from 'react-native'

import { config } from './config'
import {
  createAnalytics,
  publicSentryDsn,
  safeCrashPayload,
} from './telemetry-core'
import type { AnalyticsEvent } from './telemetry-core'

const analytics = createAnalytics({
  endpoint: config.analyticsEndpoint,
  domain: config.analyticsDomain,
  platform: Platform.OS,
})
export const diagnosticStatus = {
  analytics: analytics.enabled,
  crashes: Boolean(publicSentryDsn(config.sentryDsn)),
}
let started = false

export function track(event: AnalyticsEvent) {
  void analytics.track(event)
}

export function initializeTelemetry() {
  if (started) return
  started = true
  track({ name: 'app_open' })
  if (!publicSentryDsn(config.sentryDsn)) return
  void import('@sentry/react-native')
    .then((Sentry) => {
      Sentry.init({
        dsn: config.sentryDsn,
        // Native envelopes bypass JS beforeSend. Keep native collection disabled
        // until equivalent native redaction has been designed and device-tested.
        enableNative: false,
        autoInitializeNativeSdk: false,
        enableNativeCrashHandling: false,
        defaultIntegrations: false,
        integrations: [
          Platform.OS === 'web'
            ? Sentry.browserGlobalHandlersIntegration()
            : Sentry.reactNativeErrorHandlersIntegration({
                patchGlobalPromise: false,
              }),
        ],
        sendDefaultPii: false,
        enableAutoSessionTracking: false,
        enableAutoBreadcrumbTracking: false,
        maxBreadcrumbs: 0,
        enableAutoPerformanceTracing: false,
        enableAppStartTracking: false,
        enableNativeFramesTracking: false,
        enableCaptureFailedRequests: false,
        tracesSampleRate: 0,
        profilesSampleRate: 0,
        enableLogs: false,
        attachScreenshot: false,
        attachViewHierarchy: false,
        sendClientReports: false,
        beforeSend: (event) => ({
          ...safeCrashPayload(event),
          type: undefined,
        }),
        beforeBreadcrumb: () => null,
        beforeSendTransaction: () => null,
      })
    })
    .catch(() => {
      /* Optional diagnostics must not interrupt startup. */
    })
}
