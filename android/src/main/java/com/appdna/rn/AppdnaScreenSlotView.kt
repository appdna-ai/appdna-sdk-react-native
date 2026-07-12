package com.appdna.rn

import ai.appdna.sdk.screens.AppDNAScreenSlot
import android.content.Context
import android.view.View
import android.widget.FrameLayout
import androidx.compose.ui.platform.ComposeView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.ViewModelStore
import androidx.lifecycle.ViewModelStoreOwner
import androidx.lifecycle.setViewTreeLifecycleOwner
import androidx.lifecycle.setViewTreeViewModelStoreOwner
import androidx.savedstate.SavedStateRegistry
import androidx.savedstate.SavedStateRegistryController
import androidx.savedstate.SavedStateRegistryOwner
import androidx.savedstate.setViewTreeSavedStateRegistryOwner
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher

/**
 * SPEC-070-B P4 — the Android host view for a server-driven AppDNA screen slot.
 *
 * A `FrameLayout` wrapping a `ComposeView` that renders the native `@Composable AppDNAScreenSlot`.
 * Height is not measured by Yoga (a Fabric host view has no intrinsic size without a C++ shadow
 * node — an ADR-001 violation), so this view measures its own content and reports it to JS through
 * `onContentSizeChange`; the `AppDNAScreenSlot` facade applies the height.
 *
 * ## The ViewTreeLifecycleOwner crash (reused from Flutter 070-C)
 *
 * `ComposeView.setContent {}` throws *"ViewTreeLifecycleOwner not found"* unless the view tree has a
 * `LifecycleOwner` + `SavedStateRegistryOwner` + `ViewModelStoreOwner`. A React Native host activity
 * is not guaranteed to provide them where this view is attached, so a plugin-owned owner is driven
 * to RESUMED and wired onto the ComposeView BEFORE `setContent`. Identical shim to
 * `AppDNAScreenSlotViewFactory.kt` in the Flutter plugin.
 */
