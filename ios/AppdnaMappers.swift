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
            "purchaseDate": iso.string(from: tx.purchaseDate),
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
}
