// This file is deprecated to prevent conflicting Firebase initializations.
// Please import Firebase services from '@/firebase' instead.

import { initializeFirebase } from '@/firebase';

const { auth, firestore: db } = initializeFirebase();

export { auth, db };
