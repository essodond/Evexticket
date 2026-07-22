export const companyNavigationItems = [
  { key: 'dashboard', label: 'Tableau de bord', path: '/company/tableau-de-bord' },
  { key: 'company', label: 'Ma compagnie', path: '/company/ma-compagnie' },
  { key: 'agencies', label: 'Agences', path: '/company/agences' },
  { key: 'personnel', label: 'Personnel', path: '/company/utilisateurs' },
  { key: 'buses', label: 'Bus', path: '/company/bus' },
  { key: 'routes', label: 'Trajets', path: '/company/trajets' },
  { key: 'trips', label: 'Voyages', path: '/company/voyages' },
  { key: 'tickets', label: 'Billets', path: '/company/billets' },
  { key: 'revenues', label: 'Revenus', path: '/company/revenus' },
  { key: 'settings', label: 'Paramètres', path: '/company/parametres' },
] as const;

export const companyDefaultPath = companyNavigationItems[0].path;
