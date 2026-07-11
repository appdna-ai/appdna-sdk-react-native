import Foundation
import UIKit
import SwiftUI
import AppDNASDK

/**
 * SPEC-070-B P4 — the Swift half of the iOS ScreenSlot Fabric component.
 *
 * ## Why a Swift half exists
 *
 * The Fabric host view MUST be an ObjC++ `RCTViewComponentView` — that is where the C++
 * ComponentDescriptor, props and event emitter live. But the thing being embedded is
 * `AppDNAScreenSlot`, a SwiftUI `View`, which ObjC++ cannot name (SwiftUI types are not `@objc`). So
 * this `UIView` hosts the SwiftUI slot and exposes a plain `@objc` surface — `slotName` and an
 * `onContentSize` callback — that `AppdnaScreenSlotView.mm` drives. Same split as the TurboModule
 * adapter, for the same reason.
 *
 * ## The `UIHostingController` leak (reused from Flutter 070-C)
 *
 * A bare `UIHostingController` with no parent deallocates as soon as creation returns — its SwiftUI
 * `@State` and `.onAppear` never run and the slot renders nothing. It is therefore held strongly AND
 * attached as a child of the nearest ancestor view controller once in the window; on teardown it is
 * explicitly detached (`willMove(toParent: nil)` + `removeFromParent()`), or every mount/unmount
 * leaks one hosting controller for the app session.
 */
@objc(AppdnaScreenSlotHostView)
public final class AppdnaScreenSlotHostView: UIView {

    /// Called with (width, height) in points whenever the hosted content changes size. The ObjC++
    /// component view forwards this to the Fabric `onContentSizeChange` event emitter.
    @objc public var onContentSize: ((CGFloat, CGFloat) -> Void)?

    private var hostingController: UIHostingController<AppDNAScreenSlot>?
    private var slotName: String = ""
    private var lastReported: CGSize = .zero

    @objc public func setSlotName(_ name: String) {
        guard name != slotName else { return }
        slotName = name
        render()
    }

    private func render() {
        // Replace an existing host rather than stacking a second SwiftUI tree on a name change.
        teardownHost()

        let host = UIHostingController(rootView: AppDNAScreenSlot(slotName))
        host.view.backgroundColor = .clear
        host.view.translatesAutoresizingMaskIntoConstraints = false
        addSubview(host.view)
        NSLayoutConstraint.activate([
            host.view.leadingAnchor.constraint(equalTo: leadingAnchor),
            host.view.trailingAnchor.constraint(equalTo: trailingAnchor),
            host.view.topAnchor.constraint(equalTo: topAnchor),
            host.view.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])
        hostingController = host
        attachToParentIfNeeded()
    }

    public override func didMoveToWindow() {
        super.didMoveToWindow()
        if window != nil { attachToParentIfNeeded() }
    }

    private func attachToParentIfNeeded() {
        guard let host = hostingController, host.parent == nil, let parent = nearestViewController() else { return }
        parent.addChild(host)
        host.didMove(toParent: parent)
    }

    /// A Fabric view is sized by Yoga, which has no intrinsic height for this host. Report the SwiftUI
    /// content's fitting size so the JS facade can drive the height. Measured after layout, deduped.
    public override func layoutSubviews() {
        super.layoutSubviews()
        guard let host = hostingController else { return }
        let target = CGSize(width: bounds.width, height: UIView.layoutFittingCompressedSize.height)
        let fitting = host.view.systemLayoutSizeFitting(
            target,
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel,
        )
        if abs(fitting.height - lastReported.height) < 0.5, abs(fitting.width - lastReported.width) < 0.5 { return }
        lastReported = fitting
        onContentSize?(fitting.width, fitting.height)
    }

    /// Called from the ObjC++ view's `prepareForRecycle` / dealloc. Detaches the hosting controller so
    /// the long-lived parent VC's `children` array stops retaining it (and its SwiftUI state).
    @objc public func teardownHost() {
        if let host = hostingController {
            host.willMove(toParent: nil)
            host.view.removeFromSuperview()
            host.removeFromParent()
        }
        hostingController = nil
        lastReported = .zero
        // 🔴 `slotName` MUST be cleared too. Fabric RECYCLES component views: on unmount the view goes
        // into the recycle pool with its host torn down, and on the next mount the pooled instance is
        // handed back and `updateProps` calls `setSlotName` with the SAME name — whose `guard name !=
        // slotName` then early-returns, `render()` never runs, and the slot stays permanently blank.
        // Navigating away from a screen and back is enough to reproduce it.
        slotName = ""
    }

    private func nearestViewController() -> UIViewController? {
        var responder: UIResponder? = self.next
        while let current = responder {
            if let vc = current as? UIViewController { return vc }
            responder = current.next
        }
        return nil
    }
}
