package com.appdna.rn

import ai.appdna.sdk.AppDNABillingDelegate
import ai.appdna.sdk.screens.AppDNAScreenDelegate
import ai.appdna.sdk.AppDNADeepLinkDelegate
import ai.appdna.sdk.AppDNAInAppMessageDelegate
import ai.appdna.sdk.AppDNAInitDelegate
import ai.appdna.sdk.generated.AppDNALifecycleDelegate
import ai.appdna.sdk.AppDNAPushDelegate
import ai.appdna.sdk.AppDNASurveyDelegate
import ai.appdna.sdk.PushPayload
import ai.appdna.sdk.SurveyResponse
import ai.appdna.sdk.TransactionInfo
import ai.appdna.sdk.onboarding.AppDNAOnboardingDelegate
import ai.appdna.sdk.onboarding.ElementInteractionResult
import ai.appdna.sdk.onboarding.PermissionHandling
import ai.appdna.sdk.onboarding.StepAdvanceResult
import ai.appdna.sdk.onboarding.StepConfigOverride
import ai.appdna.sdk.paywalls.AppDNAPaywallDelegate
import ai.appdna.sdk.paywalls.PaywallAction

/**
 * SPEC-070-B P3 — the native→JS delegate forwarders.
 *
 * Every one of the ~30 SDK callbacks used to have a JS listener and no native emitter. The facade
 * subscribed; nothing ever fired. These classes are the missing half.
 *
 * ## Observe vs veto
 *
 * An **observe** callback is one-way: it becomes an `onXxx` TurboModule event and native returns
 * immediately. A **veto** callback has a return value native waits for, and there are eight of them.
 * Those go through [AppdnaVetoInvoker], which emits `onHostCallback` and awaits
 * `respondToHostCallback` with a per-hook timeout.
 *
 * ## Why the vetoes never block the SDK's thread
 *
 * The four onboarding hooks are `suspend` on the native interface, so awaiting is free. The other
 * four are synchronous — `shouldShowMessage(id): Boolean` cannot await anything. The native SDK
 * therefore exposes a **parallel async seam** for each (`asyncShouldShowMessage`,
 * `asyncShouldOpen`, `asyncOnScreenAction`, and `onPromoCodeSubmit`'s completion handler), consulted
 * in ADDITION to the sync delegate method. The sync forwarders below return the permissive answer
 * and defer the real decision to the async seam. That is not a workaround; it is the seam the core
 * SDK grew in SPEC-070-C precisely so a wrapper could answer a veto over a bridge.
 */

/** Emit an event to JS. Implemented by [AppdnaModule]. */
internal fun interface AppdnaEventEmitter {
    fun emit(event: String, payload: Map<String, Any?>)
}

// ── Onboarding ───────────────────────────────────────────────────────────────

