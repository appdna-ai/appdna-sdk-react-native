# AppDNA SDK for React Native

The official React Native SDK for [AppDNA](https://appdna.ai) — the growth console for subscription apps.

> ⚠️ **Proprietary software.** A Commercial Agreement with AppDNA AI, Inc. is required to use this SDK. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md).
>
> **Migrating from MIT-licensed v1.0.1 or earlier?** See [DEPRECATION_NOTICE.md](./DEPRECATION_NOTICE.md). MIT versions stop receiving server support after **15 May 2026**.

## What it does

AppDNA gives you a single drop-in SDK for the growth surfaces every subscription app needs, on both iOS and Android from one TypeScript codebase:

- **Analytics & events** — track user behavior with batched, offline-resilient delivery.
- **Experiments & feature flags** — server-driven A/B tests with deterministic variant assignment.
- **Paywalls** — render console-designed paywall layouts with native StoreKit 2 / Google Play Billing.
- **Onboarding flows** — multi-step onboarding with form inputs, async hooks, conditional branching, and rich media.
- **Surveys & feedback** — NPS, CSAT, free text, multi-choice with scheduling and frequency caps.
- **In-app messages** — modal, banner, fullscreen messages with audience targeting.
- **Push notifications** — rich content, action buttons, deep links, and delivery analytics.
- **Web entitlements & deep links** — server-validated entitlements and deferred deep linking.

## Requirements

- React Native 0.72+
- React 18.0+
- iOS 16.0+ (when targeting iOS)
- Android API 24+ (when targeting Android)

## Installation

```bash
npm install github:appdna-ai/appdna-sdk-react-native#v1.0.3
# or
yarn add github:appdna-ai/appdna-sdk-react-native#v1.0.3
```

For iOS, also run:

```bash
cd ios && pod install
```

## Quick start

```typescript
import { AppDNA } from '@appdna-ai/react-native-sdk';

await AppDNA.configure('YOUR_API_KEY');
```

Track an event:

```typescript
await AppDNA.track('subscription_viewed', { plan_id: 'premium_monthly' });
```

Identify a user (after sign-in):

```typescript
await AppDNA.identify('user-123', { plan: 'premium' });
```

Present a paywall:

```typescript
const result = await AppDNA.presentPaywall({ id: 'default' });
switch (result.status) {
  case 'purchased':
    console.log('Purchased');
    break;
  case 'dismissed':
    console.log('Dismissed');
    break;
  case 'failed':
    console.error('Failed:', result.error);
    break;
}
```

## Documentation

Full integration guide, configuration reference, and API docs at **[docs.appdna.ai/sdks/react-native](https://docs.appdna.ai/sdks/react-native/installation)**.

## Support

- Technical questions: [support@appdna.ai](mailto:support@appdna.ai)
- Sales / commercial: [sales@appdna.ai](mailto:sales@appdna.ai)
- Licensing: [legal@appdna.ai](mailto:legal@appdna.ai)

## License

⚠️ **The AppDNA SDK is proprietary software, not open source.** This repository is publicly visible for marketing, evaluation, and reference purposes only.

**You may NOT** download, install, run, modify, or use the SDK without a Commercial Agreement with AppDNA AI, Inc. See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md) for the full terms.

**You MAY** view the source on GitHub and read the documentation at <https://docs.appdna.ai> for evaluation purposes.

To use the SDK in your application, sign up at <https://appdna.ai> (self-serve) or contact <sales@appdna.ai> (enterprise).

**Existing customers**: your Terms of Service or Statement of Work governs your use of the SDK.

**Versions before v1.0.2** were distributed under the MIT License — see [DEPRECATION_NOTICE.md](./DEPRECATION_NOTICE.md) for the migration timeline (deadline: **15 May 2026**).

---

© 2026 AppDNA AI, Inc. All rights reserved. "AppDNA" and the AppDNA logo are trademarks of AppDNA AI, Inc.
