import "./global.css";
import './src/i18n';
import { registerForPushNotificationsAsync, savePushTokenToFirestore, sendPushNotificationToPartner } from './src/utils/notificationHelper';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthContext } from './src/context/AuthContext';
import { View, ActivityIndicator, LogBox, LayoutAnimation, UIManager, Platform, Alert, Image, AppState } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddHabitScreen from './src/screens/AddHabitScreen';
import AddRewardScreen from './src/screens/AddRewardScreen';
import RedeemScreen from './src/screens/RedeemScreen';
import SetupHabitScreen from './src/screens/SetupHabitScreen';
import SetupRewardScreen from './src/screens/SetupRewardScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules } from 'react-native';

// LogBox.ignoreLogs(['FirebaseError: [code=permission-denied]']);
import { db, auth } from './firebaseConfig';
import { collection, doc, onSnapshot, updateDoc, deleteField, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

const Stack = createNativeStackNavigator();
import { Habit, Reward, User as AppUser } from './src/types';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TabNavigator from './src/navigation/TabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import PairingScreen from './src/screens/PairingScreen';
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen';
import LoadingScreen from './src/screens/LoadingScreen';
import SubscriptionScreen from './src/screens/SubscriptionScreen';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import { SubscriptionService } from './src/services/SubscriptionService';




const App = () => {
  const { t } = useTranslation();
  useEffect(() => {
    // Reload widgets when app goes to background/inactive (User leaves app)
    // This helps catch updates that might have been skipped while app was active
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        const { reloadTimelines } = require('./modules/widget-controller');
        // Safe check if module exists
        if (reloadTimelines) {
          reloadTimelines('HabitWidget');
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Reward[]>([]);
  const [memories, setMemories] = useState<any[]>([]);
  const [currency, setCurrency] = useState('¥');
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [partnerData, setPartnerData] = useState<AppUser | null>(null);
  const [isSetupCompleted, setIsSetupCompleted] = useState(false);

  useEffect(() => {
    let unsubUser: () => void; // Define unsubUser here to scope it

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Register for Push Notifications
        registerForPushNotificationsAsync().then(token => {
          if (token) savePushTokenToFirestore(currentUser.uid, token);
        });

        // Initialize RevenueCat
        await SubscriptionService.init(currentUser.uid);

        try {
          const userDocRef = doc(db, 'users', currentUser.uid);

          // Clean up previous listener if exists (though usually onAuthStateChanged handles this by re-running)
          if (unsubUser) unsubUser();

          unsubUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();

              if (data?.coupleId) {
                setCoupleId(data.coupleId);
              } else {
                setCoupleId(null);
              }
              // Check setup status
              // Check setup status
              const setupStatus = !!data?.isSetupCompleted;

              // Only update if remote is TRUE, or if we are currently FALSE.
              // We DO NOT want to revert to false if we are already true locally (optimistic update),
              // because there might be a race condition where Firestore hasn't caught up yet.
              if (setupStatus === true && !isSetupCompleted) {
                console.log(`Syncing isSetupCompleted from Firestore: ${setupStatus} `);
                setIsSetupCompleted(true);
              } else if (setupStatus === false && isSetupCompleted) {
                console.log("Ignoring cached/stale Firestore value (false) because local isSetupCompleted is already true.");
              }

              setUserData({
                uid: currentUser.uid,
                name: data?.displayName || data?.name || '',
                icon: data?.photoURL || data?.icon || '',
                color: data?.color || 'blue',
                themeColor: data?.themeColor || '#8f7161',
                weekStartDay: data?.weekStartDay || 0,
                isPro: data?.isPro || false,
                isSponsor: data?.isSponsor || false
              });
            }
            // Data loaded, safe to hide loader
            setLoading(false);
          }, (error) => {
            console.log("Firestore snapshot error:", error.code);
            setLoading(false);
          });
        } catch (e) {
          console.error("Error fetching user profile:", e);
          setLoading(false);
        }
      } else {
        setCoupleId(null);
        setIsSetupCompleted(false);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubUser) unsubUser();
    };
  }, []);

  useEffect(() => {
    if (!coupleId) return;

    console.log("App useEffect: coupleId set to", coupleId);
    console.log("App useEffect: db object is", db);

    if (!db) {
      console.error("Database not initialized!");
      return;
    }

    const habitsRef = collection(db, 'couples', coupleId, 'habits');
    const goalsRef = collection(db, 'couples', coupleId, 'goals');
    const memoriesRef = collection(db, 'couples', coupleId, 'memories');
    const messagesRef = collection(db, 'couples', coupleId, 'messages');
    const coupleRef = doc(db, 'couples', coupleId);

    const unsubHabits = onSnapshot(habitsRef, (snapshot) => {
      // Animate list changes
      const fetchedHabits = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      setHabits(fetchedHabits);
    });

    const unsubGoals = onSnapshot(goalsRef, (snapshot) => {
      const fetchedGoals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward));
      setGoals(fetchedGoals);
    });

    const unsubMemories = onSnapshot(memoriesRef, (snapshot) => {
      const fetchedMemories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMemories(fetchedMemories);
    });

    const unsubMessages = onSnapshot(messagesRef, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate unread count
      try {
        const lastViewedStr = await AsyncStorage.getItem('lastViewedMessagesTime');
        const lastViewed = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

        let count = 0;
        msgs.forEach((msg: any) => {
          if (msg.senderId !== user?.uid) { // Only count partner's messages
            const msgTime = msg.createdAt?.toDate ? msg.createdAt.toDate().getTime() : new Date(msg.createdAt).getTime();
            if (msgTime > lastViewed) {
              count++;
            }
          }
        });
        setUnreadCount(count);
      } catch (e) {
        console.error("Error calculating unread count:", e);
      }
    });

    let unsubPartner: () => void;

    const unsubCouple = onSnapshot(coupleRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCurrency(data?.currency || '¥');

        // Fetch Partner Data from Users Collection
        if (data?.users && user) {
          const partnerId = data.users.find((uid: string) => uid !== user.uid);
          if (partnerId) {
            const partnerDocRef = doc(db, 'users', partnerId);
            if (unsubPartner) unsubPartner(); // Unsubscribe previous if any
            unsubPartner = onSnapshot(partnerDocRef, (pSnap) => {
              if (pSnap.exists()) {
                const pData = pSnap.data();
                setPartnerData({
                  uid: partnerId,
                  name: pData.displayName || pData.name || '',
                  icon: pData.photoURL || pData.icon || '',
                  color: pData.color || 'blue'
                });
              }
            });
          }
        }
      }
    });

    return () => {
      unsubHabits();
      unsubGoals();
      unsubMemories();
      unsubMessages();
      unsubCouple();
      if (unsubPartner) unsubPartner();
    };
  }, [coupleId, user?.uid]);

  // Memories Unread Logic
  const [unreadMemoriesCount, setUnreadMemoriesCount] = useState(0);

  useEffect(() => {
    const checkUnreadMemories = async () => {
      if (memories.length === 0) return;
      try {
        const lastViewedStr = await AsyncStorage.getItem('lastViewedMemoriesTime');
        const lastViewed = lastViewedStr ? new Date(lastViewedStr).getTime() : 0;

        let count = 0;
        memories.forEach(m => {
          const mTime = m.createdAt?.toDate ? m.createdAt.toDate().getTime() : new Date(m.createdAt || m.date).getTime();
          if (mTime > lastViewed) {
            count++;
          }
        });
        setUnreadMemoriesCount(count);
      } catch (e) {
        console.error("Error checking unread memories:", e);
      }
    };
    checkUnreadMemories();
  }, [memories]);

  const handleReadMemories = async () => {
    try {
      await AsyncStorage.setItem('lastViewedMemoriesTime', new Date().toISOString());
      setUnreadMemoriesCount(0);
    } catch (e) {
      console.error("Error setting last viewed memories time:", e);
    }
  };

  const handleToggleHabit = async (habitId: string, targetDate?: string) => {
    if (!coupleId || !user) return;
    const getTodayString = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    const today = targetDate || getTodayString();
    const habitRef = doc(db, 'couples', coupleId, 'habits', habitId);

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Strict Ownership Check
    if (habit.ownerId !== user.uid) {
      Alert.alert(t('home.cannotOperate'), t('home.cannotOperatePartnerHabit'));
      return;
    }

    const currentRecord = habit.history?.[today];
    const isCompleted = typeof currentRecord === 'string' ? currentRecord === 'completed' : currentRecord?.status === 'completed';

    try {
      if (isCompleted) {
        // Ownership Check
        const completedBy = typeof currentRecord !== 'string' ? currentRecord?.by : null;
        if (completedBy && completedBy !== user.uid) {
          Alert.alert(t('home.cannotOperate'), t('home.cannotCancelPartnerCheck'));
          return;
        }

        await updateDoc(habitRef, {
          [`history.${today}`]: deleteField()
        });
      } else {
        await setDoc(habitRef, {
          history: {
            [today]: {
              status: 'completed',
              by: user.uid,
              timestamp: new Date().toISOString()
            }
          }
        }, { merge: true });

        // Send Notification to Partner
        if (partnerData?.uid) {
          const habitName = habit.name;
          const userName = userData?.name || t('home.partner');
          const title = t('home.notificationTitle');
          const body = t('home.notificationBody', { userName, habitName });
          sendPushNotificationToPartner(partnerData.uid, title, body);
        }
      }
    } catch (e) {
      console.error("Error toggling habit:", e);
    }
  };

  const handleReadMessages = async () => {
    try {
      await AsyncStorage.setItem('lastViewedMessagesTime', new Date().toISOString());
      setUnreadCount(0);
    } catch (e) {
      console.error("Error setting last viewed time:", e);
    }
  };

  const totalPoints = habits.reduce((total, habit) => {
    const completedCount = Object.values(habit.history || {}).filter(record => {
      if (typeof record === 'string') return record === 'completed';
      return record.status === 'completed';
    }).length;
    return total + (completedCount * (habit.value || 0));
  }, 0);

  // Auto-Exchange Logic
  useEffect(() => {
    if (!coupleId || goals.length === 0) return;

    const checkAutoExchange = async () => {
      // 1. Calculate Available Points
      const consumedPoints = goals
        .filter(g => g.status === 'redeemed' || g.status === 'ticket')
        .reduce((sum, g) => sum + g.cost, 0);

      const availablePoints = totalPoints - consumedPoints;

      // 2. Find Next Active Goal
      const activeGoals = goals
        .filter(g => g.status === 'active' || !g.status)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (activeGoals.length === 0) return;

      const nextGoal = activeGoals[0];

      // 3. Check Condition
      if (availablePoints >= nextGoal.cost) {
        try {
          // Perform Exchange
          const goalRef = doc(db, 'couples', coupleId, 'goals', nextGoal.id);
          await updateDoc(goalRef, {
            status: 'ticket',
            exchangedAt: new Date().toISOString(),
            availableAt: new Date().toISOString() // Or calculate based on lock logic if needed, but usually instant
          });

          Alert.alert(t('home.goalAchieved'), t('home.goalAchievedMsg', { name: nextGoal.name }));
        } catch (e) {
          console.error("Auto-exchange error:", e);
        }
      }
    };

    checkAutoExchange();
  }, [totalPoints, goals, coupleId]);

  return (
    <AuthContext.Provider value={{
      user,
      coupleId,
      isSetupCompleted,
      setIsSetupCompleted
    }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <NavigationContainer>
          <Stack.Navigator
            key={isSetupCompleted ? 'main-flow' : 'onboarding-flow'}
            screenOptions={{ headerShown: false }}
          >
            {loading ? (
              <Stack.Screen name="Loading" component={LoadingScreen} />
            ) : !user ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : !coupleId ? (
              <Stack.Screen name="Pairing" component={PairingScreen} />
            ) : !isSetupCompleted ? (
              <>
                <Stack.Screen
                  name="SetupHabit"
                  component={SetupHabitScreen}
                  initialParams={{ coupleId }}
                />
                <Stack.Screen
                  name="OnboardingSetupReward"
                  component={SetupRewardScreen}
                  initialParams={{ coupleId }}
                />
              </>
            ) : (
              <>
                <Stack.Screen name="Main">
                  {(props) => (
                    <TabNavigator
                      {...props}
                      habits={habits}
                      goals={goals}
                      totalPoints={totalPoints}
                      currency={currency}
                      onToggleHabit={handleToggleHabit}
                      userUid={user.uid}
                      coupleId={coupleId}
                      memories={memories}
                      unreadCount={unreadCount}
                      onReadMessages={handleReadMessages}
                      unreadMemoriesCount={unreadMemoriesCount}
                      onReadMemories={handleReadMemories}
                      userData={userData}
                      partnerData={partnerData}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen
                  name="AddHabit"
                  component={AddHabitScreen}
                  initialParams={{ coupleId }}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="AddReward"
                  component={AddRewardScreen}
                  initialParams={{ coupleId }}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="Redeem"
                  component={RedeemScreen}
                  initialParams={{ coupleId }}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="SetupReward"
                  component={SetupRewardScreen}
                  initialParams={{ coupleId }}
                  options={{ presentation: 'modal' }}
                />
                <Stack.Screen
                  name="Subscription"
                  component={SubscriptionScreen}
                  options={{ presentation: 'modal' }}
                />
              </>
            )}

            {/* Global Screens */}
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />

          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </AuthContext.Provider>
  );
};

export default App;
