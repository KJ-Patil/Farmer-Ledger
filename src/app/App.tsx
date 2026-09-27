import { BrowserRouter } from 'react-router-dom'
import { AppProvider } from './providers/AppProvider'
import { AppRoutes } from './routes'

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
