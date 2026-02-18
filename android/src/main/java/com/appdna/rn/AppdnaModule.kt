package com.appdna.rn

import ai.appdna.sdk.AppDNA
import ai.appdna.sdk.Environment
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class AppdnaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AppdnaModule"

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // MARK: - Core

    @ReactMethod
    fun configure(apiKey: String, env: String, promise: Promise) {
        val environment = if (env == "staging") Environment.SANDBOX else Environment.PRODUCTION
        AppDNA.configure(reactApplicationContext, apiKey, environment)

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

    // MARK: - Privacy

    @ReactMethod
    fun setConsent(analytics: Boolean, promise: Promise) {
        AppDNA.setConsent(analytics)
        promise.resolve(null)
    }

    // MARK: - Paywalls & Onboarding (placeholder)

    @ReactMethod
    fun presentPaywall(id: String, context: ReadableMap?, promise: Promise) {
        // Android paywall rendering TBD
        promise.resolve(null)
    }

    @ReactMethod
    fun presentOnboarding(flowId: String, promise: Promise) {
        // Android onboarding rendering TBD
        promise.resolve(null)
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

    // MARK: - Helpers

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