internal class OnboardingForwarder(
    private val emitter: AppdnaEventEmitter,
    private val invoker: AppdnaVetoInvoker,
) : AppDNAOnboardingDelegate {

    override fun onOnboardingStarted(flowId: String) {
        emitter.emit("onOnboardingStarted", mapOf("flowId" to flowId))
    }

    override fun onOnboardingStepChanged(flowId: String, stepId: String, stepIndex: Int, totalSteps: Int) {
        emitter.emit(
            "onOnboardingStepChanged",
            mapOf("flowId" to flowId, "stepId" to stepId, "stepIndex" to stepIndex, "totalSteps" to totalSteps),
        )
    }

    override fun onOnboardingCompleted(flowId: String, responses: Map<String, Any>) {
        emitter.emit("onOnboardingCompleted", mapOf("flowId" to flowId, "responses" to responses))
    }

    override fun onOnboardingDismissed(flowId: String, atStep: Int) {
        emitter.emit("onOnboardingDismissed", mapOf("flowId" to flowId, "atStep" to atStep))
    }

    override fun onPermissionResult(flowId: String, stepId: String, permissionType: String, granted: Boolean) {
        emitter.emit(
            "onPermissionResult",
            mapOf("flowId" to flowId, "stepId" to stepId, "permissionType" to permissionType, "granted" to granted),
        )
    }

    // ── The four async hooks ────────────────────────────────────────────────

    override suspend fun onBeforeStepAdvance(
        flowId: String,
        fromStepId: String,
        stepIndex: Int,
        stepType: String,
        responses: Map<String, Any>,
        stepData: Map<String, Any>?,
    ): StepAdvanceResult {
        val reply = invoker.invoke(
            "onBeforeStepAdvance",
            buildMap {
                put("flowId", flowId)
                put("fromStepId", fromStepId)
                put("stepIndex", stepIndex)
                put("stepType", stepType)
                put("responses", responses)
                stepData?.let { put("stepData", it) }
            },
        )
        return AppdnaVetoDecoder.stepAdvanceResult(reply)
    }

    override suspend fun onBeforeStepRender(
        flowId: String,
        stepId: String,
        stepIndex: Int,
        stepType: String,
        responses: Map<String, Any>,
    ): StepConfigOverride? {
        val reply = invoker.invoke(
            "onBeforeStepRender",
            mapOf(
                "flowId" to flowId,
                "stepId" to stepId,
                "stepIndex" to stepIndex,
                "stepType" to stepType,
                "responses" to responses,
            ),
        )
        return AppdnaVetoDecoder.stepConfigOverride(reply)
    }

    override suspend fun onElementInteraction(
        flowId: String,
        stepId: String,
        blockId: String,
        action: String,
        value: String?,
        inputValues: Map<String, Any>,
    ): ElementInteractionResult? {
        val reply = invoker.invoke(
            "onElementInteraction",
            buildMap {
                put("flowId", flowId)
                put("stepId", stepId)
                put("blockId", blockId)
                put("action", action)
                value?.let { put("value", it) }
                put("inputValues", inputValues)
            },
        )
        return AppdnaVetoDecoder.elementInteractionResult(reply)
    }

    override suspend fun onPermissionRequest(permissionType: String): PermissionHandling? {
        val reply = invoker.invoke("onPermissionRequest", mapOf("permissionType" to permissionType))
        return AppdnaVetoDecoder.permissionHandling(reply)
    }
}

// ── Paywall ──────────────────────────────────────────────────────────────────

internal class PaywallForwarder(
    private val emitter: AppdnaEventEmitter,
    private val invoker: AppdnaVetoInvoker,
    /** The SDK's `onPromoCodeSubmit` is completion-based, so the veto needs a coroutine to live in. */
    private val launchVeto: (suspend () -> Unit) -> Unit,
) : AppDNAPaywallDelegate {

    override fun onPaywallPresented(paywallId: String) {
        emitter.emit("onPaywallPresented", mapOf("paywallId" to paywallId))
    }

    override fun onPaywallAction(paywallId: String, action: PaywallAction) {
        emitter.emit("onPaywallAction", mapOf("paywallId" to paywallId, "action" to action.value))
    }

    override fun onPaywallPurchaseStarted(paywallId: String, productId: String) {
        emitter.emit("onPaywallPurchaseStarted", mapOf("paywallId" to paywallId, "productId" to productId))
    }

    override fun onPaywallPurchaseCompleted(paywallId: String, productId: String, transaction: TransactionInfo) {
        emitter.emit(
            "onPaywallPurchaseCompleted",
            mapOf("paywallId" to paywallId, "productId" to productId, "transaction" to AppdnaMappers.map(transaction)),
        )
    }

    override fun onPaywallPurchaseFailed(paywallId: String, error: Throwable) {
        emitter.emit("onPaywallPurchaseFailed", mapOf("paywallId" to paywallId, "error" to errorMessage(error)))
    }

    override fun onPaywallDismissed(paywallId: String) {
        emitter.emit("onPaywallDismissed", mapOf("paywallId" to paywallId))
    }

    override fun onPaywallRestoreStarted(paywallId: String) {
        emitter.emit("onPaywallRestoreStarted", mapOf("paywallId" to paywallId))
    }

    override fun onPaywallRestoreCompleted(paywallId: String, productIds: List<String>) {
        emitter.emit("onPaywallRestoreCompleted", mapOf("paywallId" to paywallId, "restoredProductIds" to productIds))
    }

    override fun onPaywallRestoreFailed(paywallId: String, error: Throwable) {
        emitter.emit("onPaywallRestoreFailed", mapOf("paywallId" to paywallId, "error" to errorMessage(error)))
    }

    override fun onPostPurchaseDeepLink(paywallId: String, url: String) {
        emitter.emit("onPostPurchaseDeepLink", mapOf("paywallId" to paywallId, "url" to url))
    }

    override fun onPostPurchaseNextStep(paywallId: String) {
        emitter.emit("onPostPurchaseNextStep", mapOf("paywallId" to paywallId))
    }

    /**
     * 🔴 The one hook whose default is **reject**.
     *
     * A timeout, an unregistered hook, or a saturated pending map all mean "the host did not validate
     * this code", and the only safe reading of that is *invalid*. Defaulting to `true` here is how a
     * paywall starts honouring any string a user types — the live defect this wrapper exists to not
     * repeat.
     */
    override fun onPromoCodeSubmit(paywallId: String, code: String, completion: (Boolean) -> Unit) {
        launchVeto {
            val reply = invoker.invoke("onPromoCodeSubmit", mapOf("paywallId" to paywallId, "code" to code))
            completion(reply as? Boolean ?: false)
        }
    }

    private fun errorMessage(error: Throwable): String = error.message ?: error.toString()
}

