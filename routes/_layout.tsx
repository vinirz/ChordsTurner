import React from 'react';
import { Outlet, createFileRoute, useLocation, useNavigate } from '@tanstack/react-router';
import { Layout } from '../components/Layout';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const Route = createFileRoute('/_layout')({
  component: LayoutRoute,
});

function LayoutRoute() {
  const isOnline = useOnlineStatus();
  const location = useLocation();
  const navigate = useNavigate();

  const activeMode = location.pathname.includes('setlists') ? 'SETLISTS' : 'SEARCH';

  return (
    <Layout 
      activeMode={activeMode} 
      setMode={(mode) => navigate({ to: mode === 'SEARCH' ? '/' : '/setlists' })}
      isPerforming={false}
      isOnline={isOnline}
    >
      <Outlet />
    </Layout>
  );
}
