import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// A minimal hash-based router so we don't need to add react-router.
// Routes: #/  #/signup  #/signin  #/pending  #/dashboard  #/deposit  #/withdraw
//         #/history  #/admin  #/admin-dashboard  #/referral

export type Route =
  | 'home'
  | 'signup'
  | 'signin'
  | 'pending'
  | 'dashboard'
  | 'deposit'
  | 'withdraw'
  | 'history'
  | 'helpline'
  | 'referral'
  | 'admin'
  | 'admin-dashboard';

interface RouterContextValue {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;
}

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function parseHash(): { route: Route; params: Record<string, string> } {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [path, queryStr] = hash.split('?');
  const params: Record<string, string> = {};
  if (queryStr) {
    for (const pair of queryStr.split('&')) {
      const [k, v] = pair.split('=');
      if (k) params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    }
  }
  const validRoutes: Route[] = [
    'home', 'signup', 'signin', 'pending', 'dashboard', 'deposit',
    'withdraw', 'history', 'helpline', 'referral', 'admin', 'admin-dashboard',
  ];
  const route = (validRoutes as string[]).includes(path) ? (path as Route) : 'home';
  return { route, params };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => parseHash());

  useEffect(() => {
    const onHashChange = () => {
      setState(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHashChange);
    if (!window.location.hash) window.location.hash = '#/';
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (route: Route, params?: Record<string, string>) => {
    let hash = `#/${route}`;
    if (params && Object.keys(params).length) {
      const qs = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      hash += `?${qs}`;
    }
    window.location.hash = hash;
  };

  return (
    <RouterContext.Provider value={{ route: state.route, params: state.params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
