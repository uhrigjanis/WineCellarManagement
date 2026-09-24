export function getWineFormError(wine) {
  const missing = ['name', 'producer', 'region'].filter((field) => !String(wine[field] || '').trim());
  if (!missing.length) return '';

  const labels = {
    name: 'wine name',
    producer: 'producer',
    region: 'region',
  };
  return `Please enter the required field${missing.length > 1 ? 's' : ''}: ${missing.map((field) => labels[field]).join(', ')}.`;
}
