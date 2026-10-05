import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Logo } from '../../components/common/Logo';
import {
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Leaf,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { switchRole } = useApp();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@laundryweb.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedDemoUser, setSelectedDemoUser] = useState<
    'ADMIN' | 'SUPERVISOR'
  >('ADMIN');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    switchRole(selectedDemoUser);
    navigate('/dashboard');
  };

  const handleSelectDemo = (role: 'ADMIN' | 'SUPERVISOR') => {
    setSelectedDemoUser(role);
    if (role === 'ADMIN') {
      setEmail('admin@laundryweb.com');
    } else {
      setEmail('supervisor@laundryweb.com');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] items-center justify-center p-4 sm:p-8">
      {/* Light Clean Card Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-lg overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Brand & Mission in Light Mode (45%) */}
        <div className="md:w-[45%] bg-[#F0F4F8] p-8 sm:p-10 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200/80">
          <div>
            <Logo variant="full" size="md" />

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-[#0F4C81] text-[11px] font-bold border border-slate-200/80 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Centro de Operaciones Digital
              </span>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mt-4 leading-snug">
                La operación de tu lavandería,{' '}
                <span className="text-[#0F4C81]">en un solo lugar.</span>
              </h1>

              <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Control integral para recogida a domicilio, procesamiento en
                planta de lavado, despacho dinámico de choferes y entregas
                puntuales.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center gap-3">
              <Leaf
                className="size-6 shrink-0 text-[#A5CD39]"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Ropa limpia, un mundo más limpio
                </p>
                <p className="text-[11px] text-slate-500">
                  Operaciones eficientes para un mejor mañana.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form (55%) */}
        <div className="flex-1 p-8 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Acceso a la plataforma
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Ingresa tus credenciales internas de operador.
            </p>
          </div>

          {/* Quick Demo Role Picker */}
          <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
              Presets de demostración rápida:
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectDemo('ADMIN')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  selectedDemoUser === 'ADMIN'
                    ? 'bg-[#0F4C81] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90'
                }`}
              >
                Carlos Mendoza
                <span className="block text-[10px] font-normal opacity-85">
                  Administrador (Total)
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectDemo('SUPERVISOR')}
                className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                  selectedDemoUser === 'SUPERVISOR'
                    ? 'bg-[#0F4C81] text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200/90'
                }`}
              >
                Elena Rostova
                <span className="block text-[10px] font-normal opacity-85">
                  Supervisor (Operaciones)
                </span>
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo corporativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Contraseña
                </label>
                <a
                  href="#recuperar"
                  onClick={(e) => e.preventDefault()}
                  className="text-xs text-sky-800 font-medium hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-sky-700 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs text-slate-600">
                  Recordarme en este equipo
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#0F4C81] hover:bg-[#0A3660] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <span>Iniciar sesión</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
