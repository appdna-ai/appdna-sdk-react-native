import Foundation
import AppDNASDK

/// SPEC-070-B P1 — DTO → bridge-safe dictionary mappers.
///
/// The old shim called `.toMap()` on `TransactionInfo`, `ProductInfo` and `Entitlement`. None of
/// them has such a method — only `WebEntitlement` and `DeferredDeepLink` do. Those calls could
/// never have compiled, and nothing in RN's CI (`npm install` + `tsc`) would ever have said so.
///
/// ## The reconciled wire shape (N11, N-row ruling)
///
/// The two natives disagree, and neither is a superset:
///   - iOS `Entitlement`   = `{identifier, isActive, expiresAt: Date?, productId}`
///   - Android `Entitlement` = `{productId, store, status, expiresAt: String?, isTrial, offerType}`
///
/// Ruling: **union, with the platform-specific fields omitted rather than faked.** A key that is
/// absent means "this platform does not know it"; it never means `false` or `""`. `isActive` is
/// synthesised on Android from `status`, because a host asking "does this user have access" must
/// not have to know the Play status vocabulary.
///
/// Dates cross as **ISO-8601 strings**, not epoch numbers: Android already stores them as ISO
/// strings, iOS as `Date`, and a string round-trips losslessly through the bridge's number coercion
/// (`ReadableMap.toHashMap()` turns every JS number into a Double — see E9.4).
enum AppdnaMappers {

    private static let iso: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    static func map(_ tx: TransactionInfo) -> [String: Any] {
        [
            "transactionId": tx.transactionId,
            "productId": tx.productId,
            // Cross-platform-consistent: emit epoch-millis as a String. Android's
            // `TransactionInfo.purchaseDate` is already epoch-millis (Play `purchaseTime`); iOS's is a
            // Date. Matching Flutter (SPEC-070-C MED-2). Previously iOS emitted ISO-8601 while Android
            // emitted epoch-millis, so a host doing `new Date(tx.purchaseDate)` got a valid date on iOS
            // and `Invalid Date` on Android.
            "purchaseDate": String(Int64((tx.purchaseDate.timeIntervalSince1970 * 1000).rounded())),
            "environment": tx.environment,
        ]
    }

    static func map(_ entitlement: Entitlement) -> [String: Any] {
        var out: [String: Any] = [
            "identifier": entitlement.identifier,
            "productId": entitlement.productId,
            "isActive": entitlement.isActive,
        ]
        // Omit rather than send NSNull: absent means "no expiry", and a nil-valued key would be
        // indistinguishable from an explicit null in the JS facade.
        if let expiresAt = entitlement.expiresAt {
            out["expiresAt"] = iso.string(from: expiresAt)
        }
        // `store`, `status`, `isTrial` and `offerType` are Android-only — iOS's Entitlement does not
        // carry them, and `getEntitlements()` hardcodes `isActive: true, expiresAt: nil` besides.
        return out
    }

    static func map(_ product: ProductInfo) -> [String: Any] {
        var out: [String: Any] = [
            "id": product.id,
            "name": product.displayName,
            "description": product.description,
            "displayPrice": product.displayPrice,
            "isSubscription": product.subscription != nil,
        ]
        // Android reports `priceMicros: Long`. `Decimal` is not bridge-legal, so convert through the
        // same integer-micros representation instead of shipping a lossy Double.
        let micros = NSDecimalNumber(decimal: product.price * 1_000_000).int64Value
        out["priceMicros"] = micros
        // `currencyCode` is Android-only: iOS's ProductInfo does not expose it (N-row §4).
        return out
    }

    /// The push payload the SDK parsed. `action` is flattened to `action_type` / `action_value` so
    /// the facade's `PushPayload` type matches the snake_case shape the console publishes and the
    /// other three SDKs already expose.
    static func map(_ payload: PushPayload) -> [String: Any] {
        var out: [String: Any] = [
            "push_id": payload.pushId,
            "title": payload.title,
            "body": payload.body,
        ]
        if let imageUrl = payload.imageUrl { out["image_url"] = imageUrl }
        if let data = payload.data { out["data"] = data }
        if let action = payload.action {
            out["action_type"] = action.type
            out["action_value"] = action.value
        }
        // The registered action BUTTONS. Native has always sent these; the wrapper used to drop the
        // whole list, so a host that got an `actionId` on tap could not look up the button.
        if !payload.actions.isEmpty {
            out["actions"] = payload.actions.map { a -> [String: Any] in
                [
                    "id": a.id ?? "",
                    "label": a.label ?? "",
                    "action_type": a.type,
                    "action_value": a.value,
                ]
            }
        }
        return out
    }

    /// `{questionId, answer}`. `answer` is `Any` natively — a string, a number, a bool or a list —
    /// and crosses as-is; a type the bridge cannot represent is a mapper bug, not a runtime state.
    static func map(_ response: SurveyResponse) -> [String: Any] {
        ["questionId": response.questionId, "answer": response.answer]
    }

