import Foundation
import AppDNASDK

/**
 * SPEC-070-B P3 — the native→JS delegate forwarders (iOS).
 *
 * Every one of the ~30 SDK callbacks used to have a JS listener and no native emitter. The facade
 * subscribed; nothing ever fired. These classes are the missing half.
 *
 * ## Observe vs veto
 *
 * An **observe** callback is one-way: it becomes an `onXxx` TurboModule event and native returns
 * immediately. A **veto** callback has a return value native waits for, and there are eight of them.
 * Those go through `AppdnaVetoInvoker`, which emits `onHostCallback` and awaits
 * `respondToHostCallback` under a timeout.
 *
 * ## Why the synchronous vetoes do not block
 *
 * The four onboarding hooks are `async` on the native protocol, so awaiting is free. The other four
 * are synchronous — `shouldShowMessage(messageId:) -> Bool` cannot await anything. The SDK therefore
 * exposes a parallel **async seam** for each (`asyncShouldShowMessage`, `asyncShouldOpen`,
 * `asyncOnScreenAction`, and `onPromoCodeSubmit`'s completion handler), consulted in ADDITION to the
 * synchronous delegate method. The sync forwarders below return the permissive answer and defer the
 * real decision to the async seam — the seam the core SDK grew in SPEC-070-C precisely so that a
 * wrapper could answer a veto over a bridge.
 */

/// Emit an event to JS. Implemented by `AppdnaModuleImpl` over its ObjC++ event sink.
typealias AppdnaEmit = (String, [String: Any]) -> Void

// MARK: - Onboarding

final class OnboardingForwarder: NSObject, AppDNAOnboardingDelegate {

    private let emit: AppdnaEmit
    private let invoker: AppdnaVetoInvoker

    init(emit: @escaping AppdnaEmit, invoker: AppdnaVetoInvoker) {
        self.emit = emit
        self.invoker = invoker
    }

    func onOnboardingStarted(flowId: String) {
        emit("onOnboardingStarted", ["flowId": flowId])
    }

    func onOnboardingStepChanged(flowId: String, stepId: String, stepIndex: Int, totalSteps: Int) {
        emit("onOnboardingStepChanged", [
            "flowId": flowId, "stepId": stepId, "stepIndex": stepIndex, "totalSteps": totalSteps,
        ])
    }

    func onOnboardingCompleted(flowId: String, responses: [String: Any]) {
        emit("onOnboardingCompleted", ["flowId": flowId, "responses": responses])
    }

    func onOnboardingDismissed(flowId: String, atStep: Int) {
        emit("onOnboardingDismissed", ["flowId": flowId, "atStep": atStep])
    }

    func onPermissionResult(flowId: String, stepId: String, permissionType: String, granted: Bool) {
        emit("onPermissionResult", [
            "flowId": flowId, "stepId": stepId, "permissionType": permissionType, "granted": granted,
        ])
    }

    // MARK: The four async hooks

    func onBeforeStepAdvance(
        flowId: String,
        fromStepId: String,
        stepIndex: Int,
        stepType: String,
        responses: [String: Any],
        stepData: [String: Any]?
    ) async -> StepAdvanceResult {
        var args: [String: Any] = [
            "flowId": flowId,
            "fromStepId": fromStepId,
            "stepIndex": stepIndex,
            "stepType": stepType,
            "responses": responses,
        ]
        if let stepData { args["stepData"] = stepData }
        return AppdnaVetoDecoder.stepAdvanceResult(await invoker.invoke("onBeforeStepAdvance", args))
    }

    func onBeforeStepRender(
        flowId: String,
        stepId: String,
        stepIndex: Int,
        stepType: String,
        responses: [String: Any]
    ) async -> StepConfigOverride? {
        let reply = await invoker.invoke("onBeforeStepRender", [
            "flowId": flowId,
            "stepId": stepId,
            "stepIndex": stepIndex,
            "stepType": stepType,
            "responses": responses,
        ])
        return AppdnaVetoDecoder.stepConfigOverride(reply)
    }

