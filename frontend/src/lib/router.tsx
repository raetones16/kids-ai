// frontend/src/lib/router.tsx
import { createBrowserRouter } from 'react-router-dom';
import Registration from '@/pages/Registration';
import Login from '@/pages/Login';
import Home from '@/pages/Home';
import Chat from '@/pages/Chat';

export const router = createBrowserRouter([
  {
    path: '/',
    // Temporarily use the button example as home page
    element: (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Kids AI Platform</h1>
        <div className="space-x-4">
          <a href="/register">Go to Registration</a>
        </div>
      </div>
    ),
  },
  {
    path: '/register',
    element: <Registration />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/chat',
    element: <Chat />,
  },
]);