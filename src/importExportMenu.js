export function transitionImportExportMenu(state, action) {
  switch (action.type) {
    case 'toggle-main':
      return state === 'closed' ? 'main' : 'closed';
    case 'open-export':
      return state === 'main' ? 'export' : state;
    case 'back-to-main':
      return state === 'export' ? 'main' : state;
    case 'escape':
    case 'outside-click':
    case 'close':
      return 'closed';
    default:
      return state;
  }
}
