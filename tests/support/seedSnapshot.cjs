// Calcula, en Node, el contenido de localStorage de un espacio de trabajo poblado con los
// fixtures de prueba. Se usa para sembrar el navegador en las pruebas de interfaz.
require('../ts-loader.cjs');

let cached;
function build() {
  const values = new Map();
  const previous = global.localStorage;
  global.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k),
  };
  try {
    const { seededStorage, demo } = require('../fixtures/seed.cjs');
    seededStorage();
    return { entries: Object.fromEntries(values), users: demo.INITIAL_USERS };
  } finally {
    global.localStorage = previous;
  }
}

// Devuelve { entries, user } para el rol indicado.
exports.seedSnapshot = (role = 'ADMIN') => {
  cached ??= build();
  const user = cached.users.find((u) => u.role === role);
  return {
    entries: { ...cached.entries, lw_current_user: JSON.stringify(user) },
    user,
    users: cached.users,
  };
};
