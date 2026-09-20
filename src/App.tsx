import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import History from './routes/History';
import Home from './routes/Home';
import Review from './routes/Review';
import Round from './routes/Round';
import Settings from './routes/Settings';
import Setup from './routes/Setup';

// Routes only — handoff §9. Prep and Speaking share /round on purpose.
const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/setup', element: <Setup /> },
  { path: '/round', element: <Round /> },
  { path: '/round/review', element: <Review /> },
  { path: '/history', element: <History /> },
  { path: '/history/:sessionId', element: <Review /> },
  { path: '/settings', element: <Settings /> },
  { path: '*', element: <Home /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
