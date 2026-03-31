import path from 'path'
import baseConfig from '../../frontend/vite.config'

export default {
  ...baseConfig,
  test: {
    ...(baseConfig.test ?? {}),
    include: [
      path.resolve(__dirname, './**/*.test.ts'),
      path.resolve(__dirname, './**/*.test.tsx'),
    ],
  },
}
