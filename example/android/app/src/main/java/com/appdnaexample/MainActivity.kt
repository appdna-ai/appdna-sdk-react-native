package com.appdnaexample

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "AppdnaExample"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   *
   * The delegate also carries the SDK key from the launch intent into JS as an initial prop. The key
   * is never committed, bundled, or written to disk — the example is force-pushed to a public mirror,
   * so a key stored here is a key published. Launch it with:
   *
   *     adb shell am start -n com.appdnaexample/.MainActivity -e appdnaApiKey adn_test_…
   *
   * Mirrors the iOS AppDelegate, which reads the same name out of the launch arguments.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
        override fun getLaunchOptions(): Bundle? {
          val apiKey = intent?.getStringExtra("appdnaApiKey") ?: return null
          return Bundle().apply { putString("apiKey", apiKey) }
        }
      }
}