    /**
     * `SectionAction` → a `{type, …}` map, byte-identical to Android's `SectionAction.toActionMap`.
     * A host that writes an `onScreenAction` veto reads the same `action.type` on both platforms.
     *
     * ⚠ Asymmetry, recorded rather than hidden: iOS's `AppDNA.asyncOnScreenAction` hands the wrapper a
     * `SectionAction`, Android's hands it an already-encoded `Map`. The SDKs disagree; the wire does
     * not.
     */
    static func map(_ action: SectionAction) -> [String: Any] {
        switch action {
        case .next: return ["type": "next"]
        case .back: return ["type": "back"]
        case .dismiss: return ["type": "dismiss"]
        case .navigate(let screenId): return ["type": "navigate", "screenId": screenId]
        case .openURL(let url): return ["type": "openURL", "url": url]
        case .openWebview(let url): return ["type": "openWebview", "url": url]
        case .openAppSettings: return ["type": "openAppSettings"]
        case .share(let text): return ["type": "share", "text": text]
        case .deepLink(let url): return ["type": "deepLink", "url": url]
        case .showPaywall(let id): return compact(["type": "showPaywall", "id": id])
        case .showSurvey(let id): return compact(["type": "showSurvey", "id": id])
        case .showScreen(let id): return ["type": "showScreen", "id": id]
        case .submitForm(let data): return ["type": "submitForm", "data": data]
        case .track(let event, let properties): return compact(["type": "track", "event": event, "properties": properties])
        case .haptic(let type): return ["type": "haptic", "hapticType": type]
        case .custom(let type, let value): return compact(["type": "custom", "customType": type, "value": value])
        // Flow-level verbs. Discriminators + field names are Android's `toActionMap`
        // (`screens/SectionContext.kt:94-103`) verbatim — the wire must not fork per platform.
        case .restart: return ["type": "restart"]
        case .complete: return ["type": "complete"]
        case .setResponse(let key, let value): return compact(["type": "setResponse", "key": key, "value": value])
        case .presentPaywall(let id): return compact(["type": "presentPaywall", "id": id])
        case .dismissPaywall: return ["type": "dismissPaywall"]
        case .showMessage(let id): return compact(["type": "showMessage", "id": id])
        case .setUserProperty(let key, let value): return compact(["type": "setUserProperty", "key": key, "value": value])
        case .purchase(let productId): return ["type": "purchase", "productId": productId]
        case .restore: return ["type": "restore"]
        }
    }

    /// Drop nil values rather than bridging `NSNull`: an absent key is what the other platform sends.
    private static func compact(_ dict: [String: Any?]) -> [String: Any] {
        dict.compactMapValues { $0 }
    }
    /**
     * P8 — the 9th delegate's result payloads.
     *
     * The keys are Android's, EXACTLY: `screen_id`/`last_action`/`duration_ms` (snake_case), not the
     * Swift property names. iOS hands the delegate a typed `ScreenResult` while Android hands it an
     * already-encoded map, so without this the same dismissal would reach a JS host as `screenId` on
     * one platform and `screen_id` on the other — a host would have to branch on Platform.OS to read
     * its own result. The SDKs disagree about the type; the WIRE must not.
     */
    static func map(_ result: ScreenResult) -> [String: Any] {
        var out: [String: Any] = [
            "screen_id": result.screenId,
            "dismissed": result.dismissed,
            "responses": result.responses,
            // Android's `ScreenManager.fireOnScreenDismissed` puts `last_action` into the map
            // UNCONDITIONALLY, `null` included, so the key is always present there. Compacting it away
            // here made the same dismissal read `undefined` on iOS and `null` on Android — and
            // `if (result.last_action === null)` is the check a host actually writes.
            "last_action": result.lastAction ?? NSNull(),
            "duration_ms": result.duration_ms,
        ]
        // `error`, by contrast, Android OMITS when there is none (`result.error?.let { … }`). So this
        // one stays omitted: the rule is "match the other platform", not "be uniform with ourselves".
        if let error = result.error { out["error"] = wireName(error) }
        return out
    }

    static func map(_ result: FlowResult) -> [String: Any] {
        var out: [String: Any] = [
            "flow_id": result.flowId,
            "completed": result.completed,
            "last_screen_id": result.lastScreenId,
            "responses": result.responses,
            "screens_viewed": result.screensViewed,
            "duration_ms": result.duration_ms,
        ]
        if let error = result.error { out["error"] = wireName(error) }
        return out
    }

    /**
     * 🔴 `ScreenError` → the wire string, and it is ANDROID'S enum name, not Swift's case name.
     *
     * This used to be `String(describing:)`, which yields `"screenNotFound"`. Android sends
     * `it.name` — `"SCREEN_NOT_FOUND"`. Same failure, same key, two VALUES, in the mapper whose own
     * comment says "the SDKs disagree about the type; the WIRE must not". A host comparing
     * `result.error === 'SCREEN_NOT_FOUND'` was right on one platform and wrong on the other, and
     * nothing failed loudly enough to say so.
     *
     * Android's spelling wins because Android's spelling is what already reaches JS: its core hands
     * the delegate an already-encoded map, so changing it would move a wire the SDK does not own here.
     * This switch is EXHAUSTIVE on purpose — a new `ScreenError` case fails to compile until someone
     * names it, rather than silently reaching JS in the wrong dialect.
     */
    private static func wireName(_ error: ScreenError) -> String {
        switch error {
        case .configFetchFailed: return "CONFIG_FETCH_FAILED"
        case .configFetchTimeout: return "CONFIG_FETCH_TIMEOUT"
        case .screenNotFound: return "SCREEN_NOT_FOUND"
        case .configParseError: return "CONFIG_PARSE_ERROR"
        case .configInvalid: return "CONFIG_INVALID"
        case .nestingDepthExceeded: return "NESTING_DEPTH_EXCEEDED"
        }
    }

    /// P8 — the onboarding location field's structured answer. Keys match Android's exactly (both
    /// natives already declare them in snake_case), so the two wires agree without translation.
    static func map(_ loc: LocationData) -> [String: Any] {
        compact([
            "formatted_address": loc.formatted_address,
            "city": loc.city,
            "state": loc.state,
            "state_code": loc.state_code,
            "country": loc.country,
            "country_code": loc.country_code,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "timezone": loc.timezone,
            "timezone_offset": loc.timezone_offset,
            "postal_code": loc.postal_code,
            "raw_query": loc.raw_query,
        ])
    }

}
