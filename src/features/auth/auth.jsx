import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { AppShell } from '@/components/app-shell.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { authError, login, loginInputSchema, logout, sessionQueryOptions, signup, signupInputSchema } from '@/features/auth/auth-api.js'

const seededAccount = { email: 'adi.rahman@sirip.id', password: 'SiripDemo2026!' }

function clearAccountData(queryClient) {
  queryClient.removeQueries({ predicate: ({ queryKey }) => queryKey[0] !== 'auth' })
}

function AuthField({ label, name, error, ...props }) {
  const errorId = `${name}-error`
  return <div className="grid gap-2">
    <Label className="text-xs font-semibold text-slate-600" htmlFor={name}>{label}</Label>
    <Input className="h-11 bg-white px-3" id={name} name={name} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} {...props} />
    {error && <span className="text-xs text-red-700" id={errorId}>{error}</span>}
  </div>
}

export function AuthenticatedApp() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const session = useQuery(sessionQueryOptions)
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearAccountData(queryClient)
      queryClient.setQueryData(sessionQueryOptions.queryKey, null)
      navigate('/login', { replace: true })
    },
  })

  if (session.isPending) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading session…</main>
  if (session.isError) return <main className="grid min-h-screen place-items-center text-sm text-muted-foreground" role="alert">Unable to verify your session.</main>
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
      clearAccountData(queryClient)
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
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(145deg,#eff6ff,var(--background)_48%,#f0fdf4)] p-6 max-[560px]:p-2.5">
      <section className="w-full max-w-[430px] rounded-[14px] border border-border bg-white/95 p-[34px] shadow-[0_24px_70px_rgb(2_40_88_/_12%)] max-[560px]:p-5" aria-labelledby="login-title">
        <img className="block h-auto w-[126px]" src="/logo/sirip-color.png" alt="SIRIP" />
        <div className="mt-[34px] mb-6 max-[560px]:mt-7"><span className="text-[10px] font-bold tracking-[.08em] text-brand uppercase">Cold-chain operations</span><h1 className="mt-[7px] text-[28px] font-bold tracking-[-.04em]" id="login-title">Sign in to SIRIP</h1></div>
        <div className="mb-[19px] flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3"><div><strong className="block text-xs">Demo operator</strong><span className="mt-[3px] block text-[10px] text-muted-foreground">{seededAccount.email}</span></div><Button className="h-auto shrink-0 px-0 text-[10px]" variant="link" type="button" onClick={autofillSeededAccount}>Use seeded account</Button></div>
        <form ref={formRef} className="grid gap-[17px]" onSubmit={submit}>
          <AuthField label="Email" name="email" error={errors.email} type="email" autoComplete="username" autoFocus />
          <AuthField label="Password" name="password" error={errors.password} type="password" autoComplete="current-password" />
          {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{authError(mutation.error)}</p>}
          <Button className="mt-0.5 h-11 w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Signing in…' : 'Sign in'}</Button>
        </form>
        <p className="mt-[22px] text-center text-xs text-muted-foreground">Don't have an account? <Link className="font-bold text-primary hover:underline" to="/signup">Sign up</Link></p>
      </section>
    </main>
  )
}

export function SignupPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const session = useQuery(sessionQueryOptions)
  const [errors, setErrors] = useState({})
  const mutation = useMutation({
    mutationFn: signup,
    onSuccess: (user) => {
      clearAccountData(queryClient)
      queryClient.setQueryData(sessionQueryOptions.queryKey, user)
      navigate('/', { replace: true })
    },
  })

  if (session.data) return <Navigate to="/" replace />

  function submit(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const result = signupInputSchema.safeParse({
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      password: form.get('password'),
      confirmPassword: form.get('confirmPassword'),
    })
    if (!result.success) {
      setErrors(Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message])))
      return
    }
    setErrors({})
    mutation.mutate(result.data)
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[linear-gradient(145deg,#eff6ff,var(--background)_48%,#f0fdf4)] p-6 max-[560px]:p-2.5">
      <section className="my-6 w-full max-w-[430px] rounded-[14px] border border-border bg-white/95 p-[34px] shadow-[0_24px_70px_rgb(2_40_88_/_12%)] max-[560px]:my-0 max-[560px]:p-5" aria-labelledby="signup-title">
        <img className="block h-auto w-[126px]" src="/logo/sirip-color.png" alt="SIRIP" />
        <div className="mt-[34px] mb-6 max-[560px]:mt-7"><span className="text-[10px] font-bold tracking-[.08em] text-brand uppercase">Operator account</span><h1 className="mt-[7px] text-[28px] font-bold tracking-[-.04em]" id="signup-title">Create your account</h1><p className="mt-[9px] text-sm leading-relaxed text-muted-foreground">Register as a cold-chain operations coordinator.</p></div>
        <form className="grid gap-[17px]" onSubmit={submit}>
          <AuthField label="Full name" name="name" error={errors.name} autoComplete="name" autoFocus />
          <AuthField label="Email" name="email" error={errors.email} type="email" autoComplete="username" />
          <AuthField label="WhatsApp phone" name="phone" error={errors.phone} type="tel" autoComplete="tel" placeholder="+6281234567890" />
          <AuthField label="Password" name="password" error={errors.password} type="password" autoComplete="new-password" />
          <AuthField label="Confirm password" name="confirmPassword" error={errors.confirmPassword} type="password" autoComplete="new-password" />
          {mutation.isError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700" role="alert">{authError(mutation.error)}</p>}
          <Button className="mt-0.5 h-11 w-full" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="mt-[22px] text-center text-xs text-muted-foreground">Already have an account? <Link className="font-bold text-primary hover:underline" to="/login">Sign in</Link></p>
      </section>
    </main>
  )
}
