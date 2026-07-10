import Foundation
import UIKit
import React
import AppDNASDK

/**
 * SPEC-070-B P2 — the Swift half of the iOS TurboModule.
 *
 * ## Why this is not the TurboModule itself
 *
 * A pure-Swift TurboModule is impossible. Codegen emits a C++ `NativeAppdnaModuleSpecJSI` plus an
 * ObjC `@protocol NativeAppdnaModuleSpec`, and registration returns a
 * `std::shared_ptr<facebook::react::TurboModule>` over C++/JSI/folly headers Swift cannot import.
 * Worse, the `emitOnX:` methods live on `NativeAppdnaModuleSpecBase`, an ObjC class with a C++
 * `EventEmitterCallback` ivar — Swift cannot subclass it either.
 *
 * So `AppdnaModule.mm` is the TurboModule, and it forwards every method here. This class is plain
 * ObjC-visible Swift: no JSI, no C++, no React-internal types beyond the promise blocks.
 *
 * Events go out through [eventSink] rather than through `emitOnX:` directly, for the same reason.
 */
@objc(AppdnaModuleImpl)
public final class AppdnaModuleImpl: NSObject {

    /// SPEC-070-B §7 — pinned literal, underscore not hyphen. Injected unconditionally in
    /// `parseOptions`, never read from the host's options: a host must not be able to set, spoof or
    /// omit its own attribution. `event-envelope.schema.ts` is `.catch('native')`, so a wrong tag
    /// does not error, is not logged, and is not metered — it just quietly lies in BigQuery.
    private static let frameworkTag = "react_native"

    /// Set by the ObjC++ adapter. Weak: the adapter owns this object.
    @objc public weak var eventSink: (any AppdnaEventSink)?

    /// PN row 3 — the token for the entitlements handler, so `invalidate()` can detach it. Before
    /// this, a reload left N handlers on the process-global singleton and delivered N-fold.
    private var entitlementObserverToken: UUID?

    /**
     * P3 — the eight veto hooks and every observe callback are routed by these.
     *
     * The SDK's delegate properties are `weak`, so the forwarders must be OWNED here. A local that
     * goes out of scope at the end of `configure` deallocates immediately and the delegate silently
     * becomes nil — a failure mode that looks exactly like "the events were never wired".
     */
    private var forwarders: [NSObject] = []
    private var invoker: AppdnaVetoInvoker?

    private func emit(_ name: String, _ payload: [String: Any]) {
        // The ObjC `AppdnaEventSink` protocol's `payload:` is `NSDictionary *`, which imports into
        // Swift as `[AnyHashable: Any]`. A `[String: Any]` bridges to that automatically — casting to
        // `NSDictionary` produces the wrong Swift type and does not convert.
        eventSink?.emitEventNamed(name, payload: payload)
    }

    // MARK: - Lifecycle / core

    @objc(configure:env:options:resolve:reject:)
    public func configure(
        _ apiKey: String,
        env: String,
        options: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        // The enum is `production | sandbox` (Configuration.swift:4). `.staging` named a case that
        // has never existed; the old shim could not compile.
        let environment: Environment = env == "sandbox" ? .sandbox : .production
        let parsed = parseOptions(options as? [String: Any])
        AppDNA.configure(apiKey: apiKey, environment: environment, options: parsed)

        AppDNA.onWebEntitlementChanged { [weak self] entitlement in
            self?.emit("onWebEntitlementChanged", ["entitlement": entitlement?.toMap() as Any])
        }
        registerDelegates(vetoTimeout: parsed.vetoTimeout)
        resolve(nil)
    }

    @objc(identify:traits:resolve:reject:)
    public func identify(
        _ userId: String,
        traits: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        AppDNA.identify(userId: userId, traits: traits as? [String: Any])
        resolve(nil)
    }

    @objc(reset:reject:)
    public func reset(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.reset()
        resolve(nil)
    }

    /// W17 — fire-and-forget. Native enqueues, so a Promise per event would allocate for nothing.
    @objc(track:properties:)
    public func track(_ event: String, properties: NSDictionary?) {
        AppDNA.track(event: event, properties: properties as? [String: Any])
    }

    @objc(flush:reject:)
    public func flush(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.flush()
        resolve(nil)
    }

