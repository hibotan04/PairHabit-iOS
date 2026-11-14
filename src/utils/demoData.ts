import { db } from '../../firebaseConfig';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';

export const seedDemoData = async (userUid: string, userDisplayName: string = 'You') => {
  try {
    // 1. Generate Fake Couple ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let coupleId = '';
    for (let i = 0; i < 6; i++) {
      coupleId += chars.charAt(Math.floor(Math.random() * chars.length));
    }


    // 2. Create Couple Doc
    const coupleRef = doc(db, 'couples', coupleId);

    // Partner Data
    const partnerUid = 'demo_partner_uid';

    await setDoc(coupleRef, {
      createdAt: new Date().toISOString(),
      createdBy: userUid,
      users: [userUid, partnerUid],
      currency: '¥',
      members: {
        [userUid]: {
          name: userDisplayName,
          icon: '🐶',
          color: 'blue',
          joinedAt: new Date().toISOString()
        },
        [partnerUid]: {
          name: 'Partner',
          icon: '🐱',
          color: 'pink',
          joinedAt: new Date().toISOString()
        }
      }
    });

    // 3. Update User Doc
    const userRef = doc(db, 'users', userUid);
    await setDoc(userRef, {
      coupleId: coupleId,
      isSetupCompleted: true, // Bypass setup screens
      displayName: userDisplayName,
      icon: '🐶',
      color: 'blue',
      themeColor: '#8f7161',
    }, { merge: true });

    // 4. Create Partner User Doc (so their name appears correctly in some views)
    const partnerRef = doc(db, 'users', partnerUid);
    await setDoc(partnerRef, {
      coupleId: coupleId,
      isSetupCompleted: true,
      displayName: 'Partner',
      icon: '🐱',
      color: 'pink',
      themeColor: '#8f7161',
    }, { merge: true });


    // 5. Add Sample Habits
    const habitsRef = collection(db, 'couples', coupleId, 'habits');

    await addDoc(habitsRef, {
      name: 'Morning Walk',
      value: 100,
      emoji: '🚶',
      ownerId: userUid,
      createdAt: new Date().toISOString(),
      history: {
        // Mark today as completed for visual effect if desired, or leave empty
      }
    });

    await addDoc(habitsRef, {
      name: 'Reading',
      value: 100,
      emoji: '📖',
      ownerId: partnerUid,
      createdAt: new Date().toISOString(),
      history: {}
    });

    // 6. Add Sample Goals/Rewards
    const goalsRef = collection(db, 'couples', coupleId, 'goals');
    await addDoc(goalsRef, {
      name: 'Cafe Date',
      cost: 500,
      achieved: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      image: '', // No image for demo to avoid valid URL issues
    });

    // 7. Add Sample Messages
    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    await addDoc(messagesRef, {
      text: 'Let\'s keep going together!',
      senderId: partnerUid,
      createdAt: new Date().toISOString(), // Recent
      type: 'text'
    });

    console.log("Demo data seeded successfully.");

  } catch (e) {
    console.error("Error seeding demo data:", e);
    // Don't re-throw, just log, so login proceeds even if seeding fails partially
  }
};
