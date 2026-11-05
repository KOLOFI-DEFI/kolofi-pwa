/**
 * Route ↔ design frame map. Phone screenshots are diffed against design/frames/NN-name-{light,dark}.png
 * where a board exists; desktop screenshots (1440×900) are saved for review (there are no desktop boards).
 * IDs are the mock API's fixture IDs.
 */
export const screens = [
  { n: '01', name: 'intro-save', path: '/welcome', guest: true },
  { n: '04', name: 'login', path: '/login', guest: true },
  { n: '04b', name: 'signup', path: '/signup', guest: true },
  { n: '08', name: 'home', path: '/home' },
  { n: '08b', name: 'wallet', path: '/wallet' },
  { n: '09', name: 'add-money', path: '/wallet/add' },
  { n: '10', name: 'withdraw', path: '/wallet/withdraw' },
  { n: '10b', name: 'activity', path: '/activity' },
  { n: '11', name: 'save', path: '/save' },
  { n: '12', name: 'new-goal', path: '/save/new' },
  { n: '13', name: 'locked', path: '/save/01JCA4PLANL0CKED000000000S' },
  { n: '13b', name: 'goal-detail', path: '/save/01JCA4PLAN000000000000000R' },
  { n: '14', name: 'circles', path: '/circles' },
  { n: '15', name: 'join-circle', path: '/circles/packages/01JCA7PACKAGE0000000000000' },
  { n: '16', name: 'circle-detail', path: '/circles/01JCA8C1RCLE00000000000000' },
  { n: '16b', name: 'circle-market', path: '/circles/market' },
  { n: '18', name: 'notifications', path: '/notifications' },
  { n: '20', name: 'profile', path: '/profile' },
  { n: '21', name: 'trust', path: '/reputation' },
] as const
