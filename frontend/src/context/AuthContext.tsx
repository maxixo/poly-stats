import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  type User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "../services/firebase";

type AuthContextValue = {
  user: User | null;
  initializing: boolean;
  error: string;
  isConfigured: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthProviderProps = React.PropsWithChildren;

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) {
    return err.message;
  }
  return "Authentication failed";
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!auth) {
      setInitializing(false);
      return;
    }
    setPersistence(auth, browserLocalPersistence).catch(() => {});
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (!auth) {
      setError("Firebase auth is not configured.");
      return;
    }
    try {
      setError("");
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!auth) {
      setError("Firebase auth is not configured.");
      return;
    }
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!auth) {
      setError("Firebase auth is not configured.");
      return;
    }
    try {
      setError("");
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const signOutUser = async () => {
    if (!auth) {
      setError("Firebase auth is not configured.");
      return;
    }
    try {
      setError("");
      await signOut(auth);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const value = useMemo(
    () => ({
      user,
      initializing,
      error,
      isConfigured: isFirebaseConfigured,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signOutUser
    }),
    [user, initializing, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};