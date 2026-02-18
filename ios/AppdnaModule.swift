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
        return ["onWebEntitlementChanged"]
    }

    // MARK: - Core

    @objc func configure(_ apiKey: String, env: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        let environment: Environment = env == "staging" ? .staging : .production
        AppDNA.configure(apiKey: apiKey, environment: environment)

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
            AppDNA.presentPaywall(id: id, from: topVC)
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
        if let tokenData = token.data(using: .utf8) {
            AppDNA.setPushToken(tokenData)
        }
        resolve(nil)
    }

    @objc func setPushPermission(_ granted: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setPushPermission(granted: granted)
        resolve(nil)
    }

    // MARK: - Privacy

    @objc func setConsent(_ analytics: Bool, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
        AppDNA.setConsent(analytics: analytics)
        resolve(nil)
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
}