// ── Surveys, messages, push, billing, deep links, init ───────────────────────

/**
 * The 9th delegate (P8). `onScreenAction` is deliberately NOT overridden here — it is a VETO and
 * rides `AppDNA.asyncOnScreenAction` (the host-callback seam), exactly as §18.6 ruled. Implementing
 * it in both places would ask the host twice and let the two answers disagree.
 */
internal class ScreenForwarder(private val emitter: AppdnaEventEmitter) : AppDNAScreenDelegate {
    override fun onScreenPresented(screenId: String) {
        emitter.emit("onScreenPresented", mapOf("screenId" to screenId))
    }

    override fun onScreenDismissed(screenId: String, result: Map<String, Any?>) {
        emitter.emit("onScreenDismissed", mapOf("screenId" to screenId, "result" to result))
    }

    override fun onFlowCompleted(flowId: String, result: Map<String, Any?>) {
        emitter.emit("onFlowCompleted", mapOf("flowId" to flowId, "result" to result))
    }
}

internal class SurveyForwarder(private val emitter: AppdnaEventEmitter) : AppDNASurveyDelegate {
    override fun onSurveyPresented(surveyId: String) {
        emitter.emit("onSurveyPresented", mapOf("surveyId" to surveyId))
    }

    /** `[{questionId, answer}]` — not Flutter's orphan `SurveyResult`, which native never emitted. */
    override fun onSurveyCompleted(surveyId: String, responses: List<SurveyResponse>) {
        emitter.emit(
            "onSurveyCompleted",
            mapOf("surveyId" to surveyId, "responses" to responses.map { AppdnaMappers.map(it) }),
        )
    }

    override fun onSurveyDismissed(surveyId: String) {
        emitter.emit("onSurveyDismissed", mapOf("surveyId" to surveyId))
    }
}

internal class InAppMessageForwarder(private val emitter: AppdnaEventEmitter) : AppDNAInAppMessageDelegate {
    override fun onMessageShown(messageId: String, trigger: String) {
        emitter.emit("onMessageShown", mapOf("messageId" to messageId, "trigger" to trigger))
    }

    override fun onMessageAction(messageId: String, action: String, data: Map<String, Any>?) {
        emitter.emit("onMessageAction", buildMap {
            put("messageId", messageId)
            put("action", action)
            data?.let { put("data", it) }
        })
    }

