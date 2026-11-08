import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../../components/common/Logo';
import { Lock, Mail, ArrowRight, Sparkles, Leaf } from 'lucide-react';
import { session, useSessionStatus } from '../../services/auth/session';

// Misma regla que la API: 10 a 72 caracteres con letras y números.
const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,72}$/;

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const status = useSessionStatus();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'signed-in') navigate('/dashboard', { replace: true });
  }, [status, navigate]);

  const run = async (action: () => Promise<void>) => {
    setError('');
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'No se pudo iniciar sesión.',
      );
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void run(() => session.login(email.trim(), password));
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_RULE.test(newPassword))
      return setError(
        'La nueva contraseña debe tener entre 10 y 72 caracteres, con letras y números.',
      );
    if (newPassword !== confirmPassword)
      return setError('Las contraseñas no coinciden.');
    void run(() => session.changePassword(password, newPassword));
  };

  const changing = status === 'password-change-required';

  return (
    <div className="min-h-screen w-full flex bg-[#0A3660] items-center justify-center p-4 sm:p-8">
      {/* Light Clean Card Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/90 shadow-[0_28px_70px_rgba(0,15,35,0.45),0_8px_24px_rgba(0,15,35,0.25)] overflow-hidden flex flex-col md:flex-row">
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
                  Tu ropa siempre limpia, fresca y natural.
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
              {changing ? 'Define tu contraseña' : 'Acceso a la plataforma'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {changing
                ? 'Tu cuenta usa una contraseña temporal. Crea una nueva para continuar.'
                : 'Ingresa tus credenciales internas de operador.'}
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700"
            >
              {error}
            </p>
          )}

          {!changing ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Correo corporativo
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || status === 'checking'}
                className="w-full py-3 px-4 bg-[#0F4C81] hover:bg-[#0A3660] disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <span>{busy ? 'Ingresando…' : 'Iniciar sesión'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Confirma la contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 px-4 bg-[#0F4C81] hover:bg-[#0A3660] disabled:opacity-60 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 mt-4 cursor-pointer"
              >
                <span>{busy ? 'Guardando…' : 'Guardar y continuar'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
