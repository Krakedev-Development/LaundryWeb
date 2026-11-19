import React from 'react';
import { Lock } from 'lucide-react';
import { PolicyPanel } from './PolicyPanel';
import { TimeSlotsPanel } from './TimeSlotsPanel';
import { useApp } from '../../context/AppContext';
import { PageHeader } from '../../components/common/PageHeader';

/**
 * Configuración global. Solo lo que vive en el servidor: política de negocio y franjas.
 * El formulario local de SLA/moneda/límite de chofer se eliminó: duplicaba la política
 * o guardaba valores que el backend no usa.
 */
export const SettingsPage: React.FC = () => {
  const { currentUser } = useApp();

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-red-200 shadow-2xs max-w-lg mx-auto my-12">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Acceso No Autorizado</h2>
        <p className="text-xs text-slate-500 mt-1">
          El panel de Configuración Global está restringido exclusivamente para el Administrador.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuración Global del Sistema"
        subtitle="Política de negocio y agenda de franjas. Todo se publica en el servidor; no hay guardado solo en el navegador."
      />

      <PolicyPanel />
      <TimeSlotsPanel />
    </div>
  );
};
