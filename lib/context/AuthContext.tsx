'use client';
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import posthog from 'posthog-js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  hasTeam: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshTeamStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

async function ensureSignupIsOpen() {
  const response = await fetch('/sih/api/auth/signup-status', {
    cache: 'no-store',
  });
  const data = await response.json();

  if (!response.ok || !data.signupOpen) {
    throw Object.assign(new Error(data.message || 'Signup is closed'), {
      code: 'SIGNUP_CLOSED',
    });
  }
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasTeam, setHasTeam] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const identifiedUserId = useRef<string | null>(null);
  const hasResolvedInitialAuthState = useRef(false);

  const identifyUser = (currentUser: User) => {
    if (identifiedUserId.current === currentUser.uid) {
      return;
    }

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(currentUser.uid, {
      email: currentUser.email ?? undefined,
      name: currentUser.displayName ?? undefined,
    });
    identifiedUserId.current = currentUser.uid;
  };

  // Function to check team registration status
  const refreshTeamStatus = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setHasTeam(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/sih/api/teamRegistration', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setHasTeam(!!data.team);
      } else {
        setHasTeam(false);
      }
    } catch (error) {
      console.error('Error checking team status:', error);
      setHasTeam(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        identifyUser(user);
      } else if (hasResolvedInitialAuthState.current && identifiedUserId.current) {
        posthog.reset();
        identifiedUserId.current = null;
      }
      hasResolvedInitialAuthState.current = true;

      setUser(user);
      setLoading(false);
      
      // Check team status and admin role for authenticated users
      if (user) {
        try {
          const token = await user.getIdToken();
          
          // Check user role and team status
          const [userResponse, teamResponse] = await Promise.all([
            fetch('/sih/api/auth/verify', {
              headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/sih/api/teamRegistration', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
          ]);
          
          // Check admin role
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setIsAdmin(userData.user?.role === 'admin');
          } else {
            setIsAdmin(false);
          }
          
          // Check team status
          if (teamResponse.ok) {
            const teamData = await teamResponse.json();
            setHasTeam(!!teamData.team);
          } else {
            setHasTeam(false);
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          setHasTeam(false);
          setIsAdmin(false);
        }
      } else {
        setHasTeam(false);
        setIsAdmin(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      await ensureSignupIsOpen();
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(user, { displayName });
      
      // Sync user with backend after signup
      if (user) {
        try {
          const token = await user.getIdToken();
          const response = await fetch('/sih/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: displayName || '',
              email: user.email || '',
              firebaseUid: user.uid
            })
          });
          if (!response.ok) {
            const data = await response.json();
            await firebaseSignOut(auth);
            throw Object.assign(new Error(data.error || 'Signup failed'), {
              code: data.code,
            });
          }
        } catch (syncError) {
          console.error('Error syncing user with backend:', syncError);
          throw syncError;
        }
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      await ensureSignupIsOpen();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Sync user with backend after Google OAuth
      if (result.user) {
        try {
          const token = await result.user.getIdToken();
          const response = await fetch('/sih/api/auth/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              name: result.user.displayName || '',
              email: result.user.email || '',
              firebaseUid: result.user.uid
            })
          });
          if (!response.ok) {
            const data = await response.json();
            await firebaseSignOut(auth);
            throw Object.assign(new Error(data.error || 'Signup failed'), {
              code: data.code,
            });
          }
        } catch (syncError) {
          console.error('Error syncing user with backend:', syncError);
          throw syncError;
        }
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    hasTeam,
    isAdmin,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    refreshTeamStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
