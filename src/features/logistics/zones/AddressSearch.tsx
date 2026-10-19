import React, { useEffect, useState } from 'react';
import { geoProvider } from '../../../services/geo';
import type { Coordinates, GeoAddress } from '../../../services/geo/geo.types';

export function AddressSearch({
  onLocate,
}: {
  onLocate(point: Coordinates, address: string): void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoAddress[]>([]);
  const [message, setMessage] = useState('');
  useEffect(() => {
    setResults([]);
    setMessage('');
    if (query.trim().length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setMessage('Buscando dirección…');
      geoProvider
        .searchAddress(query.trim(), { signal: controller.signal })
        .then((addresses) => {
          if (controller.signal.aborted) return;
          setResults(addresses);
          setMessage(
            addresses.length
              ? ''
              : 'Sin coincidencias. Puedes colocar el pin directamente en el mapa.',
          );
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setMessage(
              'La búsqueda no está disponible. Coloca el pin en el mapa.',
            );
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="space-y-2">
      <label className="ops-label">
        Buscar dirección
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Escribe una dirección"
          className="ops-field"
        />
      </label>
      {message && (
        <p role="status" className="text-xs text-slate-600">
          {message}
        </p>
      )}
      {results.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {results.map((address, index) => (
            <li key={address.id ?? index}>
              <button
                type="button"
                className="w-full p-3 text-left text-xs text-slate-600 transition-colors hover:bg-sky-50"
                onClick={() =>
                  onLocate(address.coordinates, address.formattedAddress)
                }
              >
                {address.formattedAddress}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
