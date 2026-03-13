'use client';

import React, { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

export const FirebaseErrorListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      console.error('Firebase Error:', error);
      toast({
        variant: 'destructive',
        title: 'Error de Permisos',
        description: 'No tienes permisos suficientes para realizar esta acción en la base de datos.',
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
};
