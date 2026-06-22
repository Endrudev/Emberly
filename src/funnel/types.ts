import type { ComponentType } from 'react';

export interface FunnelStepProps {
  /** 0–1, kolik z funnelu je hotovo (pro progress bar). */
  progress: number;
  /** False na úplně prvním kroku — krok podle toho skryje tlačítko zpět. */
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
}

export interface FunnelStepConfig {
  key: string;
  Component: ComponentType<FunnelStepProps>;
}
