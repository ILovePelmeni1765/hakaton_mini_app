import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './styles.css';
import { App } from './App';
import { platform } from './platform';
import { SessionRestore } from './components/SessionRestore';
import { useAppStore } from './store';

platform.init();
platform.ready();
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false }, mutations: { retry: 0 } } });
useAppStore.subscribe((state, previous) => {
  if (previous.token && state.token !== previous.token) queryClient.clear();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><SessionRestore><App /></SessionRestore></BrowserRouter></QueryClientProvider></React.StrictMode>,
);
