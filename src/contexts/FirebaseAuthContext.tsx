import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db } from "../firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

// Define structure for profile data (including survey)
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: any; // Firestore Timestamp
  demographicsCompleted?: boolean;
  demographicsData?: any; // Or a more specific type for survey answers
  // Add other profile fields as needed
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (username: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    const userRef = doc(db, "userProfiles", firebaseUser.uid);
    try {
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      } else {
        console.log("No profile found for user, creating basic profile.");
        const newProfileData: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          createdAt: serverTimestamp(),
          demographicsCompleted: false
        };
        await setDoc(userRef, newProfileData);
        return newProfileData;
      }
    } catch (error) {
      console.error("Error fetching/creating user profile:", error);
      return null;
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const userProfile = await fetchUserProfile(firebaseUser);
        setProfile(userProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);

  const register = async (username: string, email: string, password: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName: username });
      const userRef = doc(db, "userProfiles", userCredential.user.uid);
      const newProfileData: UserProfile = {
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: username,
        createdAt: serverTimestamp(),
        demographicsCompleted: false
      };
      await setDoc(userRef, newProfileData);
      setProfile(newProfileData);
    }
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    if (result.user) {
        const userRef = doc(db, "userProfiles", result.user.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
             console.log("Creating profile for Google Sign-In user.");
             const newProfileData: UserProfile = { 
                uid: result.user.uid,
                email: result.user.email,
                displayName: result.user.displayName,
                createdAt: serverTimestamp(),
                demographicsCompleted: false
             };
             await setDoc(userRef, newProfileData);
             setProfile(newProfileData); 
        } else {
             setProfile(docSnap.data() as UserProfile);
        }
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        profile,
        loading, 
        register, 
        login, 
        logout, 
        signInWithGoogle 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useFirebaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useFirebaseAuth must be used within a FirebaseAuthProvider");
  return context;
}; 