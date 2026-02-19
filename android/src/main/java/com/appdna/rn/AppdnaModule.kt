package com.appdna.rn

import ai.appdna.sdk.AppDNA
import ai.appdna.sdk.AppDNAOptions
import ai.appdna.sdk.Environment
import ai.appdna.sdk.LogLevel
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*

class AppdnaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun getName(): String = "AppdnaModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun sendEvent(eventName: String, params: WritableArray?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // MARK: - Core

    @ReactMethod
    fun configure(apiKey: String, env: String, options: ReadableMap?, promise: Promise) {
        val environment = if (env == "staging") Environment.SANDBOX else Environment.PRODUCTION
        val opts = parseOptions(options)
        AppDNA.configure(reactApplicationContext, apiKey, environment, opts)

        // Register web entitlement listener
        AppDNA.onWebEntitlementChanged { entitlement ->
            val map = entitlement?.toMap()?.let { toWritableMap(it) }
            sendEvent("onWebEntitlementChanged", map)
        }

        promise.resolve(null)
    }

    @ReactMethod
    fun identify(userId: String, traits: ReadableMap?, promise: Promise) {
        AppDNA.identify(userId, traits?.toHashMap()?.mapValues { it.value as Any })
        promise.resolve(null)
    }

    @ReactMethod
    fun reset(promise: Promise) {
        AppDNA.reset()
        promise.resolve(null)
    }

    @ReactMethod
    fun track(event: String, properties: ReadableMap?, promise: Promise) {
        AppDNA.track(event, properties?.toHashMap()?.mapValues { it.value as Any })
        promise.resolve(null)
    }

    @ReactMethod
    fun flush(promise: Promise) {
        AppDNA.flush()
        promise.resolve(null)
    }

    // MARK: - Remote Config & Experiments

    @ReactMethod
    fun getRemoteConfig(key: String, promise: Promise) {
        promise.resolve(AppDNA.getRemoteConfig(key))
    }

    @ReactMethod
    fun isFeatureEnabled(flag: String, promise: Promise) {
        promise.resolve(AppDNA.isFeatureEnabled(flag))
    }

    @ReactMethod
    fun getExperimentVariant(experimentId: String, promise: Promise) {
        promise.resolve(AppDNA.getExperimentVariant(experimentId))
    }

    @ReactMethod
    fun isInVariant(experimentId: String, variantId: String, promise: Promise) {
        promise.resolve(AppDNA.isInVariant(experimentId, variantId))
    }

    @ReactMethod
    fun getExperimentConfig(experimentId: String, key: String, promise: Promise) {
        promise.resolve(AppDNA.getExperimentConfig(experimentId, key))
    }

    // MARK: - Push

    @ReactMethod
    fun setPushToken(token: String, promise: Promise) {
        AppDNA.setPushToken(token)
        promise.resolve(null)
    }

    @ReactMethod
    fun setPushPermission(granted: Boolean, promise: Promise) {
        AppDNA.setPushPermission(granted)
        promise.resolve(null)
    }

    @ReactMethod
    fun trackPushDelivered(pushId: String, promise: Promise) {
        AppDNA.trackPushDelivered(pushId)
        promise.resolve(null)
    }

    @ReactMethod
    fun trackPushTapped(pushId: String, action: String?, promise: Promise) {
        AppDNA.trackPushTapped(pushId, action)
        promise.resolve(null)
    }

    // MARK: - Privacy

    @ReactMethod
    fun setConsent(analytics: Boolean, promise: Promise) {
        AppDNA.setConsent(analytics)
        promise.resolve(null)
    }

    // MARK: - Paywalls & Onboarding

    @ReactMethod
    fun presentPaywall(id: String, context: ReadableMap?, promise: Promise) {
        val activity = currentActivity
        if (activity != null) {
            AppDNA.presentPaywall(activity, id)
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun presentOnboarding(flowId: String, promise: Promise) {
        val activity = currentActivity
        if (activity != null) {
            AppDNA.presentOnboarding(activity, flowId)
        }
        promise.resolve(null)
    }

    // MARK: - Ready

    @ReactMethod
    fun onReady(promise: Promise) {
        AppDNA.onReady {
            promise.resolve(null)
        }
    }

    // MARK: - v0.3: Web Entitlements

    @ReactMethod
    fun getWebEntitlement(promise: Promise) {
        val entitlement = AppDNA.webEntitlement
        if (entitlement != null) {
            promise.resolve(toWritableMap(entitlement.toMap()))
        } else {
            promise.resolve(null)
        }
    }

    // MARK: - v0.3: Deferred Deep Links

    @ReactMethod
    fun checkDeferredDeepLink(promise: Promise) {
        AppDNA.checkDeferredDeepLink { deepLink ->
            if (deepLink != null) {
                promise.resolve(toWritableMap(deepLink.toMap()))
            } else {
                promise.resolve(null)
            }
        }
    }

    // MARK: - Lifecycle

    @ReactMethod
    fun shutdown(promise: Promise) {
        AppDNA.shutdown()
        promise.resolve(null)
    }

    @ReactMethod
    fun getSdkVersion(promise: Promise) {
        promise.resolve(AppDNA.sdkVersion)
    }

    // MARK: - Billing

    @ReactMethod
    fun purchase(productId: String, offerToken: String?, promise: Promise) {
        scope.launch {
            try {
                val result = AppDNA.billing.purchase(productId, offerToken)
                promise.resolve(toWritableMap(result.toMap()))
            } catch (e: Exception) {
                promise.reject("PURCHASE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun restorePurchases(promise: Promise) {
        scope.launch {
            try {
                val entitlements = AppDNA.billing.restorePurchases()
                val array = Arguments.createArray()
                entitlements.forEach { array.pushMap(toWritableMap(it.toMap())) }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("RESTORE_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun getProducts(productIds: ReadableArray, promise: Promise) {
        val ids = (0 until productIds.size()).map { productIds.getString(it) }
        scope.launch {
            try {
                val products = AppDNA.billing.getProducts(ids)
                val array = Arguments.createArray()
                products.forEach { array.pushMap(toWritableMap(it.toMap())) }
                promise.resolve(array)
            } catch (e: Exception) {
                promise.reject("PRODUCTS_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun hasActiveSubscription(promise: Promise) {
        scope.launch {
            try {
                val hasActive = AppDNA.billing.hasActiveSubscription()
                promise.resolve(hasActive)
            } catch (e: Exception) {
                promise.reject("SUBSCRIPTION_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun startEntitlementObserver(promise: Promise) {
        AppDNA.billing.onEntitlementsChanged { entitlements ->
            val array = Arguments.createArray()
            entitlements.forEach { array.pushMap(toWritableMap(it.toMap())) }
            sendEvent("onEntitlementsChanged", array)
        }
        promise.resolve(null)
    }

    // MARK: - Helpers

    private fun parseOptions(map: ReadableMap?): AppDNAOptions {
        if (map == null) return AppDNAOptions()
        val logLevel = if (map.hasKey("logLevel")) {
            when (map.getString("logLevel")) {
                "none" -> LogLevel.NONE
                "error" -> LogLevel.ERROR
                "warning" -> LogLevel.WARNING
                "info" -> LogLevel.INFO
                "debug" -> LogLevel.DEBUG
                else -> LogLevel.WARNING
            }
        } else LogLevel.WARNING
        return AppDNAOptions(
            flushInterval = if (map.hasKey("flushInterval")) map.getDouble("flushInterval").toLong() else 30L,
            batchSize = if (map.hasKey("batchSize")) map.getInt("batchSize") else 20,
            configTTL = if (map.hasKey("configTTL")) map.getDouble("configTTL").toLong() else 300L,
            logLevel = logLevel
        )
    }

    private fun toWritableMap(map: Map<String, Any?>): WritableMap {
        val writableMap = Arguments.createMap()
        for ((key, value) in map) {
            when (value) {
                null -> writableMap.putNull(key)
                is Boolean -> writableMap.putBoolean(key, value)
                is Int -> writableMap.putInt(key, value)
                is Long -> writableMap.putDouble(key, value.toDouble())
                is Double -> writableMap.putDouble(key, value)
                is String -> writableMap.putString(key, value)
                is Map<*, *> -> {
                    @Suppress("UNCHECKED_CAST")
                    writableMap.putMap(key, toWritableMap(value as Map<String, Any?>))
                }
                else -> writableMap.putString(key, value.toString())
            }
        }
        return writableMap
    }
}