    func onElementInteraction(
        flowId: String,
        stepId: String,
        blockId: String,
        action: String,
        value: String?,
        inputValues: [String: Any]
    ) async -> ElementInteractionResult? {
        var args: [String: Any] = [
            "flowId": flowId,
            "stepId": stepId,
            "blockId": blockId,
            "action": action,
            "inputValues": inputValues,
        ]
        if let value { args["value"] = value }
        return AppdnaVetoDecoder.elementInteractionResult(await invoker.invoke("onElementInteraction", args))
    }

    func onPermissionRequest(_ permissionType: String) async -> PermissionHandling? {
        let reply = await invoker.invoke("onPermissionRequest", ["permissionType": permissionType])
        return AppdnaVetoDecoder.permissionHandling(reply)
    }
}

// MARK: - Paywall

final class PaywallForwarder: NSObject, AppDNAPaywallDelegate {

    private let emit: AppdnaEmit
    private let invoker: AppdnaVetoInvoker

    init(emit: @escaping AppdnaEmit, invoker: AppdnaVetoInvoker) {
        self.emit = emit
        self.invoker = invoker
    }

    func onPaywallPresented(paywallId: String) {
        emit("onPaywallPresented", ["paywallId": paywallId])
    }

    func onPaywallAction(paywallId: String, action: PaywallAction) {
        emit("onPaywallAction", ["paywallId": paywallId, "action": action.rawValue])
    }

    func onPaywallPurchaseStarted(paywallId: String, productId: String) {
        emit("onPaywallPurchaseStarted", ["paywallId": paywallId, "productId": productId])
    }

    func onPaywallPurchaseCompleted(paywallId: String, productId: String, transaction: TransactionInfo) {
        emit("onPaywallPurchaseCompleted", [
            "paywallId": paywallId, "productId": productId, "transaction": AppdnaMappers.map(transaction),
        ])
    }

    func onPaywallPurchaseFailed(paywallId: String, error: Error) {
        emit("onPaywallPurchaseFailed", ["paywallId": paywallId, "error": error.localizedDescription])
    }

    func onPaywallDismissed(paywallId: String) {
        emit("onPaywallDismissed", ["paywallId": paywallId])
    }

    func onPaywallRestoreStarted(paywallId: String) {
        emit("onPaywallRestoreStarted", ["paywallId": paywallId])
    }

    func onPaywallRestoreCompleted(paywallId: String, productIds: [String]) {
        emit("onPaywallRestoreCompleted", ["paywallId": paywallId, "restoredProductIds": productIds])
    }

    func onPaywallRestoreFailed(paywallId: String, error: Error) {
        emit("onPaywallRestoreFailed", ["paywallId": paywallId, "error": error.localizedDescription])
    }

    func onPostPurchaseDeepLink(paywallId: String, url: String) {
        emit("onPostPurchaseDeepLink", ["paywallId": paywallId, "url": url])
    }

    func onPostPurchaseNextStep(paywallId: String) {
        emit("onPostPurchaseNextStep", ["paywallId": paywallId])
    }

    /**
     * 🔴 The one hook whose default is **reject**.
     *
     * A timeout, an unregistered hook, or a saturated pending map all mean "the host did not validate
     * this code", and the only safe reading of that is *invalid*. Defaulting to `true` here is how a
     * paywall starts honouring any string a user types — the live defect this wrapper exists to not
     * repeat.
     */
    func onPromoCodeSubmit(paywallId: String, code: String, completion: @escaping (Bool) -> Void) {
        Task {
            let reply = await invoker.invoke("onPromoCodeSubmit", ["paywallId": paywallId, "code": code])
            // The paywall's promo field re-renders from this callback. Android's forwarder answers on
            // `Dispatchers.Main`; iOS has to say so explicitly.
            await MainActor.run { completion(reply as? Bool ?? false) }
        }
    }
}

// MARK: - Surveys, messages, push, billing, deep links, init

/**
 The 9th delegate (P8). `onScreenAction` is a VETO and rides `AppDNA.asyncOnScreenAction` (the
 host-callback seam), exactly as §18.6 ruled — but the protocol still requires it, so it returns
 `true` here: the async seam is the one that actually asks the host, and answering `false` from both
 would let the two answers disagree about the same action.
 */
