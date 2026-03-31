import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AppProviders } from '../../../frontend/src/app/AppProviders'
import { useFeatureFlag } from '../../../frontend/src/features/FeatureFlagsProvider'
import { useI18n } from '../../../frontend/src/i18n/I18nProvider'
import { useTheme } from '../../../frontend/src/theme/ThemeProvider'

function Probe() {
  const darkMode = useFeatureFlag('dark-mode')
  const { t } = useI18n()
  const { theme } = useTheme()

  return (
    <div>
      <div data-testid="flag">{String(darkMode)}</div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="translation">{t('export.label')}</div>
    </div>
  )
}

describe('AppProviders external tests', () => {
  it('mounts the shared providers and renders custom children', () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    )

    expect(screen.getByTestId('flag')).toHaveTextContent('true')
    expect(screen.getByTestId('theme')).toHaveTextContent(/light|dark/)
    expect(screen.getByTestId('translation')).toHaveTextContent(/Exportar|Export/)
  })
})
