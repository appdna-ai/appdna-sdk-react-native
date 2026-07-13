import XCTest
import AppDNASDK
@testable import appdna_sdk_react_native

/// 🔴 `onScreenDismissed` / `onFlowCompleted` — the KEYS matched, the VALUES forked.
///
/// iOS's mapper used `String(describing: error)`, which yields Swift's case name: `"screenNotFound"`.
/// Android's `ScreenManager` uses `it.name`, which yields the Kotlin enum name: `"SCREEN_NOT_FOUND"`.
/// Same failure, same key, two dialects — in the mapper whose own comment says "the SDKs disagree about
/// the type; the WIRE must not". A host comparing `result.error === 'SCREEN_NOT_FOUND'` was correct on
/// one platform and quietly wrong on the other.
///
/// Android's spelling wins because Android's spelling is already what reaches JS: its core hands the
/// delegate an ALREADY-ENCODED map, so changing it would move a wire this wrapper does not own.
///
/// The second fork is subtler and reaches every dismissal, not just the failing ones: Android puts
/// `last_action` into the map unconditionally — `null` included — while `compact` here dropped the key.
/// So `result.last_action` was `null` on Android and `undefined` on iOS, and `=== null` is the check a
/// host writes.
final class AppdnaScreenResultWireTests: XCTestCase {

    func testScreenErrorCrossesInAndroidsDialect() {
        let result = ScreenResult(
            screenId: "scr_1",
            dismissed: true,
            responses: [:],
            duration_ms: 120,
            error: .screenNotFound
        )

        let wire = AppdnaMappers.map(result)

        // NOT "screenNotFound". That is Swift's case name, and no Android host has ever seen it.
        XCTAssertEqual(wire["error"] as? String, "SCREEN_NOT_FOUND")
        XCTAssertEqual(wire["screen_id"] as? String, "scr_1")
        XCTAssertEqual(wire["duration_ms"] as? Int, 120)
    }

    func testEveryScreenErrorHasAnAndroidName() {
        let expected: [ScreenError: String] = [
            .configFetchFailed: "CONFIG_FETCH_FAILED",
            .configFetchTimeout: "CONFIG_FETCH_TIMEOUT",
            .screenNotFound: "SCREEN_NOT_FOUND",
            .configParseError: "CONFIG_PARSE_ERROR",
            .configInvalid: "CONFIG_INVALID",
            .nestingDepthExceeded: "NESTING_DEPTH_EXCEEDED",
        ]
        for (error, name) in expected {
            let wire = AppdnaMappers.map(ScreenResult(screenId: "s", error: error))
            XCTAssertEqual(wire["error"] as? String, name, "\(error) crosses in the wrong dialect")
        }
    }

    func testFlowErrorUsesTheSameDialect() {
        let wire = AppdnaMappers.map(FlowResult(flowId: "f1", completed: false, error: .configInvalid))

        XCTAssertEqual(wire["error"] as? String, "CONFIG_INVALID")
        XCTAssertEqual(wire["flow_id"] as? String, "f1")
    }

    /// A dismissal with NO error omits the key — because Android omits it (`result.error?.let { … }`).
    /// The rule is "match the other platform", not "be internally uniform".
    func testNoErrorMeansNoKey() {
        let wire = AppdnaMappers.map(ScreenResult(screenId: "s", dismissed: true))

        XCTAssertNil(wire["error"])
    }

    /// …but `last_action` is ALWAYS present, `null` included, because Android always sends it.
    func testLastActionIsPresentAsNullRatherThanOmitted() {
        let dismissedWithNoAction = AppdnaMappers.map(ScreenResult(screenId: "s", dismissed: true))
        XCTAssertTrue(dismissedWithNoAction["last_action"] is NSNull, "`last_action` was OMITTED — Android sends null")

        let dismissedByAction = AppdnaMappers.map(
            ScreenResult(screenId: "s", dismissed: true, lastAction: "cta_tapped")
        )
        XCTAssertEqual(dismissedByAction["last_action"] as? String, "cta_tapped")
    }
}
