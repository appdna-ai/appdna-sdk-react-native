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

    /**
     * 🔴 EVERY auth action, not just the one that happened to be tested.
     *
     * This suite used to assert exactly one member — `email_login` — and it passed, because
     * `email_login` was in the set. `social_login` was NOT, on either wrapper, so "Continue with
     * Google" advanced the flow with nobody authenticated while this test sat green. A test that
     * exercises one member of a set proves that member, and nothing about the set.
     *
     * So the set itself is the subject now: every action the CORE requires a delegate for must block
     * here. `check:auth-action-parity` pins the set against the core (it did not exist when a comment
     * first claimed it did); this pins the BEHAVIOUR of every member of it.
     */
    @Test
    fun `EVERY auth action blocks with no JS handler — not just the one we happened to test`() {
        val required = listOf(
            "social_login",  // the one that was missing, and the reason this test exists
            "login", "register", "reset_password", "magic_link", "verify_email", "resend_verification",
            "enable_biometric", "email_login", "request_otp", "verify_otp", "logout", "change_password",
            "set_new_password", "delete_account", "update_profile",
        )
        assertEquals(
            "the action list drifted from the wrapper's own set — check:auth-action-parity pins it to the core",
            AUTH_ACTIONS, required.toSet(),
        )
        for (action in required) {
            val result = advance(unhandled, action)
            assertTrue(
                "'$action' ADVANCED with nobody authenticating the user",
                result is StepAdvanceResult.Block,
            )
        }
    }

    /**
     * 🔴 THE THREE WAYS A HOST WITH A HANDLER STILL FAILS TO ANSWER.
     *
     * The gate originally blocked only on `__appdna_unhandled` — "no handler registered". But JS
     * declines to decide in three other ways, and every one of them sends `"null"` ("no opinion,
     * apply your default"), which decoded to Proceed:
     *
     *   1. the handler THREW;
     *   2. its promise REJECTED — i.e. the host's own sign-in call failed (backend 500, no network);
     *   3. it exceeded `vetoTimeout` — i.e. a SLOW auth backend.
     *
     * So the fix that stopped a NO-handler host advancing past a credential step did nothing for the
     * far more common case: a host that DOES implement auth, whose auth is simply failing. Tap
     * "Continue with email", the sign-in errors, and the SDK walks the user into the app.
     *
     * A failing auth backend must not be an unlocked door.
     */
    @Test
    fun `a handler that DECLINES TO ANSWER blocks an auth action — throw, reject, timeout`() {
        // `"null"` is what the JS dispatcher sends for a thrown handler and a rejected promise, and
        // what native synthesises on veto timeout. All three arrive here identically.
        val noOpinion = "null"

        for (action in AUTH_ACTIONS) {
            val result = advance(noOpinion, action)
            assertTrue(
                "'$action' ADVANCED on a no-opinion reply — the host's auth call failed or timed " +
                    "out and the user was let through unauthenticated",
                result is StepAdvanceResult.Block,
            )
        }
    }

    @Test
    fun `a no-opinion reply on a NON-auth action still proceeds — the default must not change`() {
        // Blocking every step whenever a hook throws would turn one bad handler into a dead app.
        // Only the credential steps get the strict treatment.
        assertTrue(advance("null", null) is StepAdvanceResult.Proceed)
        assertTrue(advance("null", "next") is StepAdvanceResult.Proceed)
    }

    @Test
    fun `an auth action WITH a JS handler obeys the host — it is not overridden`() {
        // The host looked at it and said proceed. That is an answer, and it is the host's to make.
        assertTrue(advance("""{"type":"proceed"}""", "email_login") is StepAdvanceResult.Proceed)

        val blocked = advance("""{"type":"block","message":"Bad password"}""", "email_login")
        assertEquals("Bad password", (blocked as StepAdvanceResult.Block).message)
    }
}
