export type GuichetNavigationKey = 'dashboard' | 'sale' | 'trips' | 'scanner' | 'history';

export const guichetNavigationItems: Array<{
  key: GuichetNavigationKey;
  label: string;
  path: string;
}> = [
  { key: 'dashboard', label: 'Tableau de bord', path: '/guichet/tableau-de-bord' },
  { key: 'sale', label: 'Vendre un billet', path: '/guichet/vente' },
  { key: 'trips', label: 'Voyages', path: '/guichet/voyages' },
  { key: 'scanner', label: 'Scanner un billet', path: '/guichet/scanner' },
  { key: 'history', label: 'Historique', path: '/guichet/historique' },
];
