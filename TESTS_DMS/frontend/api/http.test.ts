import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  token: 'token-1',
}))

vi.mock('../../../frontend/src/auth/storage', () => ({
  getToken: () => mocks.token,
  getRefreshToken: () => null,
  setToken: vi.fn(),
  setRefreshToken: vi.fn(),
  clearAuthStorage: vi.fn(),
  markForbidden: vi.fn(),
}))

import { getApiBaseUrl, http } from '../../../frontend/src/api/http'

describe('frontend api/http external tests', () => {
  beforeEach(() => {
    mocks.token = 'token-1'
  })

  it('exposes the configured API base URL', () => {
    expect(getApiBaseUrl()).toBeTypeOf('string')
    expect(getApiBaseUrl().length).toBeGreaterThan(0)
  })

  it('injects Authorization in the axios request interceptor when a token exists', async () => {
    const requestInterceptor = (http.interceptors.request as any).handlers[0].fulfilled

    const result = await requestInterceptor({ headers: {} })

    expect(result.headers.Authorization).toBe('Bearer token-1')
  })

  it('leaves the request unchanged when there is no token', async () => {
    mocks.token = null as unknown as string
    const requestInterceptor = (http.interceptors.request as any).handlers[0].fulfilled

    const result = await requestInterceptor({ headers: {} })

    expect(result.headers.Authorization).toBeUndefined()
  })
})
