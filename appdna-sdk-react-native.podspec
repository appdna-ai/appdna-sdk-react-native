require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name             = "appdna-sdk-react-native"
  s.version          = package["version"]
  s.summary          = package["description"]
  s.homepage         = "https://appdna.ai"
  s.license          = { :type => "SEE LICENSE IN LICENSE", :file => "LICENSE" }
  s.authors          = { "AppDNA AI" => "support@appdna.ai" }
  s.source           = { :git => "https://github.com/appdna-ai/appdna-sdk-react-native.git", :tag => "v#{s.version}" }

  # SPEC-070-B P0. The iOS core SDK targets 16.0 (AppDNASDK.podspec:15); a wrapper cannot ask for
  # less than the thing it wraps.
  s.platform         = :ios, "16.0"
  s.swift_version    = "5.9"

  s.source_files     = "ios/**/*.{h,m,mm,swift}"

  # SPEC-070-B P0 (AC-38 / W7): Apple merges the app's, the pod's, and every dependency's privacy
  # manifest. The wrapper collects nothing of its own — it declares only the API-usage reasons its
  # own code triggers. The collected-data types are declared by the core pod's manifest, which is
  # where the collection actually happens.
  s.resource_bundles = { "AppdnaSdkReactNative" => ["ios/PrivacyInfo.xcprivacy"] }

  # SPEC-070-B D-v: the wrapper always pins the freshest native. `~>` admits a newer PATCH with no
  # source edit, so `check:version-lockstep` (AC-34) asserts this line matches the shipped iOS
  # version rather than trusting that it does.
  s.dependency "AppDNASDK", "~> 1.0.70"

  # A pure-Swift TurboModule is impossible: codegen emits a C++ `NativeAppdnaModuleSpecJSI` plus an
  # ObjC @protocol, and registration returns a std::shared_ptr over headers Swift cannot import. The
  # ObjC++ adapter (P2) imports the generated Swift header, which requires DEFINES_MODULE.
  s.pod_target_xcconfig = {
    "DEFINES_MODULE" => "YES",
  }

  # install_modules_dependencies wires the New-Architecture flags, the codegen'd spec pod,
  # React-Core, ReactCommon and folly. It is defined by react_native_pods.rb, which only a host
  # app's Podfile loads — so a standalone `pod ipc spec` (P0's exit gate) does not have it. Guard,
  # or the podspec cannot be validated outside an app.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
