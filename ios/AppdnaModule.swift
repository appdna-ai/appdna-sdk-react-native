import Foundation
import AppDNASDK

@objc(AppdnaModule)
class AppdnaModule: RCTEventEmitter {

    override init() {
        super.init()
    }

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String] {
        return ["onWebEntitlementChanged", "onEntitlementsChanged"]
    }

    // MARK: - Core

    @objc func configure(_ apiKey: String, env: String, options: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let environment: Environment = env == "staging" ? .staging : .production
        let opts = parseOptions(options as? [String: Any])
        AppDNA.configure(apiKey: apiKey, environment: environment, options: opts)

        // Register web entitlement listener
        AppDNA.onWebEntitlementChanged { [weak self] entitlement in
            self?.sendEvent(withName: "onWebEntitlementChanged", body: entitlement?.toMap())
        }

        resolve(nil)
    }

    @objc func identify(_ userId: String, traits: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.identify(userId: userId, traits: traits as? [String: Any])
        resolve(nil)
    }

    @objc func reset(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.reset()
        resolve(nil)
    }

    @objc func track(_ event: String, properties: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.track(event: event, properties: properties as? [String: Any])
        resolve(nil)
    }

    @objc func flush(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.flush()
        resolve(nil)
    }

    // MARK: - Paywalls & Onboarding

    @objc func presentPaywall(_ id: String, context: NSDictionary?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        DispatchQueue.main.async {
            guard let scene = UIApplication.shared.connectedScenes
                .compactMap({ $0 as? UIWindowScene }).first,
                  let rootVC = scene.windows.first(where: { $0.isKeyWindow })?.rootViewController else {
                resolve(nil)
                return
            }
            var topVC = rootVC
            while let presented = topVC.presentedViewController { topVC = presented }
            let paywallContext = self.parsePaywallContext(context as? [String: Any])
            AppDNA.presentPaywall(id: id, from: topVC, context: paywallContext)
            resolve(nil)
        }
    }

    @objc func presentOnboarding(_ flowId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.presentOnboarding(flowId: flowId)
        resolve(nil)
    }

    // MARK: - Remote Config & Experiments

    @objc func getRemoteConfig(_ key: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.getRemoteConfig(key: key))
    }

    @objc func isFeatureEnabled(_ flag: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.isFeatureEnabled(flag: flag))
    }

    @objc func getExperimentVariant(_ experimentId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.getExperimentVariant(experimentId: experimentId))
    }

    @objc func isInVariant(_ experimentId: String, variantId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.isInVariant(experimentId: experimentId, variantId: variantId))
    }

    @objc func getExperimentConfig(_ experimentId: String, key: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.getExperimentConfig(experimentId: experimentId, key: key))
    }

    // MARK: - Push

    @objc func setPushToken(_ token: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let tokenData = hexStringToData(token) {
            AppDNA.setPushToken(tokenData)
        }
        resolve(nil)
    }

    @objc func setPushPermission(_ granted: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setPushPermission(granted: granted)
        resolve(nil)
    }

    @objc func trackPushDelivered(_ pushId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.trackPushDelivered(pushId: pushId)
        resolve(nil)
    }

    @objc func trackPushTapped(_ pushId: String, action: NSString?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.trackPushTapped(pushId: pushId, action: action as String?)
        resolve(nil)
    }

    // MARK: - Privacy

    @objc func setConsent(_ analytics: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setConsent(analytics: analytics)
        resolve(nil)
    }

    // MARK: - Ready

    @objc func onReady(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.onReady {
            resolve(nil)
        }
    }

    // MARK: - v0.3: Web Entitlements

    @objc func getWebEntitlement(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        if let entitlement = AppDNA.webEntitlement {
            resolve(entitlement.toMap())
        } else {
            resolve(nil)
        }
    }

    // MARK: - v0.3: Deferred Deep Links

    @objc func checkDeferredDeepLink(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.checkDeferredDeepLink { deepLink in
            if let deepLink = deepLink {
                resolve(deepLink.toMap())
            } else {
                resolve(nil)
            }
        }
    }

    // MARK: - Lifecycle

    @objc func shutdown(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        // iOS SDK does not expose a shutdown method; resolve immediately.
        resolve(nil)
    }

    @objc func getSdkVersion(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        resolve(AppDNA.sdkVersion)
    }

    // MARK: - Billing

    @objc func purchase(_ productId: String, offerToken: NSString?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let result = try await AppDNA.billing.purchase(productId: productId, offerToken: offerToken as String?)
                resolve(result.toMap())
            } catch {
                reject("PURCHASE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc func restorePurchases(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        Task {
            do {
                let entitlements = try await AppDNA.billing.restorePurchases()
                resolve(entitlements.map { $0.toMap() })
            } catch {
                reject("RESTORE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc func getProducts(_ productIds: NSArray, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let ids = productIds.compactMap { $0 as? String }
        Task {
            do {
                let products = try await AppDNA.billing.getProducts(productIds: ids)
                resolve(products.map { $0.toMap() })
            } catch {
                reject("PRODUCTS_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc func hasActiveSubscription(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        Task {
            let hasActive = await AppDNA.billing.hasActiveSubscription()
            resolve(hasActive)
        }
    }

    @objc func startEntitlementObserver(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.billing.onEntitlementsChanged { [weak self] entitlements in
            let maps = entitlements.map { $0.toMap() }
            self?.sendEvent(withName: "onEntitlementsChanged", body: maps)
        }
        resolve(nil)
    }

    // MARK: - Helpers

    private func hexStringToData(_ hex: String) -> Data? {
        let len = hex.count
        guard len % 2 == 0 else { return nil }
        var data = Data()
        var index = hex.startIndex
        while index < hex.endIndex {
            let nextIndex = hex.index(index, offsetBy: 2)
            if let byte = UInt8(hex[index..<nextIndex], radix: 16) {
                data.append(byte)
            } else {
                return nil
            }
            index = nextIndex
        }
        return data
    }

    private func parseOptions(_ dict: [String: Any]?) -> AppDNAOptions {
        guard let dict = dict else { return AppDNAOptions() }
        let logLevelStr = dict["logLevel"] as? String ?? "warning"
        let logLevel: LogLevel
        switch logLevelStr {
        case "none": logLevel = .none
        case "error": logLevel = .error
        case "warning": logLevel = .warning
        case "info": logLevel = .info
        case "debug": logLevel = .debug
        default: logLevel = .warning
        }

        let billingProviderStr = dict["billingProvider"] as? String
        let billingProvider: BillingProvider
        switch billingProviderStr {
        case "revenueCat": billingProvider = .revenueCat
        case "storeKit2": billingProvider = .storeKit2
        case "none": billingProvider = .none
        default: billingProvider = .storeKit2
        }

        return AppDNAOptions(
            flushInterval: dict["flushInterval"] as? TimeInterval ?? 30,
            batchSize: dict["batchSize"] as? Int ?? 20,
            configTTL: dict["configTTL"] as? TimeInterval ?? 300,
            logLevel: logLevel,
            billingProvider: billingProvider
        )
    }

    private func parsePaywallContext(_ dict: [String: Any]?) -> PaywallContext? {
        guard let dict = dict, let placement = dict["placement"] as? String else { return nil }
        return PaywallContext(
            placement: placement,
            experiment: dict["experiment"] as? String,
            variant: dict["variant"] as? String
        )
    }
}
