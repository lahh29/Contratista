'use server'

// ─── Server Actions: gestión de usuarios ──────────────────────────────────────
// Usa Firebase Admin SDK para crear/eliminar usuarios en Auth + Firestore
// sin desloguear al administrador actual.

import { getAdminApp } from '@/lib/firebase-admin'
import { getAuth }      from 'firebase-admin/auth'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export interface CreateUserInput {
  email:      string
  password:   string
  name:       string
  role:       string
  companyId?: string | null
}

export interface CreateUserResult {
  success: boolean
  uid?:    string
  error?:  string
}

/**
 * Crea un usuario en Firebase Auth y su documento en /users/{uid}.
 * Debe llamarse solo desde el admin (validar rol en el cliente antes de invocar).
 */
export async function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  try {
    const app  = getAdminApp()
    const auth = getAuth(app)
    const db   = getFirestore(app)

    const userRecord = await auth.createUser({
      email:       input.email.trim().toLowerCase(),
      password:    input.password,
      displayName: input.name.trim(),
    })

    await db.collection('users').doc(userRecord.uid).set({
      uid:       userRecord.uid,
      email:     input.email.trim().toLowerCase(),
      name:      input.name.trim(),
      role:      input.role,
      companyId: input.role === 'contractor' ? (input.companyId ?? null) : null,
      createdAt: FieldValue.serverTimestamp(),
    })

    return { success: true, uid: userRecord.uid }
  } catch (err: any) {
    const code: string = err?.code ?? ''
    const msg =
      code === 'auth/email-already-exists'   ? 'Ya existe una cuenta con ese correo.'              :
      code === 'auth/invalid-email'           ? 'El correo no tiene un formato válido.'             :
      code === 'auth/invalid-password'        ? 'La contraseña debe tener al menos 6 caracteres.'  :
      code === 'auth/weak-password'           ? 'La contraseña es demasiado débil.'                :
      err?.message ?? 'Error desconocido al crear el usuario.'

    return { success: false, error: msg }
  }
}

/**
 * Elimina un usuario de Firebase Auth y su documento en /users/{uid}.
 */
export async function deleteUser(uid: string): Promise<{ success: boolean; error?: string }> {
  try {
    const app  = getAdminApp()
    const auth = getAuth(app)
    const db   = getFirestore(app)

    await Promise.all([
      auth.deleteUser(uid),
      db.collection('users').doc(uid).delete(),
    ])

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Error al eliminar el usuario.' }
  }
}
