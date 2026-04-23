import { useState } from 'react'
import logoLaundry from '@/assets/logo-laundry.png'
import { Button } from '@/components/ui/button'

export type SessionRole = 'Administrador' | 'Supervisor'

type LoginViewProps = {
  onLoginSuccess: (role: SessionRole) => void
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const DEMO_CREDENTIALS: Record<'admin' | 'supervisor', { email: string; password: string; role: SessionRole }> = {
    admin: {
      email: 'admin@laundry.com',
      password: 'Admin123!',
      role: 'Administrador',
    },
    supervisor: {
      email: 'supervisor@laundry.com',
      password: 'Supervisor123!',
      role: 'Supervisor',
    },
  }

  const loadCredentials = (type: 'admin' | 'supervisor') => {
    setEmail(DEMO_CREDENTIALS[type].email)
    setPassword(DEMO_CREDENTIALS[type].password)
    setError('')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Completa correo y contraseña para continuar.')
      return
    }

    const matchedCredential = Object.values(DEMO_CREDENTIALS).find(
      (credential) => credential.email === email.trim() && credential.password === password,
    )

    if (!matchedCredential) {
      setError('Credenciales no válidas. Usa los botones de carga rápida.')
      return
    }

    setError('')
    onLoginSuccess(matchedCredential.role)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="mb-6 flex justify-center">
          <img src={logoLaundry} alt="CFL Laundry Clean Fresh" className="h-24 w-auto object-contain" />
        </div>

        <div className="mb-5 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-text">Ingreso administrativo</h1>
          <p className="mt-1 text-sm text-text-muted">Accede para gestionar operaciones, clientes y choferes.</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={() => loadCredentials('admin')}>
            Cargar Admin
          </Button>
          <Button type="button" variant="outline" onClick={() => loadCredentials('supervisor')}>
            Cargar Supervisor
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-text">
              Correo
            </label>
            <input
              id="email"
              type="email"
              placeholder="admin@laundry.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-text outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-text">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-text outline-none ring-0 transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {error ? <p className="text-sm font-medium text-destructive">{error}</p> : null}

          <Button type="submit" className="h-10 w-full">
            Ingresar al panel
          </Button>
        </form>
      </div>
    </div>
  )
}