    @objc(setConsent:resolve:reject:)
    public func setConsent(_ analytics: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setConsent(analytics: analytics)
        resolve(nil)
    }

    @objc(isConsentGranted:reject:)
    public func isConsentGranted(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.isConsentGranted())
    }

    @objc(setLogLevel:)
    public func setLogLevel(_ level: String) {
        let mapped: LogLevel
        switch level {
        case "none": mapped = .none
        case "error": mapped = .error
        case "warning": mapped = .warning
        case "info": mapped = .info
        case "debug": mapped = .debug
        default: mapped = .warning
        }
        AppDNA.setLogLevel(mapped)
    }

    @objc(shutdown:reject:)
    public func shutdown(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        // `AppDNA.shutdown()` exists and flushes the queue first. Both wrappers used to no-op it.
        AppDNA.shutdown()
        resolve(nil)
    }

    @objc(getSdkVersion:reject:)
    public func getSdkVersion(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.sdkVersion)
    }

    @objc(diagnose:reject:)
    public func diagnose(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.diagnose())
    }

    /// D-k — the init-degraded seam ships with a consumer rather than as dead native API.
    @objc(getLastInitError:reject:)
    public func getLastInitError(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let err = AppDNA.lastInitError else { return resolve("null") }
        resolve(AppdnaJSON.encode([
            "type": String(describing: type(of: err)),
            "message": err.localizedDescription,
        ]))
    }

    /// D-h / AC-22 — populates `context.screen` on every subsequent event.
    @objc(notifyScreenAppeared:)
    public func notifyScreenAppeared(_ screenName: String) {
        AppDNA.notifyScreenAppeared(screenName)
    }

    @objc(onReady:reject:)
    public func onReady(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.onReady { resolve(nil) }
    }

    // MARK: - Remote config

    /// E2 — a config value of unknown shape crosses as a JSON string, parsed in the facade.
    @objc(getRemoteConfig:resolve:reject:)
    public func getRemoteConfig(_ key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.getRemoteConfig(key: key)))
    }

    @objc(getAllRemoteConfig:reject:)
    public func getAllRemoteConfig(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.remoteConfig.getAll()))
    }

    @objc(refreshConfig:reject:)
    public func refreshConfig(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.remoteConfig.refresh()
        resolve(nil)
    }

    // MARK: - Feature flags

    @objc(isFeatureEnabled:resolve:reject:)
    public func isFeatureEnabled(_ flag: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.isFeatureEnabled(flag: flag))
    }

    @objc(getFeatureVariant:resolve:reject:)
    public func getFeatureVariant(_ flag: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.features.getVariant(flag)))
    }

    // MARK: - Experiments

    @objc(getExperimentVariant:resolve:reject:)
    public func getExperimentVariant(_ experimentId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.getExperimentVariant(experimentId: experimentId)))
    }

    @objc(isInVariant:variantId:resolve:reject:)
    public func isInVariant(_ experimentId: String, variantId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.isInVariant(experimentId: experimentId, variantId: variantId))
    }

    @objc(getExperimentConfig:key:resolve:reject:)
    public func getExperimentConfig(_ experimentId: String, key: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.getExperimentConfig(experimentId: experimentId, key: key)))
    }

    /// Native returns `(experimentId, variant)` tuples; the wire shape is `Object[]`.
    @objc(getExperimentExposures:reject:)
    public func getExperimentExposures(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let exposures = AppDNA.experiments.getExposures().map {
            ["experimentId": $0.experimentId, "variant": $0.variant]
        }
        resolve(exposures)
    }

    // MARK: - Onboarding / paywall / surveys / messages

    @objc(presentOnboarding:context:resolve:reject:)
    public func presentOnboarding(
        _ flowId: String,
        context: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            // Resolves false when no view controller is available. Report it rather than discarding
            // it — a silent no-op is how "the SDK does nothing" gets filed as a bug.
            resolve(AppDNA.presentOnboarding(flowId: flowId))
        }
    }

    @objc(presentPaywall:context:resolve:reject:)
    public func presentPaywall(
        _ paywallId: String,
        context: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let top = AppDNA.topViewController() else {
                return reject("NO_VIEW_CONTROLLER", "presentPaywall requires a visible view controller", nil)
            }
            AppDNA.presentPaywall(id: paywallId, from: top, context: self.parsePaywallContext(context as? [String: Any]))
            resolve(nil)
        }
    }

    /// N17 — an overload on iOS, a distinct name on Android. The wrapper exposes one name.
    @objc(presentPaywallByPlacement:context:resolve:reject:)
    public func presentPaywallByPlacement(
        _ placement: String,
        context: NSDictionary?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let top = AppDNA.topViewController() else {
                return reject("NO_VIEW_CONTROLLER", "presentPaywallByPlacement requires a visible view controller", nil)
            }
            AppDNA.presentPaywall(placement: placement, from: top, context: self.parsePaywallContext(context as? [String: Any]))
            resolve(nil)
        }
    }

    @objc(presentSurvey:resolve:reject:)
    public func presentSurvey(_ surveyId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.surveys.present(surveyId)
        resolve(nil)
    }

    @objc(suppressMessages:)
    public func suppressMessages(_ suppress: Bool) {
        AppDNA.inAppMessages.suppressDisplay(suppress)
    }

    // MARK: - Billing

    /// - Parameter offerToken: a Google Play concept. StoreKit has no equivalent, so iOS ignores it
    ///   and says so rather than silently dropping a parameter the host believes is honored.
    @objc(purchase:offerToken:resolve:reject:)
    public func purchase(
        _ productId: String,
        offerToken: NSString?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        if offerToken != nil {
            NSLog("[AppDNA] offerToken is a Google Play Billing concept and is ignored on iOS.")
        }
        Task {
            do {
                let result = try await AppDNA.billing.purchase(productId)
                resolve(AppdnaMappers.map(result))
            } catch {
                reject("PURCHASE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc(restorePurchases:reject:)
    public func restorePurchases(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                // `[String]` — restored product ids, NOT entitlements.
                let productIds: [String] = try await AppDNA.billing.restorePurchases()
                resolve(productIds)
            } catch {
                reject("RESTORE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc(getProducts:resolve:reject:)
    public func getProducts(_ productIds: NSArray, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        let ids = productIds.compactMap { $0 as? String }
        Task {
            do {
                let products = try await AppDNA.billing.getProducts(ids)
                resolve(products.map(AppdnaMappers.map))
            } catch {
                reject("PRODUCTS_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc(hasActiveSubscription:reject:)
    public func hasActiveSubscription(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task { resolve(await AppDNA.billing.hasActiveSubscription()) }
    }

    @objc(getEntitlements:reject:)
    public func getEntitlements(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task { resolve(await AppDNA.billing.getEntitlements().map(AppdnaMappers.map)) }
    }

    @objc(startEntitlementObserver:reject:)
    public func startEntitlementObserver(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        entitlementObserverToken = AppDNA.billing.onEntitlementsChanged { [weak self] entitlements in
            self?.emit("onEntitlementsChanged", ["entitlements": entitlements.map(AppdnaMappers.map)])
        }
        resolve(nil)
    }

    // MARK: - Push

    @objc(requestPushPermission:reject:)
    public func requestPushPermission(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        Task { resolve(await AppDNA.pushModule.requestPermission()) }
    }

    @objc(getPushToken:reject:)
    public func getPushToken(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.pushModule.getToken()))
    }

    /// N9 — a hex-encoded APNs `Data` here; the FCM string on Android. One signature, two meanings.
    @objc(setPushToken:resolve:reject:)
    public func setPushToken(_ token: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let data = Self.hexStringToData(token) else {
            return reject("BAD_TOKEN", "setPushToken expects a hex-encoded APNs device token on iOS", nil)
        }
        AppDNA.setPushToken(data)
        resolve(nil)
    }

    @objc(setPushPermission:resolve:reject:)
    public func setPushPermission(_ granted: Bool, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setPushPermission(granted: granted)
        resolve(nil)
    }

    @objc(trackPushDelivered:resolve:reject:)
    public func trackPushDelivered(_ pushId: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.trackPushDelivered(pushId: pushId)
        resolve(nil)
    }

    @objc(trackPushTapped:action:resolve:reject:)
    public func trackPushTapped(_ pushId: String, action: NSString?, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.trackPushTapped(pushId: pushId, action: action as String?)
        resolve(nil)
    }

    // MARK: - Deep links / web entitlements

    /// N15 — a `URL` here, a `String` on Android.
    @objc(handleDeepLink:resolve:reject:)
    public func handleDeepLink(_ url: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        guard let parsed = URL(string: url) else {
            return reject("BAD_URL", "handleDeepLink received a string that is not a URL", nil)
        }
        AppDNA.deepLinks.handleURL(parsed)
        resolve(nil)
    }

    @objc(checkDeferredDeepLink:reject:)
    public func checkDeferredDeepLink(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.checkDeferredDeepLink { deepLink in
            resolve(AppdnaJSON.encode(deepLink?.toMap()))
        }
    }

    @objc(getWebEntitlement:reject:)
    public func getWebEntitlement(resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppdnaJSON.encode(AppDNA.webEntitlement?.toMap()))
    }

    // MARK: - Host-veto reply channel (P3 routes the hooks; this is the seam)

    @objc(respondToHostCallback:resultJson:)
    public func respondToHostCallback(_ callbackId: String, resultJson: String) {
        AppdnaHostCallbacks.shared.respond(callbackId: callbackId, resultJson: resultJson)
    }

    // MARK: - Delegates (P3)

    /**
     * Attach every forwarder to the native SDK.
     *
     * All of them, unconditionally, at `configure` — not lazily when JS subscribes. A TurboModule
     * emitter property gives native no subscribe signal, so there is nothing to be lazy about, and
     * emitting into zero listeners costs a dictionary that is immediately dropped.
     *
     * The three synchronous vetoes (`shouldShowMessage`, `shouldOpen`, `onScreenAction`) cannot await
     * a bridge round trip, so each goes on the SDK's parallel async seam, which `MessageManager` /
     * `DeepLinksModule` / `ScreenManager` consult in addition to the sync delegate method.
     *
     * - Parameter vetoTimeout: from `AppDNAOptions.vetoTimeout` — never a literal, per E7.
     */
    private func registerDelegates(vetoTimeout: TimeInterval) {
        let emit: AppdnaEmit = { [weak self] name, payload in self?.emit(name, payload) }
        let veto = AppdnaVetoInvoker(timeout: vetoTimeout) { [weak self] payload in
            self?.emit("onHostCallback", payload)
        }
        invoker = veto

        let onboarding = OnboardingForwarder(emit: emit, invoker: veto)
        let paywall = PaywallForwarder(emit: emit, invoker: veto)
        let survey = SurveyForwarder(emit: emit)
        let messages = InAppMessageForwarder(emit: emit)
        let push = PushForwarder(emit: emit)
        let billing = BillingForwarder(emit: emit)
        let deepLinks = DeepLinkForwarder(emit: emit)
        let initDelegate = InitForwarder(emit: emit)
        let lifecycle = LifecycleForwarder(emit: emit)
        forwarders = [onboarding, paywall, survey, messages, push, billing, deepLinks, initDelegate, lifecycle]

        AppDNA.onboarding.setDelegate(onboarding)
        AppDNA.paywall.setDelegate(paywall)
        AppDNA.surveys.setDelegate(survey)
        AppDNA.inAppMessages.setDelegate(messages)
        AppDNA.pushModule.setDelegate(push)
        AppDNA.billing.setDelegate(billing)
        AppDNA.deepLinks.setDelegate(deepLinks)
        AppDNA.initDelegate = initDelegate
        AppDNA.lifecycleDelegate = lifecycle

        // 🔴 `shouldShowMessage` defaults to ALLOW on timeout; `onPromoCodeSubmit` to REJECT. A
        // uniform default here is how a paywall silently starts accepting unvalidated promo codes.
        AppDNA.inAppMessages.asyncShouldShowMessage = { messageId in
            await veto.invoke("shouldShowMessage", ["messageId": messageId]) as? Bool ?? true
        }
        AppDNA.deepLinks.asyncShouldOpen = { url, params in
            await veto.invoke("shouldOpen", ["url": url.absoluteString, "params": params]) as? Bool ?? true
        }
        AppDNA.asyncOnScreenAction = { screenId, action in
            await veto.invoke(
                "onScreenAction",
                ["screenId": screenId, "action": AppdnaMappers.map(action)]
            ) as? Bool ?? true
        }
    }

    // MARK: - Teardown (E6 / E11)

    /// Called from the adapter's `invalidate`. Every listener registered here lives on the
    /// process-global `AppDNA` singleton and captures this bridge-scoped object; a reload would
    /// otherwise leave them attached and deliver each event N-fold.
    @objc public func invalidate() {
        if let token = entitlementObserverToken {
            AppDNA.billing.removeEntitlementsChangedHandler(token)
            entitlementObserverToken = nil
        }

        // Every forwarder captures this bridge-scoped object. Leaving them attached to the
        // process-global singleton across a reload is what delivers each event N-fold.
        AppDNA.onboarding.setDelegate(nil)
        AppDNA.paywall.setDelegate(nil)
        AppDNA.surveys.setDelegate(nil)
        AppDNA.inAppMessages.setDelegate(nil)
        AppDNA.pushModule.setDelegate(nil)
        AppDNA.billing.setDelegate(nil)
        AppDNA.deepLinks.setDelegate(nil)
        AppDNA.initDelegate = nil
        AppDNA.lifecycleDelegate = nil
        AppDNA.inAppMessages.asyncShouldShowMessage = nil
        AppDNA.deepLinks.asyncShouldOpen = nil
        AppDNA.asyncOnScreenAction = nil
        forwarders.removeAll()
        invoker = nil
        // A JS side that no longer exists will never answer a pending veto, and native awaits forever.
        AppdnaHostCallbacks.shared.invalidateAll()
        eventSink = nil
    }

    // MARK: - Helpers

    /// ⚠ `internal`, not `private`: `AppdnaParseOptionsTests` reaches it through `@testable import`
    /// (AC-11). A jest test cannot see a native `?? 3600`, and neither can a Dart one.
    internal func parseOptions(_ dict: [String: Any]?) -> AppDNAOptions {
        let values = dict ?? [:]
        let defaults = AppDNAOptions()

        let logLevel: LogLevel
        switch values["logLevel"] as? String {
        case "none": logLevel = .none
        case "error": logLevel = .error
        case "warning": logLevel = .warning
        case "info": logLevel = .info
        case "debug": logLevel = .debug
        default: logLevel = defaults.logLevel
        }

        // `billingProvider` crosses as a bare string, or as a tagged map for the associated-value
        // adapty case. A bare "adapty" carries no apiKey, so it is refused rather than keyless.
        let billingProvider: BillingProvider
        if let map = values["billingProvider"] as? [String: Any],
           map["type"] as? String == "adapty",
           let apiKey = map["apiKey"] as? String, !apiKey.isEmpty {
            billingProvider = .adapty(apiKey: apiKey)
        } else {
            switch values["billingProvider"] as? String {
            case "revenueCat": billingProvider = .revenueCat
            case "storeKit2": billingProvider = .storeKit2
            case "none": billingProvider = .none
            default: billingProvider = defaults.billingProvider
            }
        }

        return AppDNAOptions(
            // E7: never a literal. `?? 300` is how the wrappers drifted 12× off the native TTL.
            flushInterval: values["flushInterval"] as? TimeInterval ?? defaults.flushInterval,
            batchSize: values["batchSize"] as? Int ?? defaults.batchSize,
            configTTL: values["configTTL"] as? TimeInterval ?? defaults.configTTL,
            logLevel: logLevel,
            billingProvider: billingProvider,
            // §7 rule 1: injected unconditionally, NOT read from `values`. A host cannot spoof it.
            framework: Self.frameworkTag,
            frameworkVersion: values["frameworkVersion"] as? String,
            requireConsent: values["requireConsent"] as? Bool ?? defaults.requireConsent,
            vetoTimeout: values["vetoTimeout"] as? TimeInterval ?? defaults.vetoTimeout
        )
    }

    /// D-s — all four fields. `customData` reaches the `paywall_view` properties bag natively.
    private func parsePaywallContext(_ dict: [String: Any]?) -> PaywallContext? {
        guard let dict, let placement = dict["placement"] as? String else { return nil }
        return PaywallContext(
            placement: placement,
            experiment: dict["experiment"] as? String,
            variant: dict["variant"] as? String,
            customData: dict["customData"] as? [String: Any]
        )
    }

    private static func hexStringToData(_ hex: String) -> Data? {
        guard hex.count % 2 == 0, !hex.isEmpty else { return nil }
        var data = Data(capacity: hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
            data.append(byte)
            index = next
        }
        return data
    }
}
