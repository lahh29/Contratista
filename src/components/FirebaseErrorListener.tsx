'use client';

import React, { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

import { toastError } from "@/lib/toast-helpers"
export const FirebaseErrorListener = () => {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      console.error('Firebase Permission Error:', error);
      
      // Mostrar toast informativo del error de permisos
      toastError('Error de Acceso', 'No tienes permisos suficientes para ver o modificar esta información. Asegúrate de haber iniciado sesión correctamente.');
    };

    errorEmitter.on('permission-error', handleError);
    return () => {
      errorEmitter.off('permission-error', handleError);
    };
  }, [toast]);

  return null;
};