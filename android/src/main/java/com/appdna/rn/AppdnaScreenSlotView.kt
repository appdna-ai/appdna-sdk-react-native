package com.appdna.rn

import ai.appdna.sdk.screens.AppDNAScreenSlot
import android.content.Context
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
class AppdnaScreenSlotView(context: Context) : FrameLayout(context) {

    private val lifecycleOwner = SlotViewTreeOwner()
    private var slotName: String = ""
    private var lastReportedWidth = -1
    private var lastReportedHeight = -1

    private val composeView: ComposeView = ComposeView(context).apply {
        lifecycleOwner.start()
        setViewTreeLifecycleOwner(lifecycleOwner)
        setViewTreeViewModelStoreOwner(lifecycleOwner)
        setViewTreeSavedStateRegistryOwner(lifecycleOwner)
    }

    init {
        addView(composeView)
        renderSlot()
    }

    /** Set (or change) the slot name and re-render. Called by the ViewManager on the `name` prop. */
    fun setSlotName(name: String) {
        if (name == slotName) return
        slotName = name
        renderSlot()
    }

    private fun renderSlot() {
        composeView.setContent {
            AppDNAScreenSlot(name = slotName)
        }
    }

    /**
     * After Compose measures its content, report the size to JS. Fabric will not lay this view out to
     * its content, so the facade sizes the Yoga node from what we send here. Deduped so a stable
     * content does not spam the bridge every frame.
     */
    override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
        super.onLayout(changed, left, top, right, bottom)
        val contentWidth = composeView.width
        val contentHeight = composeView.height
        if (contentWidth == lastReportedWidth && contentHeight == lastReportedHeight) return
        lastReportedWidth = contentWidth
        lastReportedHeight = contentHeight
        emitContentSize(contentWidth, contentHeight)
    }

    private fun emitContentSize(widthPx: Int, heightPx: Int) {
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
        composeView.disposeComposition()
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
