import type { Plugin } from '@/components/provider/plugin.tsx'
import { useIntelligenceStore as store } from '@/stores/intelligence.ts'

const IntelligencePlugin: Plugin = {
  unique: 'intelligence-plugin',
  mount() {
    void store.getState().toReadCollections()
    void store.getState().toReadSessions()
  },
  unmount() {}
}

export { IntelligencePlugin }
