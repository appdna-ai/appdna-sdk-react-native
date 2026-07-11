# Deprecation Notice — AppDNA React Native SDK, MIT-licensed versions (≤ v1.0.1)

> **Status: closed. This is a historical record.**
> The migration window described below ran to **15 May 2026** and has ended. If you are on a current
> version there is nothing here for you to do — see [Current versions](#current-versions).

## What happened

Versions **v1.0.1 and earlier** of the AppDNA React Native SDK were distributed under the MIT
License. **v1.0.2** (5 May 2026) was a **license-only** cutover release — API-identical to v1.0.1,
no code changes — after which the SDK is distributed under AppDNA's proprietary license (see
[LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md)).

Server-side support for **v1.0.1 and earlier ended on 15 May 2026**. Those versions can no longer
connect to AppDNA servers.

## Current versions

The supported package is published to npm under the `@appdna-ai` scope:

```bash
npm install @appdna-ai/react-native-sdk
# then, for iOS:
cd ios && pod install
```

The React Native SDK requires the **New Architecture** (TurboModules + Fabric). See the
[installation guide](https://docs.appdna.ai/sdks/react-native/installation).

## Rights to the MIT-licensed versions (v1.0.1 and earlier)

If you obtained v1.0.1 or earlier under the MIT License before v1.0.2 shipped, **you retain MIT
rights to those specific prior versions**. The MIT license lets you keep running that code; it does
not oblige AppDNA to keep its servers answering it, and since 15 May 2026 they do not. Those versions
receive no support, security fixes, or store-compliance updates.

## Questions

- Migration or upgrade help: support@appdna.ai
- Licensing: legal@appdna.ai
- Account / billing: billing@appdna.ai

---

© 2026 AppDNA AI, Inc.
