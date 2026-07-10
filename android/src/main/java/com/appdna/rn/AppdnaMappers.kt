package com.appdna.rn

import ai.appdna.sdk.TransactionInfo
import ai.appdna.sdk.billing.Entitlement
import ai.appdna.sdk.billing.ProductInfo

/**
 * SPEC-070-B P1 — DTO → bridge-safe map mappers.
 *
 * The old shim called `.toMap()` on `List<String>` (from `restorePurchases()`) and on
 * `TransactionInfo`. Neither has such a method. Those calls could never have compiled, and RN's CI
 * — `npm install` + `tsc` — never compiles Kotlin, so nothing said so.
 *
 * ## The reconciled wire shape (N11)
 *
 * The two natives disagree, and neither is a superset:
 *   - iOS `Entitlement`     = `{identifier, isActive, expiresAt, productId}`
 *   - Android `Entitlement` = `{productId, store, status, expiresAt, isTrial, offerType}`
 *
 * Ruling: **union, with the platform-specific fields omitted rather than faked.** An absent key
 * means "this platform does not know it"; it never means `false` or `""`. `isActive` is synthesised
 * here from `status`, because a host asking "does this user have access" must not have to learn the
 * Play status vocabulary. `identifier` mirrors `productId`: Android has no separate identifier, and
 * inventing one would be worse than aliasing an honest value.
 *
 * Dates cross as ISO-8601 strings on both platforms — Android already stores them that way.
 */
internal object AppdnaMappers {

    /** Play statuses that mean the user currently has access. Mirrors `EntitlementCache`. */
    private val ACTIVE_STATUSES = setOf("active", "trialing", "grace_period")

    fun map(tx: TransactionInfo): Map<String, Any?> = mapOf(
        "transactionId" to tx.transactionId,
        "productId" to tx.productId,
        // Already an ISO-8601 string on Android; iOS formats its `Date` to the same shape.
        "purchaseDate" to tx.purchaseDate,
        "environment" to tx.environment,
    )

    fun map(entitlement: Entitlement): Map<String, Any?> = buildMap {
        put("identifier", entitlement.productId)
        put("productId", entitlement.productId)
        put("isActive", entitlement.status.lowercase() in ACTIVE_STATUSES)
        entitlement.expiresAt?.let { put("expiresAt", it) }
        // Android-only, and genuinely populated here (unlike iOS, whose getEntitlements() hardcodes
        // isActive=true / expiresAt=null). Present means real.
        put("store", entitlement.store)
        put("status", entitlement.status)
        put("isTrial", entitlement.isTrial)
        entitlement.offerType?.let { put("offerType", it) }
    }

    fun map(product: ProductInfo): Map<String, Any?> = buildMap {
        put("id", product.id)
        put("name", product.name)
        put("description", product.description)
        put("displayPrice", product.formattedPrice)
        put("priceMicros", product.priceMicros)
        // Android-only: iOS's ProductInfo exposes neither a currency code nor an offer token.
        put("currencyCode", product.currencyCode)
        product.offerToken?.let { put("offerToken", it) }
        // `isSubscription` is iOS-only: Play's ProductDetails does not surface it on this DTO, and
        // guessing from the product id would be a lie dressed as a field.
    }
}