    override fun onMessageDismissed(messageId: String) {
        emitter.emit("onMessageDismissed", mapOf("messageId" to messageId))
    }

    /**
     * The sync veto cannot await a bridge round trip, so it allows and defers to
     * `AppDNA.inAppMessages.setAsyncShouldShowMessage`, which `MessageManager` consults as well.
     * Both can suppress; only one of them can wait.
     */
    override fun shouldShowMessage(messageId: String): Boolean = true
}

internal class PushForwarder(private val emitter: AppdnaEventEmitter) : AppDNAPushDelegate {
    override fun onPushTokenRegistered(token: String) {
        emitter.emit("onPushTokenRegistered", mapOf("token" to token))
    }

    override fun onPushReceived(notification: PushPayload, inForeground: Boolean) {
        emitter.emit(
            "onPushReceived",
            mapOf("payload" to AppdnaMappers.map(notification), "inForeground" to inForeground),
        )
    }

    override fun onPushTapped(notification: PushPayload, actionId: String?) {
        emitter.emit("onPushTapped", buildMap {
            put("payload", AppdnaMappers.map(notification))
            actionId?.let { put("actionId", it) }
        })
    }
}

internal class BillingForwarder(private val emitter: AppdnaEventEmitter) : AppDNABillingDelegate {
    override fun onPurchaseCompleted(productId: String, transaction: TransactionInfo) {
        emitter.emit(
            "onPurchaseCompleted",
            mapOf("productId" to productId, "transaction" to AppdnaMappers.map(transaction)),
        )
    }

    override fun onPurchaseFailed(productId: String, error: Throwable) {
        emitter.emit("onPurchaseFailed", mapOf("productId" to productId, "error" to (error.message ?: error.toString())))
    }

    /**
     * ⚠ `onEntitlementsChanged` is deliberately NOT overridden here.
     *
     * The SDK fans entitlement changes out through TWO independent paths: this delegate method (fired
     * by `RevenueCatBridge` on Android; never fired at all on iOS) and the explicit observer behind
     * `AppDNA.billing.onEntitlementsChanged(callback)` (live on both). Overriding both would deliver
     * every change TWICE to a RevenueCat-configured Android host and once to an iOS one.
     *
     * `startEntitlementObserver()` is the single source, because it is the only one that fires on
     * both platforms. See `AppdnaModule.startEntitlementObserver`.
     */
    override fun onRestoreCompleted(restoredProducts: List<String>) {
        emitter.emit("onRestoreCompleted", mapOf("restoredProducts" to restoredProducts))
    }

    /** N8 — Android-only. iOS never emits it, and the facade documents that. */
    override fun onBillingUnavailable() {
        emitter.emit("onBillingUnavailable", emptyMap())
    }
}

internal class DeepLinkForwarder(private val emitter: AppdnaEventEmitter) : AppDNADeepLinkDelegate {
    override fun onDeepLinkReceived(url: String, params: Map<String, String>) {
        emitter.emit("onDeepLinkReceived", mapOf("url" to url, "params" to params))
    }
}

/**
 * SPEC-404 — the backend runtime lock. iOS wired this; Android did not, and
 * `AppDNA.lifecycle.setDelegate(...)` is one facade with one signature, so the same JS fired on iOS
 * and was silently deaf on Android. When the backend hard-suspends an SDK key, an Android host
 * showed no "service unavailable" state and never learned the lock had cleared.
 */
internal class LifecycleForwarder(private val emitter: AppdnaEventEmitter) : AppDNALifecycleDelegate {
    override fun onSdkRuntimeLocked(reason: String, lockedAt: String) {
        emitter.emit("onSdkRuntimeLocked", mapOf("reason" to reason, "lockedAt" to lockedAt))
    }

    override fun onSdkRuntimeUnlocked() {
        emitter.emit("onSdkRuntimeUnlocked", emptyMap())
    }
}

