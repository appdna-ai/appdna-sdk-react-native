package com.appdna.rn

import ai.appdna.sdk.BillingProvider
import com.facebook.react.bridge.JavaOnlyMap
import com.facebook.react.bridge.ReactApplicationContext
import org.junit.Assert.assertEquals
import org.junit.Test
import org.junit.runner.RunWith
import org.mockito.Mockito.mock
import org.robolectric.RobolectricTestRunner

/**
 * SPEC-070-B AC-11 — the native `parseOptions` mapping, on Android.
 *
 * A jest test mocks the native module, so it can observe neither the `?? 3600` config-TTL default
 * (E7 — the drift that made the wrappers fetch config 12× too often) nor the unconditional
 * `framework = "react_native"` tag (§7 rule 1 — the reason RN events land in BigQuery as `react_native`
 * and not `native`). Only a native unit test reaches them, which is why `parseOptions` is `internal`.
 *
 * Robolectric because `parseOptions` builds an `AppDNAOptions` from a `ReadableMap`, and `JavaOnlyMap`
 * plus the SDK's `BillingProvider.fromWire` want a real (not stubbed) runtime.
 */
@RunWith(RobolectricTestRunner::class)
class AppdnaParseOptionsTest {

    // ReactApplicationContext is abstract since RN 0.76; AppdnaModule never touches it at
    // construction (its init only allocates a CoroutineScope), so a mock reaches parseOptions.
    private val module = AppdnaModule(mock(ReactApplicationContext::class.java))

    @Test
    fun `framework is react_native regardless of input`() {
        // Omitted entirely.
        assertEquals("react_native", module.parseOptions(JavaOnlyMap()).framework)
        // A host trying to spoof it as "native" cannot: the tag is injected, never read from input.
        val spoof = JavaOnlyMap().apply { putString("framework", "native") }
        assertEquals("react_native", module.parseOptions(spoof).framework)
    }

    @Test
    fun `configTTL defaults to the native 3600, not a wrapper literal`() {
        // The bug this guards: a `?? 300` in the wrapper drifted 12× off the native default. When the
        // host says nothing, the value MUST come from AppDNAOptions() — 3600 — not a hardcoded number.
        assertEquals(3600L, module.parseOptions(JavaOnlyMap()).configTTL)
    }

    @Test
    fun `configTTL is honored when the host provides one`() {
        val opts = JavaOnlyMap().apply { putDouble("configTTL", 900.0) }
        assertEquals(900L, module.parseOptions(opts).configTTL)
    }

    @Test
    fun `billingProvider decodes the adapty tagged map with its apiKey (AC-21)`() {
        val opts = JavaOnlyMap().apply {
            putMap("billingProvider", JavaOnlyMap().apply {
                putString("type", "adapty")
                putString("apiKey", "public_live_abc")
            })
        }
        assertEquals(BillingProvider.Adapty("public_live_abc"), module.parseOptions(opts).billingProvider)
    }

    @Test
    fun `billingProvider decodes a bare revenueCat string`() {
        val opts = JavaOnlyMap().apply { putString("billingProvider", "revenueCat") }
        assertEquals(BillingProvider.RevenueCat, module.parseOptions(opts).billingProvider)
    }

    @Test
    fun `frameworkVersion is passed through`() {
        val opts = JavaOnlyMap().apply { putString("frameworkVersion", "0.76.5") }
        assertEquals("0.76.5", module.parseOptions(opts).frameworkVersion)
    }
}
