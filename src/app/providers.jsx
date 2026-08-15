import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

const queryClient = new QueryClient()

export function AppProviders({ children }) {
  return <QueryClientProvider client={queryClient}><BrowserRouter>{children}</BrowserRouter></QueryClientProvider>
}
