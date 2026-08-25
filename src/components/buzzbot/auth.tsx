"use client";

import { FirebaseError } from "firebase/app";
import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User,
} from "firebase/auth";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type FirebaseWebConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
};

export type AuthState = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  personalizationEligible: boolean;
  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  sendReset(email: string): Promise<void>;
  signOut(): Promise<void>;
};

export class AuthError extends Error {}

export function firebaseConfigFromEnv(config: FirebaseWebConfig) {
  const values = [config.apiKey, config.authDomain, config.projectId, config.appId];
  return values.every((value) => value?.trim())
    ? {
        apiKey: config.apiKey as string,
        authDomain: config.authDomain as string,
        projectId: config.projectId as string,
        appId: config.appId as string,
      }
    : null;
}

export function isPersonalizationEligible(
  user: Pick<User, "email" | "emailVerified"> | null,
): boolean {
  return Boolean(
    user?.emailVerified && user.email?.toLowerCase().endsWith("@gatech.edu"),
  );
}

const config = firebaseConfigFromEnv({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
});

function authError(error: unknown): AuthError {
  if (!(error instanceof FirebaseError)) {
    return error instanceof AuthError
      ? error
      : new AuthError("Authentication is temporarily unavailable.");
  }
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "An account already exists for this email.",
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Please try again later.",
    "auth/weak-password": "Use a password with at least six characters.",
  };
  return new AuthError(messages[error.code] ?? "Authentication is temporarily unavailable.");
}

let authInstance: Auth | null = null;

function configuredAuth(): Auth {
  if (!config) throw new AuthError("Authentication has not been configured yet.");
  if (!authInstance) {
    const app = getApps()[0] ?? initializeApp(config);
    authInstance = getAuth(app);
    void setPersistence(authInstance, browserLocalPersistence);
  }
  return authInstance;
}

const unavailable = async () => {
  throw new AuthError("Authentication has not been configured yet.");
};

const UNCONFIGURED_AUTH: AuthState = {
  configured: false,
  loading: false,
  user: null,
  personalizationEligible: false,
  signUp: unavailable,
  signIn: unavailable,
  sendReset: unavailable,
  signOut: unavailable,
};

const AuthContext = createContext<AuthState>(UNCONFIGURED_AUTH);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(config));

  useEffect(() => {
    if (!config) return;
    return onAuthStateChanged(configuredAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(() => {
    if (!config) return UNCONFIGURED_AUTH;
    return {
      configured: true,
      loading,
      user,
      personalizationEligible: isPersonalizationEligible(user),
      async signUp(email, password) {
        const auth = configuredAuth();
        try {
          const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await sendEmailVerification(credential.user);
          await firebaseSignOut(auth);
        } catch (error) {
          await firebaseSignOut(auth).catch(() => undefined);
          throw authError(error);
        }
      },
      async signIn(email, password) {
        const auth = configuredAuth();
        try {
          const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
          if (!credential.user.emailVerified) {
            await sendEmailVerification(credential.user);
            await firebaseSignOut(auth);
            throw new AuthError("Verify your email before signing in. We sent a new link.");
          }
        } catch (error) {
          throw authError(error);
        }
      },
      async sendReset(email) {
        try {
          await sendPasswordResetEmail(configuredAuth(), email.trim());
        } catch (error) {
          if (error instanceof FirebaseError && error.code === "auth/user-not-found") return;
          throw authError(error);
        }
      },
      async signOut() {
        try {
          await firebaseSignOut(configuredAuth());
        } catch (error) {
          throw authError(error);
        }
      },
    };
  }, [loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
