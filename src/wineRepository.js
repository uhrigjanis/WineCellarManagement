function copyWine(wine) {
  return JSON.parse(JSON.stringify(wine));
}

function requireWineId(wine) {
  if (!wine || typeof wine.id !== 'string' || !wine.id.trim()) {
    throw new Error('Every wine must have a stable ID.');
  }
}

export function createWineRepository(store) {
  if (!store || typeof store.loadWines !== 'function' || typeof store.saveWines !== 'function') {
    throw new TypeError('A wine store must implement loadWines and saveWines.');
  }

  let operations = Promise.resolve();
  const serialize = (operation) => {
    const result = operations.then(operation);
    operations = result.then(() => undefined, () => undefined);
    return result;
  };

  const load = async () => {
    const wines = await store.loadWines();
    if (!Array.isArray(wines)) {
      throw new Error('Stored wine data must be an array.');
    }
    return wines.map(copyWine);
  };

  return {
    list: () => serialize(load),

    create: (wine) => serialize(async () => {
      requireWineId(wine);
      const wines = await load();
      if (wines.some((storedWine) => storedWine.id === wine.id)) {
        throw new Error(`A wine with ID "${wine.id}" already exists.`);
      }
      await store.saveWines([...wines, copyWine(wine)]);
      return copyWine(wine);
    }),

    createMany: (newWines) => serialize(async () => {
      if (!Array.isArray(newWines)) {
        throw new TypeError('Wines to create must be an array.');
      }
      newWines.forEach(requireWineId);
      const wines = await load();
      const ids = new Set(wines.map(({ id }) => id));
      for (const wine of newWines) {
        if (ids.has(wine.id)) {
          throw new Error(`A wine with ID "${wine.id}" already exists.`);
        }
        ids.add(wine.id);
      }
      await store.saveWines([...wines, ...newWines.map(copyWine)]);
      return newWines.map(copyWine);
    }),

    update: (id, changes) => serialize(async () => {
      const wines = await load();
      const index = wines.findIndex((wine) => wine.id === id);
      if (index < 0) {
        throw new Error(`Wine with ID "${id}" was not found.`);
      }
      const updatedWine = { ...wines[index], ...copyWine(changes), id };
      const updatedWines = [...wines];
      updatedWines[index] = updatedWine;
      await store.saveWines(updatedWines);
      return copyWine(updatedWine);
    }),

    delete: (id) => serialize(async () => {
      const wines = await load();
      const index = wines.findIndex((wine) => wine.id === id);
      if (index < 0) {
        throw new Error(`Wine with ID "${id}" was not found.`);
      }
      const [deletedWine] = wines.splice(index, 1);
      await store.saveWines(wines);
      return copyWine(deletedWine);
    }),
  };
}