internal class InitForwarder(private val emitter: AppdnaEventEmitter) : AppDNAInitDelegate {
    override fun onInitDegraded(reason: Throwable) {
        emitter.emit(
            "onInitDegraded",
            mapOf("type" to reason::class.java.simpleName, "message" to (reason.message ?: reason.toString())),
        )
    }
}

// ── Reply decoding ───────────────────────────────────────────────────────────

/**
 * JS reply map → the concrete native return type. Every unknown or missing shape falls back to the
 * SDK's own default, which is what a host that never registered the hook would get.
 *
 * The wire shapes are identical to Flutter's (`AppdnaPlugin.swift` / `AppdnaPlugin.kt`), so a host
 * that ports a veto handler between the two SDKs does not have to relearn them.
 */
internal object AppdnaVetoDecoder {

    /** `{type:"proceed"|"proceedWithData"|"block"|"skipTo"|"stay", …}` → default `Proceed`. */
    fun stepAdvanceResult(reply: Any?): StepAdvanceResult {
        val map = reply as? Map<*, *> ?: return StepAdvanceResult.Proceed
        return when (map["type"] as? String ?: "proceed") {
            "proceedWithData" -> StepAdvanceResult.ProceedWithData(anyMap(map["data"]))
            "block" -> StepAdvanceResult.Block(map["message"] as? String ?: "")
            "skipTo" -> {
                val stepId = map["stepId"] as? String ?: ""
                val data = anyMap(map["data"])
                if (data.isEmpty()) StepAdvanceResult.SkipTo(stepId) else StepAdvanceResult.SkipTo(stepId, data)
            }
            "stay" -> StepAdvanceResult.Stay(map["message"] as? String)
            else -> StepAdvanceResult.Proceed
        }
    }

    /** map-or-null → `StepConfigOverride?`, field by field. */
    fun stepConfigOverride(reply: Any?): StepConfigOverride? {
        val map = reply as? Map<*, *> ?: return null
        return StepConfigOverride(
            fieldDefaults = map["fieldDefaults"]?.let { anyMap(it) },
            title = map["title"] as? String,
            subtitle = map["subtitle"] as? String,
            ctaText = map["ctaText"] as? String,
            layoutOverrides = map["layoutOverrides"]?.let { anyMap(it) },
        )
    }

    /** map-or-null → `ElementInteractionResult?`. `fieldConfigPatches` is `blockId → (key → value)`. */
    fun elementInteractionResult(reply: Any?): ElementInteractionResult? {
        val map = reply as? Map<*, *> ?: return null
        val patches = (map["fieldConfigPatches"] as? Map<*, *>)?.entries?.mapNotNull { (key, value) ->
            val inner = value as? Map<*, *> ?: return@mapNotNull null
            key.toString() to anyMap(inner)
        }?.toMap()
        return ElementInteractionResult(
            fieldConfigPatches = patches,
            inputValuePatches = map["inputValuePatches"]?.let { anyMap(it) },
            advance = map["advance"] as? Boolean ?: false,
        )
    }

    /** `{type:"handledByHost",granted:Bool}` short-circuits the OS prompt; null runs the native flow. */
    fun permissionHandling(reply: Any?): PermissionHandling? {
        val map = reply as? Map<*, *> ?: return null
        return when (map["type"] as? String ?: "proceed") {
            "handledByHost" -> PermissionHandling.HandledByHost(map["granted"] as? Boolean ?: false)
            else -> PermissionHandling.Proceed
        }
    }

    /**
     * `Map<String, Any>` — the native DTOs cannot hold a Kotlin null. A JSON `null` inside a veto
     * reply is dropped rather than crashing the step: the host asked for a key to be absent, and an
     * absent key is exactly what the SDK's own no-delegate path produces.
     */
    private fun anyMap(value: Any?): Map<String, Any> {
        val map = value as? Map<*, *> ?: return emptyMap()
        return map.entries.mapNotNull { (key, inner) ->
            if (inner == null) null else key.toString() to inner
        }.toMap()
    }
}
