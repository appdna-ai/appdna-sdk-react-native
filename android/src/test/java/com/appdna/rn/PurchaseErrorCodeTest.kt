package com.appdna.rn

import ai.appdna.sdk.PurchaseCancelledException
import ai.appdna.sdk.PurchasePendingException
import ai.appdna.sdk.billing.BillingError
import ai.appdna.sdk.billing.billingErrorType
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * 🔴 `purchase()` rejected EVERYTHING as `PURCHASE_ERROR`.
 *
 * A user tapping Cancel, an ask-to-buy purchase awaiting a parent, a declined card, a dead network —
 * one code, and a LOCALIZED message as the only other signal. A host that wanted to do the thing every
 * store app does (say nothing on a cancel, offer a retry on a decline) had to regex English prose on a
 * device that might be in Japanese.
 *
 * The SDK has owned a stable discriminator the whole time — `billingErrorType`, already handed to
 * `onPaywallPurchaseFailed(errorType:)` and already written into the `purchase_failed` event. It was
 * `internal`, and the React Native wrapper is a SEPARATE GRADLE MODULE, so this module could not see
 * it. That is the entire reason the codes were blank.
 *
 * **This test file is the falsification.** It lives in `com.appdna.rn` — the wrapper's module — and
 * calls `billingErrorType` directly. Restore the `internal` keyword and this does not go red, it
 * FAILS TO COMPILE: "cannot access 'billingErrorType': it is internal in 'ai.appdna.sdk.billing'".
 * Which is exactly the wall `AppdnaModule.purchase` was standing behind.
 *
 * The strings are asserted verbatim because they ARE the wire: `AppdnaModule.purchase` passes them to
 * `promise.reject(code, …)` with no translation table, and iOS's `billingErrorType(_:)` returns the
 * same eight. A table is a thing that can fork; there is none.
 */
class PurchaseErrorCodeTest {

    @Test
    fun `every purchase failure carries the discriminator the JS host branches on`() {
        assertEquals("userCancelled", billingErrorType(BillingError.UserCancelled()))
        assertEquals("pending", billingErrorType(BillingError.Pending("pro_yearly")))
        assertEquals("productNotFound", billingErrorType(BillingError.ProductNotFound("pro_yearly")))
        assertEquals("verificationFailed", billingErrorType(BillingError.VerificationFailed()))
        assertEquals("networkError", billingErrorType(BillingError.NetworkError(java.io.IOException("offline"))))
        assertEquals("serverError", billingErrorType(BillingError.ServerError("500")))
        assertEquals("providerNotAvailable", billingErrorType(BillingError.ProviderNotAvailable("no RC")))
    }

    /** The suspend purchase surface throws its OWN exception types. They map onto the same vocabulary. */
    @Test
    fun `the exceptions the purchase path actually throws map onto the same vocabulary`() {
        assertEquals("userCancelled", billingErrorType(PurchaseCancelledException("pro_yearly")))
        assertEquals("pending", billingErrorType(PurchasePendingException("pro_yearly")))
    }

    /** An unrecognized failure is "unknown" — never force-fit into a category the host would act on. */
    @Test
    fun `an unrecognized failure is unknown, not miscategorised`() {
        assertEquals("unknown", billingErrorType(IllegalStateException("BillingClient not connected")))
    }

    /**
     * The closed set. A ninth code that only one platform emits is a `switch` a host cannot write —
     * and `AppDNAPurchaseErrorCode` in `src/billing.ts` is a union that would silently stop matching.
     */
    @Test
    fun `the vocabulary is closed and is the one the TS union declares`() {
        val produced = setOf(
            billingErrorType(BillingError.UserCancelled()),
            billingErrorType(BillingError.Pending("p")),
            billingErrorType(BillingError.ProductNotFound("p")),
            billingErrorType(BillingError.VerificationFailed()),
            billingErrorType(BillingError.NetworkError(java.io.IOException())),
            billingErrorType(BillingError.ServerError("x")),
            billingErrorType(BillingError.ProviderNotAvailable("x")),
            billingErrorType(RuntimeException("?")),
        )
        assertEquals(
            setOf(
                "userCancelled", "pending", "productNotFound", "verificationFailed",
                "networkError", "serverError", "providerNotAvailable", "unknown",
            ),
            produced,
        )
    }
}
