import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-3xl font-black text-slate-900">{t('common.pageNotFound', 'Page Not Found')}</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-sm">
        {t('common.pageNotFoundMessage', "The page or case you are looking for doesn't exist or has moved.")}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('common.goHome', 'Return to Dashboard')}</span>
      </Link>
    </div>
  );
};

export default NotFoundPage;
