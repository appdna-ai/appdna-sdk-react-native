
import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { AppDNA } from '@appdna-ai/react-native-sdk';

export function HomeScreen() {
  const [title, setTitle] = useState('Welcome');
  const [showBanner, setShowBanner] = useState(false);
  const [bannerText, setBannerText] = useState('');

  useEffect(() => {
    loadConfig();
    const unsubscribe = AppDNA.remoteConfig.onChanged(loadConfig);
    return unsubscribe;
  }, []);

  async function loadConfig() {
    const t = ((await AppDNA.remoteConfig.get('home_title')) as string | undefined) ?? 'Welcome';
    const sb = ((await AppDNA.remoteConfig.get('show_promo_banner')) as boolean | undefined) ?? false;
    const bt = ((await AppDNA.remoteConfig.get('promo_banner_text')) as string | undefined) ?? '';

    setTitle(t);
    setShowBanner(sb);
    setBannerText(bt);
  }

  return (
    <View>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{title}</Text>
      {showBanner ? <Text>{bannerText}</Text> : null}
      {/* Rest of the home screen */}
    </View>
  );
}

export {};
