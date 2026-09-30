import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { AppData } from '../../src/data/loader';
import { DataContext } from '../../src/ui/hooks';
import { ZoomProvider } from '../../src/ui/ZoomDialog';
import { AppShell } from '../../src/App';

export function renderWithData(ui: ReactElement, data: AppData) {
  return render(
    <DataContext.Provider value={data}>
      <ZoomProvider>{ui}</ZoomProvider>
    </DataContext.Provider>,
  );
}

export function renderApp(data: AppData, hash = '#/') {
  window.location.hash = hash;
  return render(<AppShell data={data} />);
}

export const collapse = (s: string) => s.replace(/[ \t\r\n\f\v]+/g, ' ').trim();
