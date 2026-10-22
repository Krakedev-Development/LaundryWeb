require("./ts-loader.cjs");
const {
  LocalZoneRepository,
} = require("../src/services/zones/LocalZoneRepository.ts");
const zone = {
  id: "new",
  name: "Nueva zona",
  active: true,
  polygon: {
    type: "Polygon",
    coordinates: [
      [
        [0, 0],
        [2, 0],
        [2, 2],
        [0, 2],
        [0, 0],
      ],
    ],
  },
};
function fixture(role = "ADMIN") {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const facilities = [],
    orders = [];
  return {
    values,
    storage,
    facilities,
    orders,
    repository: new LocalZoneRepository({
      actor: () => ({ role }),
      facilities: () => facilities,
      orders: () => orders,
      storage,
    }),
  };
}

module.exports = { zone, fixture };
