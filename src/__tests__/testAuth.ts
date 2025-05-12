import { auth } from '../firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser
} from 'firebase/auth';

async function testFirebaseAuth() {
  console.log('🔥 Testing Firebase Authentication...');
  
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    // 1. Create a new user
    console.log(`Creating user: ${testEmail}`);
    const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User created successfully', userCredential.user.uid);
    
    // 2. Sign out
    await signOut(auth);
    console.log('✅ User signed out successfully');
    
    // 3. Sign in with the created user
    console.log(`Signing in as: ${testEmail}`);
    const signInCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log('✅ User signed in successfully', signInCredential.user.uid);
    
    // 4. Clean up - delete the test user
    console.log('Deleting test user...');
    await deleteUser(signInCredential.user);
    console.log('✅ Test user deleted successfully');
    
    console.log('🎉 All Firebase auth tests passed!');
  } catch (error: any) {
    console.error('❌ Firebase auth test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testFirebaseAuth(); 