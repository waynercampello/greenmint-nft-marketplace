import { RouterProvider } from '@tanstack/react-router';
import { AppProvider } from '@/stores/appStore';
import { router } from '@/routes/router';

export function App() {
  return (
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  );
}

export default App;
