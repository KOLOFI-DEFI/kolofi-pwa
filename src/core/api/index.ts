import type { ApiConfig, KolofiApi } from './contract'
import { createHttpApi } from './http'
import { createMockApi } from './mock'

export * from './contract'
export { MOCK_CODE, MOCK_PASSWORD, MOCK_PIN } from './mock'

export function createApi(config: ApiConfig): KolofiApi {
  return config.mode === 'http' ? createHttpApi(config) : createMockApi(config)
}
