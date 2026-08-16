import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/app-shell.jsx'
import { authError, login, loginInputSchema, logout, sessionQueryOptions } from '@/features/auth/auth-api.js'

const seededAccount = { email: 'adi.rahman@sirip.id', password: 'SiripDemo2026!' }

export function AuthenticatedApp() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useQuery(sessionQueryOptions)
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, null)
      navigate('/login', { replace: true })
    },
  })

  if (session.isPending) return <main className="auth-state">Loading session…</main>
  if (session.isError) return <main className="auth-state" role="alert">Unable to verify your session.</main>
  if (!session.data) return <Navigate to="/login" state={{ from: location }} replace />

  return <AppShell user={session.data} onLogout={() => logoutMutation.mutate()} logoutPending={logoutMutation.isPending} />
}

export function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const formRef = useRef(null)
  const session = useQuery(sessionQueryOptions)
  const [errors, setErrors] = useState({})
  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData(sessionQueryOptions.queryKey, user)
      navigate(location.state?.from ?? '/', { replace: true })
    },
  })

  if (session.data) return <Navigate to="/" replace />

  function autofillSeededAccount() {
    formRef.current.elements.email.value = seededAccount.email
    formRef.current.elements.password.value = seededAccount.password
    setErrors({})
    formRef.current.elements.email.focus()
  }

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = loginInputSchema.safeParse({ email: form.get('email'), password: form.get('password') })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
      return
    }
    setErrors({})
    mutation.mutate(result.data)
  }

  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <img className="login-logo" src="/logo/sirip-color.png" alt="SIRIP" />
        <div className="login-heading"><span>Cold-chain operations</span><h1 id="login-title">Sign in to SIRIP</h1><p>Use your operator account to access the dashboard.</p></div>
        <div className="seeded-account"><div><strong>Demo operator</strong><span>{seededAccount.email}</span></div><button type="button" onClick={autofillSeededAccount}>Use seeded account</button></div>
        <form ref={formRef} className="login-form" onSubmit={submit}>
          <label>Email<input name="email" type="email" autoComplete="username" autoFocus aria-invalid={Boolean(errors.email)} />{errors.email && <span>{errors.email}</span>}</label>
          <label>Password<input name="password" type="password" autoComplete="current-password" aria-invalid={Boolean(errors.password)} />{errors.password && <span>{errors.password}</span>}</label>
          {mutation.isError && <p className="form-error" role="alert">{authError(mutation.error)}</p>}
          <button className="button button-primary login-submit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
