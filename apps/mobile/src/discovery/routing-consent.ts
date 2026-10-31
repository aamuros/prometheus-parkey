type ConsentStorage = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<unknown>
}

const CONSENT_KEY = 'parkey.discovery.routing-consent.v1'

/** Only an explicit Continue persists consent; cancelling never grants it. */
export function createRoutingConsent(storage: ConsentStorage) {
  return {
    async accepted(): Promise<boolean> {
      return (await storage.getItem(CONSENT_KEY)) === 'accepted'
    },
    async accept(): Promise<void> {
      await storage.setItem(CONSENT_KEY, 'accepted')
    },
  }
}
