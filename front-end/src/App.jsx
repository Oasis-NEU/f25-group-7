import { Suspense } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './state/auth';
import { HoursProvider } from './state/hours';
import { RanksProvider } from './state/ranks';
import { AppShell } from './layout/AppShell';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { PageSpinner } from './ui/Spinner';
import { lazyPage } from './lib/lazyPage';
import Home from './pages/Home';
import Menu from './pages/Menu';
import Hours from './pages/Hours';
import NotFound from './pages/NotFound';

// The everyday pages ship in the main bundle; account pages, and the tracker
// with its charting library, load on demand.
const Vote = lazyPage(() => import('./pages/Vote'));
const Tracker = lazyPage(() => import('./pages/Tracker'));
const Rankings = lazyPage(() => import('./pages/Rankings'));
const Login = lazyPage(() => import('./pages/Login'));
const Signup = lazyPage(() => import('./pages/Signup'));
const Reset = lazyPage(() => import('./pages/Reset'));
const SetPass = lazyPage(() => import('./pages/setPass'));
const AuthAction = lazyPage(() => import('./pages/AuthAction'));

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <RanksProvider>
          <HoursProvider>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot" element={<Reset />} />
                <Route path="/reset-password" element={<SetPass />} />
                <Route path="/auth/action" element={<AuthAction />} />

                <Route element={<AppShell />}>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/menu" element={<Navigate to="/home" replace />} />
                  <Route path="/menu/:hall" element={<Menu />} />
                  <Route path="/menu/:hall/:meal" element={<Menu />} />
                  <Route path="/hours" element={<Hours />} />
                  {/* The hours page used to live at /about; keep old links working. */}
                  <Route path="/about" element={<Navigate to="/hours" replace />} />
                  <Route path="/vote" element={<RequireAuth feature="Voting"><Vote /></RequireAuth>} />
                  <Route path="/rankings" element={<RequireAuth feature="Your list"><Rankings /></RequireAuth>} />
                  <Route path="/tracker" element={<RequireAuth feature="The tracker"><Tracker /></RequireAuth>} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </HoursProvider>
          </RanksProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}
