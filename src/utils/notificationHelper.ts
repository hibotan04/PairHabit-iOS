import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID // Project ID from app.json
      })).data;
    } catch (e) {
      console.error('Error fetching push token:', e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushTokenToFirestore(userId: string, token: string) {
  if (!userId || !token) return;
  const db = getFirestore();
  const userRef = doc(db, 'users', userId);
  try {
    // Merge true to avoid overwriting other user data
    await setDoc(userRef, { pushToken: token }, { merge: true });
    console.log('Push token saved to Firestore');
  } catch (e) {
    console.error('Error saving push token to Firestore:', e);
  }
}

export async function sendPushNotificationToPartner(partnerId: string, title: string, body: string) {
  if (!partnerId) return;
  const db = getFirestore();

  try {
    const partnerSnap = await getDoc(doc(db, 'users', partnerId));
    if (partnerSnap.exists()) {
      const partnerData = partnerSnap.data();
      const pushToken = partnerData?.pushToken;

      if (partnerData?.notificationsEnabled === false) {
        console.log('Partner has notifications disabled');
        return;
      }

      if (pushToken) {
        await sendPushNotification(pushToken, title, body);
      } else {
        console.log('Partner has no push token');
      }
    }
  } catch (e) {
    console.error('Error sending notification to partner:', e);
  }
}

export async function scheduleReminderNotification(hour: number, minute: number, title: string, body: string) {
  await cancelReminderNotification();
  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: 'default' },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
      hour,
      minute,
      repeats: true,
    },
  });
}

export async function cancelReminderNotification() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.map(n => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// Internal function to call Expo Push API
export async function sendPushNotification(expoPushToken: string, title: string, body: string) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: { someData: 'goes here' },
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log('Notification sent successfully');
  } catch (e) {
    console.error('Error calling Expo Push API:', e);
  }
}
