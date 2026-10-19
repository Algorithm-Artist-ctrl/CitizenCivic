import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Layers, Home } from 'lucide-react';
import Button from '../components/ui/Button';

export const NotFoundPage: React.FC = () => {

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center font-sans">
      <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-12 shadow-xs max-w-md w-full space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
          <ShieldAlert className="h-6 w-6 text-slate-900" />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-xs font-bold text-slate-400">ERROR 404</span>
          <h1 className="text-xl font-bold tracking-tight text-slate-950">
            Resource or Case Record Not Found
          </h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            The requested page URL or municipal case reference does not exist on the Ward 82 registry.
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link to="/">
            <Button variant="primary" size="md" className="w-full" icon={<Home className="h-3.5 w-3.5" />}>
              Return to Public Portal
            </Button>
          </Link>
          <Link to="/cases">
            <Button variant="secondary" size="md" className="w-full" icon={<Layers className="h-3.5 w-3.5" />}>
              Explore Cases Directory
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
