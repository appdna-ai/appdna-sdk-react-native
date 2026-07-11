#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <appdna_sdk_react_native/AppdnaFabricComponents.h>

@implementation AppDelegate

// Required because this app links pods as DYNAMIC frameworks (see the Podfile — Firebase forces it).
// Codegen's `RCTThirdPartyFabricComponentsProvider` wraps its whole component map in
// `#ifndef RCT_DYNAMIC_FRAMEWORKS`, so under `use_frameworks!` nothing registers AppdnaScreenSlotView
// and React silently renders "Unimplemented component: <AppdnaScreenSlotView>" — no throw, no log.
- (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
  NSMutableDictionary *components = [[super thirdPartyFabricComponents] mutableCopy];
  [components addEntriesFromDictionary:AppdnaFabricComponents()];
  return components;
}

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"AppdnaExample";

  // The SDK key arrives as a LAUNCH ARGUMENT and is handed to JS as an initial prop. It is never
  // written to this repo, to the bundle, or to disk on the device — the example is force-pushed to a
  // public mirror, so a key committed here is a key published. Launch it with:
  //
  //     xcrun simctl launch <device> <bundle-id> -appdnaApiKey adn_test_…
  //
  // `-key value` pairs land in NSUserDefaults' argument domain, which lives only in this process.
  NSString *apiKey = [[NSUserDefaults standardUserDefaults] stringForKey:@"appdnaApiKey"];
  self.initialProps = apiKey.length > 0 ? @{@"apiKey" : apiKey} : @{};

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  // A Debug build normally streams JS from Metro. An automated device pass has no Metro — and on a
  // machine whose default Node is too new for the RN CLI, it cannot have one. So if a JS bundle was
  // dropped into the app, prefer it: the run is then hermetic, which is what you want from a test
  // anyway. A normal `npm start` workflow never has this file, so Metro stays the default.
  NSURL *packaged = [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
  if (packaged) {
    return packaged;
  }
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
