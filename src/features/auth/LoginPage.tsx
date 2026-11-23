import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Logo } from '../../components/common/Logo';
import { Lock, Mail, ArrowRight, Sparkles, Leaf } from 'lucide-react';
import { session, useSessionStatus } from '../../services/auth/session';
import { field } from '../../shared/ui/controls';

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
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-gradient-to-br from-[#072748] via-primary-hover to-primary p-4 sm:p-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 right-0 size-96 rounded-full bg-brand-lime/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-sky-400/10 blur-3xl"
      />

      {/* Light Clean Fintech Container */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white shadow-[0_28px_70px_rgba(0,15,35,0.45),0_8px_24px_rgba(0,15,35,0.25)] md:flex-row"
      >
        {/* Left Side: Brand & Mission in Light Mode (45%) */}
        <div className="flex flex-col justify-between border-b border-slate-200/80 bg-surface-muted p-8 sm:p-10 md:w-[45%] md:border-b-0 md:border-r">
          <div>
            <Logo variant="full" size="md" />

            <div className="mt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1 text-[11px] font-bold text-primary shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Centro de Operaciones Digital
              </span>

              <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-ink sm:text-3xl">
                La operación de tu lavandería,{' '}
                <span className="text-primary">en un solo lugar.</span>
              </h1>

              <p className="mt-3 text-xs leading-relaxed text-slate-600 sm:text-sm">
                Control integral para recogida a domicilio, procesamiento en
                planta de lavado, despacho dinámico de choferes y entregas
                puntuales.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3 border-t border-slate-200/80 pt-6">
            <div className="flex items-center gap-3">
              <Leaf
                className="size-6 shrink-0 text-brand-lime"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-bold text-ink">
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
        <div className="flex flex-1 flex-col justify-center p-8 sm:p-10">
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight text-ink">
              {changing ? 'Define tu contraseña' : 'Acceso a la plataforma'}
            </h2>
            <p className="mt-1 text-xs text-subtle">
              {changing
                ? 'Tu cuenta usa una contraseña temporal. Crea una nueva para continuar.'
                : 'Ingresa tus credenciales internas de operador.'}
            </p>
          </div>

          {error && (
            <motion.p
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
            >
              {error}
            </motion.p>
          )}

          {!changing ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Correo corporativo
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`${field} mt-0 pl-10 text-xs sm:text-sm`}
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${field} mt-0 pl-10 font-mono text-xs sm:text-sm`}
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={busy || status === 'checking'}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-[0_2px_8px_rgba(15,76,129,0.28)] transition-colors hover:bg-primary-hover disabled:opacity-60 sm:text-sm"
              >
                <span>{busy ? 'Ingresando…' : 'Iniciar sesión'}</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label
                  htmlFor="new-password"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Nueva contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="new-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${field} mt-0 pl-10 font-mono text-xs sm:text-sm`}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Confirma la contraseña
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${field} mt-0 pl-10 font-mono text-xs sm:text-sm`}
                  />
                </div>
              </div>
              <motion.button
                type="submit"
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-xs font-bold text-white shadow-[0_2px_8px_rgba(15,76,129,0.28)] transition-colors hover:bg-primary-hover disabled:opacity-60 sm:text-sm"
              >
                <span>{busy ? 'Guardando…' : 'Guardar y continuar'}</span>
                <ArrowRight className="h-4 w-4" />
              </motion.button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
