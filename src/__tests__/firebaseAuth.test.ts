import { auth } from '../firebase'; // Import the shared auth instance
import { 
  createUserWithEmailAndPassword, 
  deleteUser, 
  signInWithEmailAndPassword, 
  signOut 
} from 'firebase/auth';

describe('Firebase Authentication Flow', () => {
  let testEmail: string;
  const testPassword = 'TestPassword123!';

  beforeAll(() => {
    // Generate a unique email for each test run
    testEmail = `testuser${Date.now()}@example.com`;
    // Increase timeout for Firebase operations
    jest.setTimeout(30000); // 30 seconds
  });

  it('should register a new user, sign out, sign in, and then delete the user', async () => {
    let userUid: string | null = null;
    try {
      // 1. Register a new user
      console.log(`Attempting to register user: ${testEmail}`);
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      expect(userCredential).toBeDefined();
      expect(userCredential.user).toBeDefined();
      expect(userCredential.user.email).toBe(testEmail);
      userUid = userCredential.user.uid; // Store UID for potential cleanup
      console.log(`✅ User registered successfully: ${userUid}`);

      // 2. Sign out the newly registered user
      await signOut(auth);
      expect(auth.currentUser).toBeNull();
      console.log(`✅ User signed out successfully.`);

      // 3. Sign back in
      console.log(`Attempting to sign in user: ${testEmail}`);
      const signInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
      expect(signInCredential).toBeDefined();
      expect(signInCredential.user).toBeDefined();
      expect(signInCredential.user.email).toBe(testEmail);
      expect(signInCredential.user.uid).toBe(userUid);
      console.log(`✅ User signed in successfully: ${signInCredential.user.uid}`);

      // 4. Clean up: Delete the user (must be signed in)
      console.log(`Attempting to delete user: ${signInCredential.user.uid}`);
      await deleteUser(signInCredential.user);
      userUid = null; // Mark as deleted
      console.log(`✅ User deleted successfully.`);

    } catch (error: any) {
      console.error(`❌ Test failed during Firebase operation:`, error.code, error.message);
      // If deletion failed but user was created, try to clean up
      if (userUid && auth.currentUser && auth.currentUser.uid === userUid) {
        console.log(`Attempting cleanup after failure...`);
        try {
          await deleteUser(auth.currentUser);
          console.log(`✅ Cleanup successful.`);
        } catch (cleanupError: any) {
          console.error(`❌ Cleanup failed:`, cleanupError.code, cleanupError.message);
        }
      }
      // Re-throw the original error to fail the test
      throw error; 
    }
  });
}); 