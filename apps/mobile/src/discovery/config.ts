export const config = {
  analyticsEndpoint: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT || '',
  analyticsDomain: process.env.EXPO_PUBLIC_ANALYTICS_DOMAIN || '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  mapStyle:
    process.env.EXPO_PUBLIC_MAP_STYLE_URL ||
    'https://tiles.openfreemap.org/styles/positron',
  routingUrl:
    process.env.EXPO_PUBLIC_OSRM_URL ||
    (process.env.NODE_ENV === 'development'
      ? 'https://router.project-osrm.org'
      : ''),
  geocoder:
    process.env.EXPO_PUBLIC_PHOTON_URL || 'https://photon.komoot.io/api/',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '',
}
export const hasDiscoveryBackend = Boolean(
  config.supabaseUrl && config.supabaseKey,
)
