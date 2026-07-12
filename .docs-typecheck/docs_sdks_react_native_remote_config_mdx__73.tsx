import React from 'react';
import { AppDNA } from '@appdna-ai/react-native-sdk';

export const TypedRemoteConfig = {
  async getString(key: string, fallback = ''): Promise<string> {
    const v = await AppDNA.remoteConfig.get(key);
    return typeof v === 'string' ? v : fallback;
  },

  async getInt(key: string, fallback = 0): Promise<number> {
    const v = await AppDNA.remoteConfig.get(key);
    if (typeof v === 'number') return Math.trunc(v);
    return fallback;
  },

  async getDouble(key: string, fallback = 0.0): Promise<number> {
    const v = await AppDNA.remoteConfig.get(key);
    return typeof v === 'number' ? v : fallback;
  },

  async getBool(key: string, fallback = false): Promise<boolean> {
    const v = await AppDNA.remoteConfig.get(key);
    return typeof v === 'boolean' ? v : fallback;
  },

  async getJson(key: string): Promise<Record<string, unknown> | null> {
    const v = await AppDNA.remoteConfig.get(key);
    return typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : null;
  },
};

export {};
