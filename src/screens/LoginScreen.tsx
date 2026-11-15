import React, { useState } from 'react';
import { View, Text, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInAnonymously, GoogleAuthProvider, signInWithCredential, createUserWithEmailAndPassword, signInWithEmailAndPassword, OAuthProvider } from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import { TextInput, TouchableOpacity } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SHA256 } from 'crypto-js';
import { generateAppleNonce } from '../utils/appleNonce';
import { useTranslation } from 'react-i18next';

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // From Firebase Console
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, // From Google Cloud Console
});

import { seedDemoData } from '../utils/demoData';

export default function LoginScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      // Seed data if this is a fresh sign-in (or always check/update for demo purposes)
      // Note: We run this in background or await it depending on ensuring UX smoothness.
      // Awaiting it ensures data is ready when Home screen loads.
      if (user) {
        await seedDemoData(user.uid);
      }

    } catch (error: any) {
      console.error("Guest login error:", error);
      Alert.alert(t('common.error'), t('login.guestError', { message: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('login.emailPasswordRequired'));
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let msg = t('login.authFailed');
      if (error.code === 'auth/email-already-in-use') msg = t('login.emailInUse');
      if (error.code === 'auth/invalid-email') msg = t('login.invalidEmail');
      if (error.code === 'auth/weak-password') msg = t('login.weakPassword');
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') msg = t('login.wrongCredentials');
      Alert.alert(t('common.error'), msg);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleButtonPress = async () => {
    setLoading(true);
    try {
      // Check if your device supports Google Play
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Get the users ID token
      const signInResult = await GoogleSignin.signIn();

      // Try the new style of google-sign in result, from v13+ of that module
      // idToken is now in signInResult.data?.idToken
      let idToken = (signInResult as any).idToken;
      if (!idToken && signInResult.data) {
        idToken = signInResult.data.idToken;
      }

      if (!idToken) {
        throw new Error('No ID token found');
      }

      // Create a Google credential with the token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign-in the user with the credential
      await signInWithCredential(auth, googleCredential);
    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED') {
        // user cancelled the login flow
      } else if (error.code === 'IN_PROGRESS') {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        // play services not available or outdated
        Alert.alert(t('common.error'), t('login.playServicesError'));
      } else {
        // some other error happened
        Alert.alert(t('common.error'), error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onAppleButtonPress = async () => {
    setLoading(true);
    try {
      const rawNonce = generateAppleNonce();
      const credential = await AppleAuthentication.signInAsync({
        nonce: SHA256(rawNonce).toString(),
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;
      if (!identityToken) {
        throw new Error("Apple Sign-In failed - no identity token returned");
      }

      const provider = new OAuthProvider('apple.com');
      const firebaseCredential = provider.credential({
        idToken: identityToken,
        rawNonce,
      });

      await signInWithCredential(auth, firebaseCredential);
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User canceled
      } else {
        Alert.alert(t('common.error'), t('login.appleLoginError', { message: e.message }));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bg-screen">
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}
        enableOnAndroid={true}
        extraScrollHeight={20}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../assets/7.png')}
          style={{ width: 100, height: 100, borderRadius: 20, marginBottom: 20 }}
        />
        <Text
          className="text-2xl font-bold mb-1 text-stone-800"

        >Habit Pot</Text>
        <Text className="text-stone-500 mb-8 font-medium">{t('login.tagline')}</Text>



        {loading ? (
          <ActivityIndicator size="large" color="#d97706" className="my-4" />
        ) : (
          <View className="w-full items-center">
            <GoogleSigninButton
              size={GoogleSigninButton.Size.Wide}
              color={GoogleSigninButton.Color.Dark}
              onPress={onGoogleButtonPress}
              style={{ width: 240, height: 48, marginTop: 20 }}
            />

            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={24} // Matching Google button rounded look roughly or theme
              style={{ width: 240, height: 48, marginTop: 12 }}
              onPress={onAppleButtonPress}
            />

            <View className="w-full max-w-xs mt-8">
              <View className="flex-row items-center mb-4">
                <View className="flex-1 h-[1px] bg-stone-200" />
                <Text className="mx-4 text-stone-400 text-xs">{isSignUp ? t('login.orEmailSignup') : t('login.orEmailLogin')}</Text>
                <View className="flex-1 h-[1px] bg-stone-200" />
              </View>

              <TextInput
                className="w-full bg-white p-4 rounded-xl border border-stone-200 mb-3"
                placeholder={t('login.emailPlaceholder')}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                className="w-full bg-white p-4 rounded-xl border border-stone-200 mb-4"
                placeholder={t('login.passwordPlaceholder')}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                onPress={handleEmailAuth}
                className="w-full bg-[#8f7161] p-4 rounded-xl items-center mb-4"
              >
                <Text className="text-white font-bold">{isSignUp ? t('login.signupButton') : t('login.loginButton')}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                <Text className="text-center text-stone-500 text-xs">
                  {isSignUp ? t('login.switchToLogin') : t('login.switchToSignup')}
                  <Text className="text-[#8f7161] font-bold"> {isSignUp ? t('login.loginLink') : t('login.signupLink')}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Guest Login / Demo Entry */}
            <TouchableOpacity onPress={handleGuestLogin} className="mt-6 p-4">
              <Text className="text-stone-400 text-sm underline">{t('login.guestLogin')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
