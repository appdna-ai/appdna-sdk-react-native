package com.appdna.rn

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.ReadableType
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import org.json.JSONArray
import org.json.JSONObject

/**
 * SPEC-070-B P2 / E9 — "nothing raw crosses the RN bridge".
 *
 * Flutter gets this for free (`StandardMessageCodec`). RN's `WritableMap`/`Promise` boundary is
 * narrower, and the old module violated it three ways — each a real crash or a silent corruption:
 *
 *   1. `promise.resolve(AppDNA.getRemoteConfig(key))` resolved a **raw `Map`**, which the bridge
 *      cannot marshal. An object-valued flag therefore worked on iOS and Flutter and threw on RN
 *      Android. Values of unknown shape now cross as a JSON string (E2) and are parsed in the facade.
 *   2. `readableMap.toHashMap().mapValues { it.value as Any }` — a NON-NULL cast. So
 *      `track('e', { referrer: null })` NPE'd on Android while iOS kept `NSNull` and survived.
 *      [toValueMap] preserves nulls.
 *   3. `toWritableMap`'s `when` had no `List` branch, so arrays were stringified through
 *      `else -> putString(value.toString())` — `[1,2]` reached the warehouse as `"[1, 2]"`.
 *      [toWritableMap] handles lists and arrays, and its `else` **throws** rather than inventing a
 *      representation.
 *
 * 📌 Design note (E9.4): `ReadableMap.toHashMap()` coerces every JS number to `Double`, so
 * `count: 3` reaches native as `3.0` on Android and `3` on iOS. Never let a warehouse dedup key
 * depend on the raw numeric type.
 */
internal object AppdnaBridge {

    /** JS → Kotlin. Preserves `null` values; a dropped key and an explicit null are not the same. */
    fun toValueMap(map: ReadableMap?): Map<String, Any?>? {
        if (map == null) return null
        val out = mutableMapOf<String, Any?>()
        val it = map.keySetIterator()
        while (it.hasNextKey()) {
            val key = it.nextKey()
            out[key] = when (map.getType(key)) {
                ReadableType.Null -> null
                ReadableType.Boolean -> map.getBoolean(key)
                ReadableType.Number -> map.getDouble(key)
                ReadableType.String -> map.getString(key)
                ReadableType.Map -> toValueMap(map.getMap(key))
                ReadableType.Array -> toValueList(map.getArray(key))
            }
        }
        return out
    }

    fun toValueList(array: ReadableArray?): List<Any?> {
        if (array == null) return emptyList()
        return (0 until array.size()).map { i ->
            when (array.getType(i)) {
                ReadableType.Null -> null
                ReadableType.Boolean -> array.getBoolean(i)
                ReadableType.Number -> array.getDouble(i)
                ReadableType.String -> array.getString(i)
                ReadableType.Map -> toValueMap(array.getMap(i))
                ReadableType.Array -> toValueList(array.getArray(i))
            }
        }
    }

    /**
     * JS → the native `track`/`identify` signature, which is `Map<String, Any>?` — it cannot hold a
     * Kotlin `null` at all. iOS's `[String: Any]` holds `NSNull`, so `track('e', {referrer: null})`
     * kept the key on iOS and would drop it here.
     *
     * `JSONObject.NULL` IS an `Any`, and `EventSchema.kt:123`'s `JSONObject(properties)` serializes
     * it to a real JSON `null`. So the key survives, with the same meaning on both platforms.
     * (The old code's `mapValues { it.value as Any }` simply NPE'd instead.)
     */
    fun toPropertyMap(map: ReadableMap?): Map<String, Any>? {
        val values = toValueMap(map) ?: return null
        return values.mapValues { (_, value) -> denullify(value) }
    }

    private fun denullify(value: Any?): Any = when (value) {
        null -> JSONObject.NULL
        is Map<*, *> -> value.entries.associate { (k, v) -> k.toString() to denullify(v) }
        is List<*> -> value.map { denullify(it) }
        else -> value
    }

    fun toStringList(array: ReadableArray?): List<String> {
        if (array == null) return emptyList()
        return (0 until array.size()).mapNotNull { array.getString(it) }
    }

    /** Kotlin → JS. Throws on a type it cannot represent, rather than stringifying it. */
    fun toWritableMap(map: Map<String, Any?>): WritableMap {
        val out = Arguments.createMap()
        for ((key, value) in map) putValue(out, key, value)
        return out
    }

    fun toWritableArray(list: List<Any?>): WritableArray {
        val out = Arguments.createArray()
        for (value in list) pushValue(out, value)
        return out
    }

    private fun putValue(target: WritableMap, key: String, value: Any?) {
        when (value) {
            null -> target.putNull(key)
            is Boolean -> target.putBoolean(key, value)
            is Int -> target.putInt(key, value)
            is Long -> target.putDouble(key, value.toDouble()) // JS has no 64-bit int
            is Float -> target.putDouble(key, value.toDouble())
            is Double -> target.putDouble(key, value)
            is String -> target.putString(key, value)
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                target.putMap(key, toWritableMap(value as Map<String, Any?>))
            }
            is List<*> -> target.putArray(key, toWritableArray(value))
            is Array<*> -> target.putArray(key, toWritableArray(value.toList()))
            else -> throw IllegalArgumentException(
                "AppDNA: cannot bridge value of type ${value::class.java.name} at key '$key'. " +
                    "Stringifying it would silently corrupt the data — fix the mapper instead.",
            )
        }
    }

    private fun pushValue(target: WritableArray, value: Any?) {
        when (value) {
            null -> target.pushNull()
            is Boolean -> target.pushBoolean(value)
            is Int -> target.pushInt(value)
            is Long -> target.pushDouble(value.toDouble())
            is Float -> target.pushDouble(value.toDouble())
            is Double -> target.pushDouble(value)
            is String -> target.pushString(value)
            is Map<*, *> -> {
                @Suppress("UNCHECKED_CAST")
                target.pushMap(toWritableMap(value as Map<String, Any?>))
            }
            is List<*> -> target.pushArray(toWritableArray(value))
            is Array<*> -> target.pushArray(toWritableArray(value.toList()))
            else -> throw IllegalArgumentException(
                "AppDNA: cannot bridge array element of type ${value::class.java.name}.",
            )
        }
    }

    /**
     * E2 — encode a value of unknown shape (bool | number | string | array | object | null) as JSON.
     * There is no codegen type for "any JSON value", and this is the only encoding whose meaning is
     * identical on both platforms.
     */
    fun toJson(value: Any?): String = when (value) {
        null -> "null"
        is Map<*, *> -> JSONObject(value.mapKeys { it.key.toString() }).toString()
        is List<*> -> JSONArray(value).toString()
        is Array<*> -> JSONArray(value.toList()).toString()
        is String -> JSONObject.quote(value)
        is Boolean, is Number -> value.toString()
        else -> JSONObject.quote(value.toString())
    }
}
