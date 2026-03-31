import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FeatureFlagsProvider } from '../features/FeatureFlagsProvider';
import { I18nProvider, useI18n } from './I18nProvider';
import { LanguageToggle } from '../components/ui/LanguageToggle';

function Probe() {
  const { t } = useI18n();
  return <span>{t('app.nav.documents')}</span>;
}

describe('I18nProvider', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('usa el idioma por defecto configurado', () => {
    vi.stubEnv('VITE_DEFAULT_LOCALE', 'en');

    render(
      <FeatureFlagsProvider>
        <I18nProvider>
          <Probe />
        </I18nProvider>
      </FeatureFlagsProvider>,
    );

    expect(screen.getByText('Documents')).toBeInTheDocument();
  });

  it('permite cambiar el idioma y persiste la selección', () => {
    render(
      <FeatureFlagsProvider>
        <I18nProvider>
          <LanguageToggle />
          <Probe />
        </I18nProvider>
      </FeatureFlagsProvider>,
    );

    fireEvent.change(screen.getByLabelText('Idioma'), {
      target: { value: 'en' },
    });

    expect(screen.getByText('Documents')).toBeInTheDocument();
    expect(window.localStorage.getItem('dms-locale')).toBe('en');
  });
});
