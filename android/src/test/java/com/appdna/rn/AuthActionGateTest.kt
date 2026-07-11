package com.appdna.rn

import ai.appdna.sdk.onboarding.StepAdvanceResult
import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * 🔴 React Native advanced past a credential step without authenticating anyone.
 *
 * Native gates its AUTH actions (`email_login`, `login`, `request_otp`, …) on DELEGATE PRESENCE: no
 * delegate means nobody can sign the user in, so it stays on the step and shows an error. But this
 * wrapper always attaches a delegate at `configure()` — it must, because native starts emitting during
 * configure — so `delegate != nil` is permanently true for every RN app and the native gate is
 * unreachable. A JS host that registered no `onBeforeStepAdvance` (the default!) then got native's
 * fallback: `.proceed`.
 *
 * The result: tap "Continue with email", and the flow walks you to the next step. No authentication
 * happened. Native, in the identical situation, stays put.
 *
 * Delegate-presence is a proxy for "will someone actually handle this". For a wrapper the proxy lies,
 * so the wrapper asks JS the real question instead: the dispatcher answers `{"__appdna_unhandled":true}`
 * when no handler is registered, which is different from "handler ran and had no opinion".
 */
class AuthActionGateTest {

    /**
     * A forwarder whose "JS side" answers with `replyJson` — driven through the REAL invoker and the
     * REAL pending-callback map, so the test exercises the wire, not a stub of it.
     */
    private fun forwarder(replyJson: String): OnboardingForwarder {
        lateinit var invoker: AppdnaVetoInvoker
        invoker = AppdnaVetoInvoker(2_000L) { payload ->
            // This is what the JS dispatcher does: look at the hook, answer the callbackId.
            AppdnaHostCallbacks.respond(payload["callbackId"] as String, replyJson)
        }
        return OnboardingForwarder(AppdnaEventEmitter { _, _ -> }, invoker)
    }

    private fun advance(replyJson: String, action: String?): StepAdvanceResult = runBlocking {
        forwarder(replyJson).onBeforeStepAdvance(
            flowId = "f1",
            fromStepId = "s_email",
            stepIndex = 3,
            stepType = "form",
            responses = emptyMap(),
            stepData = action?.let { mapOf<String, Any>("action" to it) },
        )
    }

    /** Exactly what the JS dispatcher sends when the host registered no handler for the hook. */
    private val unhandled = """{"__appdna_unhandled":true}"""

    @Test
    fun `an auth action with no JS handler BLOCKS instead of advancing unauthenticated`() {
        val result = advance(unhandled, "email_login")
        assertTrue(
            "RN advanced past a credential step with nobody authenticating the user",
            result is StepAdvanceResult.Block,
        )
        assertEquals(AUTH_UNAVAILABLE_MESSAGE, (result as StepAdvanceResult.Block).message)
    }

    @Test
    fun `a NON-auth action with no JS handler still proceeds — the default must not change`() {
        // Blocking every step when the host registered no delegate would break the common integration.
        assertTrue(advance(unhandled, null) is StepAdvanceResult.Proceed)
        assertTrue(advance(unhandled, "next") is StepAdvanceResult.Proceed)
    }

    @Test
    fun `an auth action WITH a JS handler obeys the host — it is not overridden`() {
        // The host looked at it and said proceed. That is an answer, and it is the host's to make.
        assertTrue(advance("""{"type":"proceed"}""", "email_login") is StepAdvanceResult.Proceed)

        val blocked = advance("""{"type":"block","message":"Bad password"}""", "email_login")
        assertEquals("Bad password", (blocked as StepAdvanceResult.Block).message)
    }
}
