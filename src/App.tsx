import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Collection from './routes/Collection';
import History from './routes/History';
import Home from './routes/Home';
import Privacy from './routes/Privacy';
import Progress from './routes/Progress';
import Review from './routes/Review';
import Round from './routes/Round';
import Settings from './routes/Settings';
import SignIn from './routes/SignIn';
import Setup from './routes/Setup';

// Routes only — handoff §9. Prep and Speaking share /round on purpose.
const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/setup', element: <Setup /> },
  { path: '/round', element: <Round /> },
  { path: '/round/review', element: <Review /> },
  { path: '/history', element: <History /> },
  { path: '/history/:sessionId', element: <Review /> },
  { path: '/collection', element: <Collection /> },
  { path: '/progress', element: <Progress /> },
  { path: '/settings', element: <Settings /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/signin', element: <SignIn /> },
  { path: '*', element: <Home /> },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
