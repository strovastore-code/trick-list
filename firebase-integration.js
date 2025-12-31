// Firebase Integration for Trick List App
// This replaces localStorage with Firebase Authentication and Firestore

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, getDocs, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAeiDD28wTgxJrgVkhvInRAU1EZvh2QsdU",
  authDomain: "trick-list-3fc0d.firebaseapp.com",
  projectId: "trick-list-3fc0d",
  storageBucket: "trick-list-3fc0d.firebasestorage.app",
  messagingSenderId: "14175665702",
  appId: "1:14175665702:web:6591ad1247e999c75870e7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Owner credentials (same as before)
const OWNER_EMAIL = 'zenon.beckson.miah@gmail.com';
const OWNER_PASSWORD = 'admin123';

// Current user state
let currentUser = null;
let currentUserData = null;

// Wait for auth to initialize
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // Load user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      currentUserData = userDoc.data();
    } else {
      // Create user document if it doesn't exist
      currentUserData = {
        email: user.email,
        name: user.email.split('@')[0],
        learnedTricks: [],
        isOwner: user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()
      };
      await setDoc(doc(db, 'users', user.uid), currentUserData);
    }
    
    // Migrate localStorage data if this is first Firebase login
    await migrateLocalStorageData(user.uid);
  } else {
    currentUserData = null;
  }
});

// Migrate existing localStorage data to Firestore (one-time)
async function migrateLocalStorageData(uid) {
  const migrated = localStorage.getItem('firebase_migrated');
  if (migrated) return;
  
  try {
    // Migrate learned tricks
    const learnedStr = localStorage.getItem('tricklist_learned');
    if (learnedStr) {
      const learned = JSON.parse(learnedStr);
      if (learned.length > 0) {
        await updateDoc(doc(db, 'users', uid), {
          learnedTricks: learned
        });
      }
    }
    
    localStorage.setItem('firebase_migrated', 'true');
  } catch (error) {
    // Silent fail
  }
}

// Override fetch for API calls
const originalFetch = window.fetch;
window.fetch = async function(url, options = {}) {
  const urlStr = typeof url === 'string' ? url : url.href;
  
  // Handle authentication endpoints
  if (urlStr.includes('/api/auth/signup')) {
    const body = JSON.parse(options.body);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, body.email, body.password);
      const user = userCredential.user;
      
      // Create user document
      await setDoc(doc(db, 'users', user.uid), {
        email: body.email,
        name: body.name || body.email.split('@')[0],
        learnedTricks: [],
        isOwner: body.email.toLowerCase() === OWNER_EMAIL.toLowerCase()
      });
      
      return new Response(JSON.stringify({
        user: {
          id: user.uid,
          email: body.email,
          name: body.name || body.email.split('@')[0]
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  }
  
  if (urlStr.includes('/api/auth/login')) {
    const body = JSON.parse(options.body);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, body.email, body.password);
      const user = userCredential.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      return new Response(JSON.stringify({
        user: {
          id: user.uid,
          email: userData.email,
          name: userData.name,
          isOwner: userData.isOwner
        }
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
  }
  
  if (urlStr.includes('/api/auth/logout')) {
    await signOut(auth);
    return new Response(JSON.stringify({ success: true }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
  
  if (urlStr.includes('/api/auth/user')) {
    if (!currentUser || !currentUserData) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return new Response(JSON.stringify({
      user: {
        id: currentUser.uid,
        email: currentUserData.email,
        name: currentUserData.name,
        isOwner: currentUserData.isOwner
      }
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  
  // Handle learned tricks endpoints
  if (urlStr.includes('/api/me/learned-tricks')) {
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    if (options.method === 'POST' || options.method === 'DELETE') {
      // Extract trick ID from URL path
      const parts = urlStr.split('/');
      const trickId = parseInt(parts[parts.length - 1]);
      
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        
        if (options.method === 'POST') {
          await updateDoc(userRef, {
            learnedTricks: arrayUnion(trickId)
          });
          currentUserData.learnedTricks.push(trickId);
        } else {
          await updateDoc(userRef, {
            learnedTricks: arrayRemove(trickId)
          });
          currentUserData.learnedTricks = currentUserData.learnedTricks.filter(id => id !== trickId);
        }
        
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    } else {
      // GET request
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();
      
      return new Response(JSON.stringify({
        learnedIds: userData.learnedTricks || []
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  }
  
  // Handle feedback endpoints
  if (urlStr.includes('/api/feedback')) {
    if (options.method === 'POST') {
      if (!currentUser) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      const body = JSON.parse(options.body);
      try {
        await addDoc(collection(db, 'feedback'), {
          userId: currentUser.uid,
          userEmail: currentUserData.email,
          userName: currentUserData.name,
          message: body.message,
          timestamp: new Date().toISOString()
        });
        
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    } else if (options.method === 'GET') {
      // Only owner can get feedback
      if (!currentUser || !currentUserData || !currentUserData.isOwner) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      try {
        const feedbackQuery = query(collection(db, 'feedback'));
        const querySnapshot = await getDocs(feedbackQuery);
        const feedback = [];
        
        querySnapshot.forEach((doc) => {
          feedback.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return new Response(JSON.stringify({ feedback }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    } else if (options.method === 'DELETE') {
      // Only owner can delete feedback
      if (!currentUser || !currentUserData || !currentUserData.isOwner) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
          status: 403, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
      
      const parts = urlStr.split('/');
      const feedbackId = parts[parts.length - 1];
      
      try {
        await deleteDoc(doc(db, 'feedback', feedbackId));
        return new Response(JSON.stringify({ success: true }), { 
          status: 200, 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        });
      }
    }
  }
  
  // For all other requests (like /api/tricks, /api/trick-ai), use original fetch
  return originalFetch(url, options);
};
