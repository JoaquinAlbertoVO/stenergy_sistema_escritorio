import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Login.css';
import Aurora from '../ui/Aurora/Aurora';
import BlurText from '../ui/BlurText/BlurText';
import Loader from '../Loader';

function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 800));

    const result = await login(username.trim(), password);
    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
    }
  };

  return (
    <>
      {isLoading && <Loader />}
      <div className="login-page">
        <div className="login-bg-effects" style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        <Aurora colorStops={['#121212', '#332303', '#111111']} blend={0.8} amplitude={1.0} />
      </div>

      <div className="login-container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <div className="login-logo-icon">
                <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 4L36 12V28L20 36L4 28V12L20 4Z" stroke="#ffba0d" strokeWidth="2" fill="rgba(255,186,13,0.1)" />
                  <path d="M20 8L30 13V27L20 32L10 27V13L20 8Z" fill="rgba(255,186,13,0.2)" stroke="#ffba0d" strokeWidth="1.5" />
                  <path d="M15 18L19 22L26 15" stroke="#ffba0d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <BlurText text="ST Energy" className="login-title" delay={60} animateBy="letters" direction="bottom" />
              <BlurText text="Sistema de Gestión de Ventas" className="login-subtitle" delay={40} animateBy="words" direction="top" />
            </div>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="username">Usuario</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="username"
                  type="text"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="password">Contraseña</label>
              <div className="login-input-wrapper">
                <svg className="login-input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="login-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-btn ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="login-spinner"></div>
              ) : (
                <>
                  Iniciar Sesión
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>Accesos de prueba:</p>
            <div className="login-credentials">
              <span><strong>Admin:</strong> admin / admin123</span>
              <span><strong>Asesor 1:</strong> asesor1 / asesor123</span>
              <span><strong>Asesor 2:</strong> asesor2 / asesor123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default Login;
