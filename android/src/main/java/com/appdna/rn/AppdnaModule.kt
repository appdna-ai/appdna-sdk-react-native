package com.appdna.rn

import ai.appdna.sdk.AppDNA
import ai.appdna.sdk.AppDNAOptions
import ai.appdna.sdk.BillingProvider
import ai.appdna.sdk.Environment
import ai.appdna.sdk.LogLevel
import ai.appdna.sdk.paywalls.PaywallContext
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.module.annotations.ReactModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * SPEC-070-B P2 — the AppDNA TurboModule for Android.
 *
 * Extends the CODEGEN'D [NativeAppdnaModuleSpec] rather than `ReactContextBaseJavaModule`, so a
 * method that exists in `src/specs/NativeAppdnaModule.ts` but not here is a COMPILE error, and vice
 * versa. Before this, `supportedEvents()` returned exactly two names while ~30 JS listeners waited
 * on emitters that did not exist, and every `setDelegate` was a silent no-op.
 *
 * ## Threading (E10) — load-bearing
 *
 * TurboModule methods execute on the **JS thread**, and `getMethodQueue()` is ignored. So a native
 * call that blocks — `AppDNA.presentOnboarding` posts to the main looper and then
 * `latch.await(5, SECONDS)` when called off-main — would freeze rendering, timers, and every other
 * call for five seconds. Present-style calls are therefore dispatched onto the **UI thread**, where
 * native's own `Looper.myLooper() == mainLooper` check takes the latch-free path.
 */