final class ScreenForwarder: NSObject, AppDNAScreenDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onScreenPresented(screenId: String) {
        emit("onScreenPresented", ["screenId": screenId])
    }

    func onScreenDismissed(screenId: String, result: ScreenResult) {
        emit("onScreenDismissed", ["screenId": screenId, "result": AppdnaMappers.map(result)])
    }

    func onFlowCompleted(flowId: String, result: FlowResult) {
        emit("onFlowCompleted", ["flowId": flowId, "result": AppdnaMappers.map(result)])
    }

    /// Not the host's answer — `AppDNA.asyncOnScreenAction` is. Allow, and let the async seam veto.
    func onScreenAction(screenId: String, action: SectionAction) -> Bool { true }
}

final class SurveyForwarder: NSObject, AppDNASurveyDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onSurveyPresented(surveyId: String) {
        emit("onSurveyPresented", ["surveyId": surveyId])
    }

    /// `[{questionId, answer}]` — not Flutter's orphan `SurveyResult`, which native never emitted.
    func onSurveyCompleted(surveyId: String, responses: [SurveyResponse]) {
        emit("onSurveyCompleted", ["surveyId": surveyId, "responses": responses.map(AppdnaMappers.map)])
    }

    func onSurveyDismissed(surveyId: String) {
        emit("onSurveyDismissed", ["surveyId": surveyId])
    }
}

final class InAppMessageForwarder: NSObject, AppDNAInAppMessageDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onMessageShown(messageId: String, trigger: String) {
        emit("onMessageShown", ["messageId": messageId, "trigger": trigger])
    }

    func onMessageAction(messageId: String, action: String, data: [String: Any]?) {
        var payload: [String: Any] = ["messageId": messageId, "action": action]
        if let data { payload["data"] = data }
        emit("onMessageAction", payload)
    }

    func onMessageDismissed(messageId: String) {
        emit("onMessageDismissed", ["messageId": messageId])
    }

    /// The sync veto cannot await a bridge round trip, so it allows and defers to
    /// `AppDNA.inAppMessages.asyncShouldShowMessage`, which `MessageManager` consults as well. Both
    /// can suppress; only one of them can wait.
    func shouldShowMessage(messageId: String) -> Bool { true }
}

final class PushForwarder: NSObject, AppDNAPushDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onPushTokenRegistered(token: String) {
        emit("onPushTokenRegistered", ["token": token])
    }

    func onPushReceived(notification: PushPayload, inForeground: Bool) {
        emit("onPushReceived", ["payload": AppdnaMappers.map(notification), "inForeground": inForeground])
    }

    func onPushTapped(notification: PushPayload, actionId: String?) {
        var payload: [String: Any] = ["payload": AppdnaMappers.map(notification)]
        if let actionId { payload["actionId"] = actionId }
        emit("onPushTapped", payload)
    }
}

final class BillingForwarder: NSObject, AppDNABillingDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onPurchaseCompleted(productId: String, transaction: TransactionInfo) {
        emit("onPurchaseCompleted", ["productId": productId, "transaction": AppdnaMappers.map(transaction)])
    }

    func onPurchaseFailed(productId: String, error: Error) {
        emit("onPurchaseFailed", ["productId": productId, "error": error.localizedDescription])
    }

    /// ⚠ `onEntitlementsChanged` is deliberately NOT implemented here.
    ///
    /// The SDK fans entitlement changes out through two independent paths: this delegate method
    /// (fired by `RevenueCatBridge` on Android, and by nothing at all on iOS) and the explicit
    /// observer behind `AppDNA.billing.onEntitlementsChanged(_:)` (live on both). Implementing both
    /// would deliver every change twice to a RevenueCat-configured Android host.
    ///
    /// `startEntitlementObserver()` is the single source, because it is the only one that fires on
    /// both platforms. The protocol's default no-op keeps this class conforming.
    func onRestoreCompleted(restoredProducts: [String]) {
        emit("onRestoreCompleted", ["restoredProducts": restoredProducts])
    }

    // N8 — `onBillingUnavailable` is Android-only. iOS's protocol has no such method, and inventing
    // one that never fires would be worse than the honest asymmetry the facade documents.
}

