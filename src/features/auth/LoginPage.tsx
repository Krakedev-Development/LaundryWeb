import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import background from '../../../assets/fondo-login.png';
import brandBackground from '../../../assets/fondo-square-login.png';
import './login.css';

export const LoginPage: React.FC = () => {
  const { switchRole } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@laundryweb.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedDemoUser, setSelectedDemoUser] = useState<
    'ADMIN' | 'SUPERVISOR'
  >('ADMIN');

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    switchRole(selectedDemoUser);
    navigate('/dashboard');
  };
  const handleSelectDemo = (role: 'ADMIN' | 'SUPERVISOR') => {
    setSelectedDemoUser(role);
    setEmail(
      role === 'ADMIN' ? 'admin@laundryweb.com' : 'supervisor@laundryweb.com',
    );
  };

  return (
    <div
      className="login-page"
      style={{ backgroundImage: `url(${background})` }}
    >
      <div className="login-card">
        <div className="login-brand">
          <img
            src={brandBackground}
            width={1254}
            height={1254}
            alt="CFL LAUNDRY CLEAN FRESH"
          />
          <h1 className="sr-only">Controla tu lavandería en un solo lugar.</h1>
          <p className="sr-only">
            Operaciones simples, resultados más frescos.
          </p>
        </div>
        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-heading">
              <h2>Iniciar sesión</h2>
              <span className="login-heading-accent" aria-hidden="true" />
              <p>Ingresa tus credenciales para continuar.</p>
            </div>
            <div
              className="login-role-selector"
              role="group"
              aria-label="Rol de acceso"
            >
              {(
                [
                  { role: 'ADMIN', label: 'Administrador', Icon: UserRound },
                  { role: 'SUPERVISOR', label: 'Supervisor', Icon: UsersRound },
                ] as const
              ).map(({ role, label, Icon }) => (
                <button
                  type="button"
                  key={role}
                  aria-pressed={selectedDemoUser === role}
                  onClick={() => handleSelectDemo(role)}
                >
                  <Icon aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <form onSubmit={handleLogin} className="login-form">
              <div className="login-field">
                <label htmlFor="login-email">Correo</label>
                <div className="login-input-wrapper">
                  <Mail aria-hidden="true" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="tu@empresa.com"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              <div className="login-field">
                <label htmlFor="login-password">Contraseña</label>
                <div className="login-input-wrapper">
                  <LockKeyhole aria-hidden="true" />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((previous) => !previous)}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
              <div className="login-options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span className="login-checkbox" aria-hidden="true">
                    {rememberMe && <Check />}
                  </span>
                  Recordarme
                </label>
                <a
                  href="#recuperar"
                  onClick={(event) => event.preventDefault()}
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <button type="submit" className="login-submit">
                Ingresar
                <ArrowRight aria-hidden="true" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
