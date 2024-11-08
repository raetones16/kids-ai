// frontend/src/App.tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './lib/router';

// You might want to keep this temporary styles import if you have one
import './App.css';

function App() {
  return <RouterProvider router={router} />;
}

export default App;