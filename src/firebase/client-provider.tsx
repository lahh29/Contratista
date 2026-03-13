'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export const FirebaseClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebase, setFirebase] = useState<{
    app: any;
    db: any;
    auth: any;
  } | null>(null);

  useEffect(() => {
    const { app, db, auth } = initializeFirebase();
    setFirebase({ app, db, auth });
  }, []);

  if (!firebase) return null;

  return (
    <FirebaseProvider app={firebase.app} db={firebase.db} auth={firebase.auth}>
      <FirebaseErrorListener />
      {children}
    </FirebaseProvider>
  );
};