@ReactModule(name = AppdnaModule.NAME)
class AppdnaModule(private val reactContext: ReactApplicationContext) :
    NativeAppdnaModuleSpec(reactContext) {

    /**
     * SPEC-070-B E6 — cancelled in [invalidate]. The old module leaked this scope: a `configure()`
     * after a Metro reload created a second one and never cancelled the first.
     */
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    /**
     * PN row 5 — retained so [invalidate] can remove it. Kotlin listener removal is REFERENCE
     * IDENTITY: a lambda literal allocates a fresh object per evaluation, so passing one to
     * `removeEntitlementsChangedListener` would silently remove nothing.
     */
    private var entitlementListener: ((List<ai.appdna.sdk.billing.Entitlement>) -> Unit)? = null

    companion object {
        const val NAME = "AppdnaModule"

        /**
         * SPEC-070-B §7 — pinned literal, underscore not hyphen. Injected UNCONDITIONALLY in the
         * native bridge, never read from the host's options: a host must not be able to set, spoof,
         * or omit its own attribution. `event-envelope.schema.ts` is `.catch('native')`, so a wrong
         * tag does not error, is not logged, and is not metered — it just quietly lies in BigQuery.
         */
        private const val FRAMEWORK_TAG = "react_native"
    }

    // ── Lifecycle / core ──────────────────────────────────────────────────────

    override fun configure(apiKey: String, env: String, options: ReadableMap?, promise: Promise) {
        try {
            // The wire value is `sandbox`, matching the native enum and iOS. `staging` named a case
            // that has never existed on either platform.
            val environment = if (env == "sandbox") Environment.SANDBOX else Environment.PRODUCTION
            AppDNA.configure(reactContext, apiKey, environment, parseOptions(options))
            promise.resolve(null)
        } catch (e: Throwable) {
            promise.reject("CONFIGURE_ERROR", e.message, e)
        }
    }

    override fun identify(userId: String, traits: ReadableMap?, promise: Promise) {
        // E9.2: nulls survive as `JSONObject.NULL`. The old `mapValues { it.value as Any }` NPE'd on
        // `identify(id, { referrer: null })` while iOS kept NSNull and survived.
        AppDNA.identify(userId, AppdnaBridge.toPropertyMap(traits))
        promise.resolve(null)
    }

    override fun reset(promise: Promise) {
        AppDNA.reset()
        promise.resolve(null)
    }

    /** W17 — fire-and-forget: native enqueues, so a Promise per event would allocate for nothing. */
    override fun track(event: String, properties: ReadableMap?) {
        AppDNA.track(event, AppdnaBridge.toPropertyMap(properties))
    }

    override fun flush(promise: Promise) {
        AppDNA.flush()
        promise.resolve(null)
    }

    override fun setConsent(analytics: Boolean, promise: Promise) {
        AppDNA.setConsent(analytics)
        promise.resolve(null)
    }

    override fun isConsentGranted(promise: Promise) {
        promise.resolve(AppDNA.isConsentGranted())
    }

    override fun setLogLevel(level: String) {
        AppDNA.setLogLevel(level)
    }

    override fun shutdown(promise: Promise) {
        AppDNA.shutdown()
        promise.resolve(null)
    }

    override fun getSdkVersion(promise: Promise) {
        promise.resolve(AppDNA.sdkVersion)
    }

    override fun diagnose(promise: Promise) {
        promise.resolve(AppDNA.diagnose())
    }

    /** D-k — the init-degraded seam ships with a consumer rather than as dead native API. */
    override fun getLastInitError(promise: Promise) {
        val err = AppDNA.lastInitError
        promise.resolve(
            if (err == null) {
                "null"
            } else {
                AppdnaBridge.toJson(
                    mapOf(
                        "type" to err::class.java.simpleName,
                        "message" to (err.message ?: ""),
                    ),
                )
            },
        )
    }

    /** D-h / AC-22 — populates `context.screen` on every subsequent event. */
    override fun notifyScreenAppeared(screenName: String) {
        AppDNA.notifyScreenAppeared(screenName)
    }

    override fun onReady(promise: Promise) {
        AppDNA.onReady { promise.resolve(null) }
    }

    // ── Remote config ─────────────────────────────────────────────────────────

    /**
     * E9.1 — resolves a JSON **string**, not a raw `Map`. `promise.resolve(map)` throws at the
     * bridge, so an object-valued flag worked on iOS and Flutter and crashed on RN Android.
     */
    override fun getRemoteConfig(key: String, promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.getRemoteConfig(key)))
    }

    override fun getAllRemoteConfig(promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.remoteConfig.getAll()))
    }

    override fun refreshConfig(promise: Promise) {
        AppDNA.remoteConfig.refresh()
        promise.resolve(null)
    }

    // ── Feature flags ─────────────────────────────────────────────────────────

    override fun isFeatureEnabled(flag: String, promise: Promise) {
        promise.resolve(AppDNA.isFeatureEnabled(flag))
    }

    override fun getFeatureVariant(flag: String, promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.features.getVariant(flag)))
    }

    // ── Experiments ───────────────────────────────────────────────────────────

    override fun getExperimentVariant(experimentId: String, promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.getExperimentVariant(experimentId)))
    }

    override fun isInVariant(experimentId: String, variantId: String, promise: Promise) {
        promise.resolve(AppDNA.isInVariant(experimentId, variantId))
    }

    override fun getExperimentConfig(experimentId: String, key: String, promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.getExperimentConfig(experimentId, key)))
    }

    override fun getExperimentExposures(promise: Promise) {
        val exposures = AppDNA.experiments.getExposures().map {
            mapOf<String, Any?>("experimentId" to it.experimentId, "variant" to it.variant)
        }
        promise.resolve(AppdnaBridge.toWritableArray(exposures))
    }

    // ── Onboarding / paywall / surveys / messages ─────────────────────────────

    override fun presentOnboarding(flowId: String, context: ReadableMap?, promise: Promise) {
        // E10: dispatch onto the UI thread so native's own main-looper check takes the latch-free
        // path. Blocking here would freeze the JS thread for the latch's five seconds.
        val activity = reactContext.currentActivity ?: return promise.resolve(false)
        activity.runOnUiThread {
            promise.resolve(AppDNA.presentOnboarding(activity, flowId))
        }
    }

    override fun presentPaywall(paywallId: String, context: ReadableMap?, promise: Promise) {
        val activity = reactContext.currentActivity
            ?: return promise.reject("NO_ACTIVITY", "presentPaywall requires a foreground Activity")
        activity.runOnUiThread {
            AppDNA.presentPaywall(activity, paywallId, parsePaywallContext(context))
            promise.resolve(null)
        }
    }

    /** N17 — an iOS overload, a distinct Android name. The wrapper exposes one name for both. */
    override fun presentPaywallByPlacement(placement: String, context: ReadableMap?, promise: Promise) {
        val activity = reactContext.currentActivity
            ?: return promise.reject("NO_ACTIVITY", "presentPaywallByPlacement requires a foreground Activity")
        activity.runOnUiThread {
            AppDNA.presentPaywallByPlacement(activity, placement, parsePaywallContext(context))
            promise.resolve(null)
        }
    }

    override fun presentSurvey(surveyId: String, promise: Promise) {
        AppDNA.surveys.present(surveyId)
        promise.resolve(null)
    }

    override fun suppressMessages(suppress: Boolean) {
        AppDNA.inAppMessages.suppressDisplay(suppress)
    }

    // ── Billing ───────────────────────────────────────────────────────────────

    override fun purchase(productId: String, offerToken: String?, promise: Promise) {
        // Play's purchase flow is Activity-bound. Without one there is nothing to launch from, and a
        // silent no-op would look like a user who dismissed the sheet.
        val activity = reactContext.currentActivity
            ?: return promise.reject("NO_ACTIVITY", "purchase() requires a foreground Activity")
        scope.launch {
            try {
                val options = offerToken?.let { ai.appdna.sdk.billing.PurchaseOptions(offerToken = it) }
                val result = AppDNA.billing.purchase(activity, productId, options)
                promise.resolve(AppdnaBridge.toWritableMap(AppdnaMappers.map(result)))
            } catch (e: Throwable) {
                promise.reject("PURCHASE_ERROR", e.message, e)
            }
        }
    }

    override fun restorePurchases(promise: Promise) {
        scope.launch {
            try {
                // `List<String>` — restored product ids, NOT entitlements.
                promise.resolve(AppdnaBridge.toWritableArray(AppDNA.billing.restorePurchases()))
            } catch (e: Throwable) {
                promise.reject("RESTORE_ERROR", e.message, e)
            }
        }
    }

    override fun getProducts(productIds: ReadableArray, promise: Promise) {
        scope.launch {
            try {
                val products = AppDNA.billing.getProducts(AppdnaBridge.toStringList(productIds))
                promise.resolve(AppdnaBridge.toWritableArray(products.map { AppdnaMappers.map(it) }))
            } catch (e: Throwable) {
                promise.reject("PRODUCTS_ERROR", e.message, e)
            }
        }
    }

    override fun hasActiveSubscription(promise: Promise) {
        scope.launch {
            try {
                promise.resolve(AppDNA.billing.hasActiveSubscription())
            } catch (e: Throwable) {
                promise.reject("SUBSCRIPTION_ERROR", e.message, e)
            }
        }
    }

    override fun getEntitlements(promise: Promise) {
        scope.launch {
            try {
                val entitlements = AppDNA.billing.getEntitlements()
                promise.resolve(AppdnaBridge.toWritableArray(entitlements.map { AppdnaMappers.map(it) }))
            } catch (e: Throwable) {
                promise.reject("ENTITLEMENTS_ERROR", e.message, e)
            }
        }
    }

    override fun startEntitlementObserver(promise: Promise) {
        val listener: (List<ai.appdna.sdk.billing.Entitlement>) -> Unit = { entitlements ->
            emitOnEntitlementsChanged(
                AppdnaBridge.toWritableMap(
                    mapOf("entitlements" to entitlements.map { AppdnaMappers.map(it) }),
                ),
            )
        }
        entitlementListener = listener
        AppDNA.billing.onEntitlementsChanged(listener)
        promise.resolve(null)
    }

    // ── Push ──────────────────────────────────────────────────────────────────

    /** ⚠ The namespace is `AppDNA.push` on Android and `AppDNA.pushModule` on iOS — a naming split. */
    override fun requestPushPermission(promise: Promise) {
        scope.launch {
            try {
                promise.resolve(AppDNA.push.requestPermission(reactContext.currentActivity))
            } catch (e: Throwable) {
                promise.reject("PUSH_PERMISSION_ERROR", e.message, e)
            }
        }
    }

    override fun getPushToken(promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.push.getToken()))
    }

    /** N9 — an FCM `String` here; hex-encoded APNs `Data` on iOS. One signature, two meanings. */
    override fun setPushToken(token: String, promise: Promise) {
        AppDNA.setPushToken(token)
        promise.resolve(null)
    }

    override fun setPushPermission(granted: Boolean, promise: Promise) {
        AppDNA.setPushPermission(granted)
        promise.resolve(null)
    }

    override fun trackPushDelivered(pushId: String, promise: Promise) {
        AppDNA.trackPushDelivered(pushId)
        promise.resolve(null)
    }

    override fun trackPushTapped(pushId: String, action: String?, promise: Promise) {
        AppDNA.trackPushTapped(pushId, action)
        promise.resolve(null)
    }

    // ── Deep links / web entitlements ─────────────────────────────────────────

    /** N15 — a `String` here, a `URL` on iOS. */
    override fun handleDeepLink(url: String, promise: Promise) {
        AppDNA.deepLinks.handleURL(url)
        promise.resolve(null)
    }

    override fun checkDeferredDeepLink(promise: Promise) {
        AppDNA.checkDeferredDeepLink { deepLink ->
            promise.resolve(AppdnaBridge.toJson(deepLink?.toMap()))
        }
    }

    override fun getWebEntitlement(promise: Promise) {
        promise.resolve(AppdnaBridge.toJson(AppDNA.webEntitlement?.toMap()))
    }

    // ── Host-veto reply channel (P3 routes the hooks; this is the seam) ───────

    override fun respondToHostCallback(callbackId: String, resultJson: String) {
        AppdnaHostCallbacks.respond(callbackId, resultJson)
    }

    // ── Teardown (E6 / E11) ──────────────────────────────────────────────────

    /**
     * Every native listener registered here is registered on the process-global `AppDNA` singleton
     * and captures this bridge-scoped module. A Metro reload or a second `configure()` would
     * otherwise leave the old closures attached and deliver every event N-fold.
     *
     * ⚠ Fast Refresh runs neither `invalidate()` nor `configure()`. Only a true reload does.
     */
    override fun invalidate() {
        entitlementListener?.let { AppDNA.billing.removeEntitlementsChangedListener(it) }
        entitlementListener = null
        // E6: drain the pending veto map, rejecting each — a JS side that no longer exists will
        // never answer, and native would otherwise await forever.
        AppdnaHostCallbacks.invalidateAll()
        scope.cancel()
        super.invalidate()
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * ⚠ `internal` so `AppdnaParseOptionsTest` can reach it (AC-11). A jest test cannot see a
     * native `?? 3600`, and neither can a Dart one — only a native unit test can.
     */
    internal fun parseOptions(map: ReadableMap?): AppDNAOptions {
        val values = AppdnaBridge.toValueMap(map) ?: emptyMap()
        val defaults = AppDNAOptions()

        val logLevel = when (values["logLevel"] as? String) {
            "none" -> LogLevel.NONE
            "error" -> LogLevel.ERROR
            "warning" -> LogLevel.WARNING
            "info" -> LogLevel.INFO
            "debug" -> LogLevel.DEBUG
            else -> defaults.logLevel
        }

        return AppDNAOptions(
            // E7: never a literal. `?? 300` was how the wrappers drifted 12× off the native TTL.
            flushInterval = (values["flushInterval"] as? Number)?.toLong() ?: defaults.flushInterval,
            batchSize = (values["batchSize"] as? Number)?.toInt() ?: defaults.batchSize,
            configTTL = (values["configTTL"] as? Number)?.toLong() ?: defaults.configTTL,
            logLevel = logLevel,
            notificationIcon = (values["notificationIcon"] as? Number)?.toInt() ?: defaults.notificationIcon,
            // §7 rule 1: injected unconditionally, NOT read from `values`. A host cannot spoof it.
            framework = FRAMEWORK_TAG,
            frameworkVersion = values["frameworkVersion"] as? String,
            // AC-21: Android gained billingProvider in 1.0.42, so the host's choice finally arrives.
            billingProvider = BillingProvider.fromWire(values["billingProvider"]) ?: defaults.billingProvider,
            requireConsent = values["requireConsent"] as? Boolean ?: defaults.requireConsent,
            vetoTimeout = (values["vetoTimeout"] as? Number)?.toLong() ?: defaults.vetoTimeout,
        )
    }

    /** D-s — all four fields. `customData` reaches the `paywall_view` properties bag natively. */
    private fun parsePaywallContext(map: ReadableMap?): PaywallContext? {
        val values = AppdnaBridge.toValueMap(map) ?: return null
        val placement = values["placement"] as? String ?: return null
        @Suppress("UNCHECKED_CAST")
        val custom = values["customData"] as? Map<String, Any>
        return PaywallContext(
            placement = placement,
            experiment = values["experiment"] as? String,
            variant = values["variant"] as? String,
            customData = custom,
        )
    }
}