class AppdnaScreenSlotView internal constructor(
    context: Context,
    /**
     * Test seam. `null` (the production path, and the only public constructor) builds the real
     * `ComposeView`. A unit test injects a `View` with a known intrinsic height instead, so the
     * measurement contract below can be asserted without standing up a Compose host.
     */
    injectedContent: View?,
) : FrameLayout(context) {

    constructor(context: Context) : this(context, null)

    private val lifecycleOwner = SlotViewTreeOwner()
    private var slotName: String = ""
    private var lastReportedWidth = -1
    private var lastReportedHeight = -1

    private val composeView: ComposeView? =
        if (injectedContent != null) {
            null
        } else {
            ComposeView(context).apply {
                lifecycleOwner.start()
                setViewTreeLifecycleOwner(lifecycleOwner)
                setViewTreeViewModelStoreOwner(lifecycleOwner)
                setViewTreeSavedStateRegistryOwner(lifecycleOwner)
            }
        }

    /** The single child whose CONTENT height is measured and reported. */
    private val contentView: View = composeView ?: injectedContent!!

    /**
     * Test seam for [emitContentSize]. When set, the measured size (in raw PIXELS) is handed here
     * instead of being dispatched through the Fabric `EventDispatcher` — which needs a `ReactContext`
     * and an initialised `DisplayMetricsHolder` that a unit test does not have.
     */
    internal var contentSizeReporter: ((widthPx: Int, heightPx: Int) -> Unit)? = null

    init {
        addView(contentView)
        renderSlot()
    }

    /** Set (or change) the slot name and re-render. Called by the ViewManager on the `name` prop. */
    fun setSlotName(name: String) {
        if (name == slotName) return
        slotName = name
        renderSlot()
    }

    private fun renderSlot() {
        composeView?.setContent {
            AppDNAScreenSlot(name = slotName)
        }
    }

    /**
     * Report the CONTENT's height to JS. Fabric will not lay this view out to its content, so the
     * facade sizes the Yoga node from what we send here. Deduped so a stable content does not spam the
     * bridge every frame.
     *
     * ## Why this must MEASURE and not read `contentView.height`
     *
     * It used to report `composeView.width/height` — the child's LAID-OUT size. That made the slot a
     * height fixed-point and it was permanently blank:
     *
     *  - `contentView` is a MATCH_PARENT child of this FrameLayout;
     *  - Fabric lays THIS view out to exactly the height Yoga computed, and Yoga computes it from the
     *    JS `height` style — which `AppDNAScreenSlot.tsx` sets to `measuredHeight ?? minHeight`, i.e.
     *    to whatever we last reported;
     *  - so `contentView.height == this.height == the height we last emitted`.
     *
     * Steady state: emit 0 → JS sets 0 → next layout measures 0 → emit 0, forever. With
     * `minHeight={120}` it reported 120 regardless of the content. The content's own size never
     * entered the loop.
     *
     * So the content is measured UNCONSTRAINED in the vertical axis, at the width actually available —
     * the same contract as iOS, which fits its SwiftUI content with `systemLayoutSizeFitting` at
     * `.required` horizontal / `.fittingSizeLevel` vertical priority
     * (`ios/AppdnaScreenSlotHostView.swift`).
     */
    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)

        System.err.println("PROBE onLayout changed=$changed l=$left t=$top r=$right b=$bottom")
        val availableWidth = right - left
        // Not laid out yet: an UNSPECIFIED-width probe would measure content against infinity and
        // report a height for a line length that will never exist on screen.
        if (availableWidth <= 0) return

        contentView.measure(
            MeasureSpec.makeMeasureSpec(availableWidth, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(0, MeasureSpec.UNSPECIFIED),
        )
        val contentHeight = contentView.measuredHeight

        // Restore the child's measured state to the bounds `super.onLayout` actually laid it out to.
        // The probe above is a query, not a resize; leaving it as the child's measured size would
        // publish the unconstrained height to anything that reads it before the next measure pass.
        contentView.measure(
            MeasureSpec.makeMeasureSpec(availableWidth, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(bottom - top, MeasureSpec.EXACTLY),
        )

        // Compose measures asynchronously: the first layout after `setContent` can land before the
        // first composition and measure 0. Emitting that 0 would collapse the slot to zero height for
        // a frame — the exact layout shift `minHeight` (W19) exists to prevent — so the pre-content 0
        // is swallowed and JS keeps its reserved height. Once a real height HAS been reported, a later
        // 0 is a genuine collapse (the slot published nothing) and is forwarded.
        if (contentHeight <= 0 && lastReportedHeight <= 0) return

        // Dedupe. Also what breaks the measure→emit→relayout cycle: JS applies the height we send,
        // this view is laid out again, the content still measures the same, and we go quiet.
        if (availableWidth == lastReportedWidth && contentHeight == lastReportedHeight) return
        lastReportedWidth = availableWidth
        lastReportedHeight = contentHeight
        emitContentSize(availableWidth, contentHeight)
    }

    private fun emitContentSize(widthPx: Int, heightPx: Int) {
        contentSizeReporter?.let {
            it(widthPx, heightPx)
            return
        }
        val reactContext = context as? ReactContext ?: return
        val dispatcher: EventDispatcher =
            UIManagerHelper.getEventDispatcherForReactTag(reactContext, id) ?: return
        val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
        dispatcher.dispatchEvent(
            OnContentSizeChangeEvent(
                surfaceId,
                id,
                // JS works in dp/points, not raw pixels — convert so the facade's `height` style is
                // in the same unit the layout system expects.
                PixelUtil.toDIPFromPixel(widthPx.toFloat()).toDouble(),
                PixelUtil.toDIPFromPixel(heightPx.toFloat()).toDouble(),
            ),
        )
    }

    /** Tear down Compose + the backing owner when the view is detached for good. */
    fun onDropView() {
        composeView?.disposeComposition()
        lifecycleOwner.destroy()
    }

    private class OnContentSizeChangeEvent(
        surfaceId: Int,
        viewId: Int,
        private val width: Double,
        private val height: Double,
    ) : Event<OnContentSizeChangeEvent>(surfaceId, viewId) {
        override fun getEventName() = "onContentSizeChange"
        override fun getEventData(): WritableMap =
            com.facebook.react.bridge.Arguments.createMap().apply {
                putDouble("width", width)
                putDouble("height", height)
            }
    }
}

/**
 * Minimal `LifecycleOwner` + `ViewModelStoreOwner` + `SavedStateRegistryOwner` backing a
 * `ComposeView` hosted outside a `ComponentActivity`. Driven to RESUMED so Compose composes and runs
 * effects; torn down to DESTROYED on dispose. Mirrors the Flutter plugin's `SlotViewTreeOwner`.
 */
private class SlotViewTreeOwner :
    LifecycleOwner,
    ViewModelStoreOwner,
    SavedStateRegistryOwner {

    private val lifecycleRegistry = LifecycleRegistry(this)
    private val store = ViewModelStore()
    private val savedStateController = SavedStateRegistryController.create(this)

    override val lifecycle: Lifecycle get() = lifecycleRegistry
    override val viewModelStore: ViewModelStore get() = store
    override val savedStateRegistry: SavedStateRegistry
        get() = savedStateController.savedStateRegistry

    fun start() {
        savedStateController.performRestore(null)
        lifecycleRegistry.currentState = Lifecycle.State.RESUMED
    }

    fun destroy() {
        lifecycleRegistry.currentState = Lifecycle.State.DESTROYED
        store.clear()
    }
}
