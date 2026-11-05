import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { createApi } from '@/core/api'
import { setApi } from '@/core/data'
import { ThemeProvider } from '@/app/ThemeProvider'
import { listenForInstall } from '@/app/install'
import { router } from '@/app/router'
import { useSession } from '@/state/session'
import { PinProvider, ToastProvider } from '@/ui'
import './styles/global.css'

setApi(
  createApi({
    // The real API unless demo mode is asked for explicitly.
    mode: import.meta.env.VITE_API_MODE === 'mock' ? 'mock' : 'http',
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
    getToken: () => useSession.getState().token,
    onUnauthorized: () => useSession.getState().signOut(),
  }),
)

listenForInstall()

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <PinProvider>
            <RouterProvider router={router} />
          </PinProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
