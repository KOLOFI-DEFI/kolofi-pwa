import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { createApi } from '@/core/api'
import { setApi } from '@/core/data'
import { ThemeProvider } from '@/app/ThemeProvider'
import { router } from '@/app/router'
import { useSession } from '@/state/session'
import { ToastProvider } from '@/ui'
import './styles/global.css'

setApi(
  createApi({
    mode: import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock',
    baseUrl: import.meta.env.VITE_API_BASE_URL,
    getToken: () => useSession.getState().token,
  }),
)

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