final class DeepLinkForwarder: NSObject, AppDNADeepLinkDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onDeepLinkReceived(url: URL, params: [String: String]) {
        emit("onDeepLinkReceived", ["url": url.absoluteString, "params": params])
    }
}

final class InitForwarder: NSObject, AppDNAInitDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onInitDegraded(reason: Error) {
        emit("onInitDegraded", [
            "type": String(describing: type(of: reason)),
            "message": reason.localizedDescription,
        ])
    }
}

final class LifecycleForwarder: NSObject, AppDNALifecycleDelegate {
    private let emit: AppdnaEmit
    init(emit: @escaping AppdnaEmit) { self.emit = emit }

    func onSdkRuntimeLocked(reason: String, lockedAt: String) {
        emit("onSdkRuntimeLocked", ["reason": reason, "lockedAt": lockedAt])
    }

    func onSdkRuntimeUnlocked() {
        emit("onSdkRuntimeUnlocked", [:])
    }
}

// MARK: - Reply decoding

/**
 * JS reply → the concrete native return type. Every unknown or missing shape falls back to the SDK's
 * own default, which is exactly what a host that never registered the hook would get.
 *
 * The wire shapes are identical to Flutter's, so a host porting a veto handler between the two SDKs
 * does not have to relearn them.
 */
enum AppdnaVetoDecoder {

    /// `{type:"proceed"|"proceedWithData"|"block"|"skipTo"|"stay", …}` → default `.proceed`.
    static func stepAdvanceResult(_ reply: Any?) -> StepAdvanceResult {
        guard let map = reply as? [String: Any] else { return .proceed }
        switch (map["type"] as? String) ?? "proceed" {
        case "proceedWithData":
            return .proceedWithData(map["data"] as? [String: Any] ?? [:])
        case "block":
            return .block(message: (map["message"] as? String) ?? "")
        case "skipTo":
            let stepId = (map["stepId"] as? String) ?? ""
            if let data = map["data"] as? [String: Any], !data.isEmpty {
                return .skipToWithData(stepId: stepId, data: data)
            }
            return .skipTo(stepId: stepId)
        case "stay":
            return .stay(message: map["message"] as? String)
        default:
            return .proceed
        }
    }

    /// map-or-null → `StepConfigOverride?`, field by field.
    static func stepConfigOverride(_ reply: Any?) -> StepConfigOverride? {
        guard let map = reply as? [String: Any] else { return nil }
        return StepConfigOverride(
            fieldDefaults: map["fieldDefaults"] as? [String: Any],
            title: map["title"] as? String,
            subtitle: map["subtitle"] as? String,
            ctaText: map["ctaText"] as? String,
            layoutOverrides: map["layoutOverrides"] as? [String: Any]
        )
    }

    /// map-or-null → `ElementInteractionResult?`. `fieldConfigPatches` is decoded element by element:
    /// a single `as? [String: [String: Any]]` cast fails on a bridged nested dictionary.
    static func elementInteractionResult(_ reply: Any?) -> ElementInteractionResult? {
        guard let map = reply as? [String: Any] else { return nil }
        var patches: [String: [String: Any]]?
        if let raw = map["fieldConfigPatches"] as? [String: Any] {
            var out: [String: [String: Any]] = [:]
            for (key, value) in raw {
                if let inner = value as? [String: Any] { out[key] = inner }
            }
            patches = out
        }
        return ElementInteractionResult(
            fieldConfigPatches: patches,
            inputValuePatches: map["inputValuePatches"] as? [String: Any],
            advance: (map["advance"] as? Bool) ?? false
        )
    }

    /// `{type:"handledByHost",granted:Bool}` short-circuits the OS prompt; nil runs the native flow.
    static func permissionHandling(_ reply: Any?) -> PermissionHandling? {
        guard let map = reply as? [String: Any] else { return nil }
        switch (map["type"] as? String) ?? "proceed" {
        case "handledByHost":
            return .handledByHost(granted: (map["granted"] as? Bool) ?? false)
        default:
            return .proceed
        }
    }
}
