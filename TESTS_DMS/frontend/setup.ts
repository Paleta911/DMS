import '../../frontend/node_modules/@testing-library/jest-dom/dist/vitest'
import { afterEach, vi } from '../../frontend/node_modules/vitest'
import { cleanup } from '../../frontend/node_modules/@testing-library/react/dist/index.js'
import { queryClient } from '../../frontend/src/app/queryClient'

afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
