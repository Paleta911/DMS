import { act } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '../../../frontend/src/theme/ThemeProvider'
import { ToastProvider } from '../../../frontend/src/components/ToastProvider'
import { I18nProvider } from '../../../frontend/src/i18n/I18nProvider'
import { FeatureFlagsProvider } from '../../../frontend/src/features/FeatureFlagsProvider'
import { SavedViewsToolbar } from '../../../frontend/src/components/layout/SavedViewsToolbar'
import { ExportMenu } from '../../../frontend/src/components/ui/ExportMenu'
import { LanguageToggle } from '../../../frontend/src/components/ui/LanguageToggle'
import { ThemeToggle } from '../../../frontend/src/components/ui/ThemeToggle'
import { NoticeBanner } from '../../../frontend/src/components/ui/NoticeBanner'
import { FilterCard } from '../../../frontend/src/components/layout/FilterCard'
import { ResultsToolbar } from '../../../frontend/src/components/layout/ResultsToolbar'
import { ResponsiveActions } from '../../../frontend/src/components/layout/ResponsiveActions'
import { EmptyState } from '../../../frontend/src/components/EmptyState'
import { AccessDenied } from '../../../frontend/src/components/AccessDenied'

const withProviders = (children: ReactNode) => (
  <FeatureFlagsProvider>
    <I18nProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </I18nProvider>
  </FeatureFlagsProvider>
)

describe('shared frontend components external tests', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.className = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders shared UI components in a stable way', () => {
    const onApply = vi.fn()
    const onDelete = vi.fn()
    const onSave = vi.fn()
    const onPrevious = vi.fn()
    const onNext = vi.fn()

    render(
      withProviders(
        <div>
          <LanguageToggle />
          <ThemeToggle />
          <NoticeBanner title="Aviso">Detalle</NoticeBanner>
          <FilterCard title="Filtros">contenido</FilterCard>
          <ResultsToolbar
            summary="Mostrando 1 resultado"
            currentPage={2}
            totalPages={3}
            onPrevious={onPrevious}
            onNext={onNext}
          />
          <SavedViewsToolbar
            views={[{ id: '1', name: 'Vista 1', filters: { q: 'a' }, createdAt: 'now', updatedAt: 'now' }]}
            onApply={onApply}
            onDelete={onDelete}
            onSave={onSave}
          />
          <ResponsiveActions>
            <button type="button">Uno</button>
            <button type="button">Dos</button>
          </ResponsiveActions>
          <EmptyState title="Vacío" subtitle="Sin datos" />
          <AccessDenied />
        </div>,
      ),
    )

    fireEvent.change(screen.getByLabelText(/Idioma|Language/i), {
      target: { value: 'en' },
    })
    fireEvent.click(screen.getByLabelText(/Switch to (dark|light) mode|Cambiar a modo (oscuro|claro)/i))
    fireEvent.click(screen.getByRole('button', { name: /Previous|Anterior/i }))
    fireEvent.click(screen.getByRole('button', { name: /Next|Siguiente/i }))
    fireEvent.change(screen.getByLabelText(/Saved views|Vistas guardadas/i), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Apply view|Aplicar vista/i }))
    fireEvent.click(screen.getByRole('button', { name: /Save view|Guardar vista/i }))

    const saveDialog = screen.getByRole('dialog', { name: /Save view|Guardar vista/i })
    fireEvent.change(within(saveDialog).getByLabelText(/View name|Nombre de la vista/i), {
      target: { value: 'Vista nueva' },
    })
    fireEvent.click(within(saveDialog).getByRole('button', { name: /^Save$|^Guardar$/i }))
    fireEvent.change(screen.getByLabelText(/Saved views|Vistas guardadas/i), {
      target: { value: '1' },
    })
    fireEvent.click(screen.getByRole('button', { name: /Delete|Eliminar/i }))

    expect(onPrevious).toHaveBeenCalledTimes(1)
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(onSave).toHaveBeenCalledWith('Vista nueva')
    expect(onApply).toHaveBeenCalledWith({ q: 'a' })
    expect(onDelete).toHaveBeenCalledWith('1')
    expect(screen.getByText('Aviso')).toBeInTheDocument()
    expect(screen.getByText('Detalle')).toBeInTheDocument()
    expect(screen.getByText('contenido')).toBeInTheDocument()
    expect(screen.getByText('Vacío')).toBeInTheDocument()
    expect(screen.getByText(/Access denied|Acceso denegado/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('EN')).toBeInTheDocument()
  })

  it('invokes CSV export handlers', async () => {
    const onExport = vi.fn()

    render(
      withProviders(
        <ExportMenu
          options={[
            { key: 'csv', label: 'CSV', onClick: () => onExport('csv') },
            { key: 'json', label: 'JSON', onClick: () => onExport('json') },
          ]}
        />,
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /Export|Exportar/i }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /CSV/i }))
    })

    expect(onExport).toHaveBeenCalledWith('csv')
  })

  it('invokes JSON export handlers', async () => {
    const onExport = vi.fn()

    render(
      withProviders(
        <ExportMenu
          options={[
            { key: 'csv', label: 'CSV', onClick: () => onExport('csv') },
            { key: 'json', label: 'JSON', onClick: () => onExport('json') },
          ]}
        />,
      ),
    )

    fireEvent.click(screen.getByRole('button', { name: /Export|Exportar/i }))
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: /JSON/i }))
    })

    expect(onExport).toHaveBeenCalledWith('json')
  })
})
