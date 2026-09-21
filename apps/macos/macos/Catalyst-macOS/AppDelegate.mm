#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <ReactAppDependencyProvider/RCTAppDependencyProvider.h>

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification
{
  self.moduleName = @"Catalyst";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  self.dependencyProvider = [RCTAppDependencyProvider new];

  // OAuth のリダイレクト (com.natsuneko.catalyst://authorize) を JS の Linking に流す
  [[NSAppleEventManager sharedAppleEventManager] setEventHandler:self
                                                     andSelector:@selector(handleGetURLEvent:withReplyEvent:)
                                                   forEventClass:kInternetEventClass
                                                      andEventID:kAEGetURL];

  [super applicationDidFinishLaunching:notification];

  // App Store / Mail 風に、タイトルバーを透過させてコンテンツをその下まで敷き詰める。
  // styleMask の変更はコンテンツ矩形を維持してウィンドウ枠をタイトルバー分縮めるため、
  // 復元済みの枠を戻さないと自動保存された枠が起動ごとに小さくなっていく。
  NSRect frame = self.window.frame;
  self.window.styleMask |= NSWindowStyleMaskFullSizeContentView;
  [self.window setFrame:frame display:YES];
  self.window.titlebarAppearsTransparent = YES;
  self.window.titleVisibility = NSWindowTitleHidden;
  self.window.contentMinSize = NSMakeSize(800, 560);

  // 前回終了時のウィンドウ位置・サイズを復元し、以降の変更を UserDefaults に自動保存する
  [self.window setFrameAutosaveName:@"CatalystMainWindow"];
}

- (void)handleGetURLEvent:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)replyEvent
{
  [RCTLinkingManager getUrlEventHandler:event withReplyEvent:replyEvent];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self bundleURL];
}

- (NSURL *)bundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
#ifdef RN_FABRIC_ENABLED
  return true;
#else
  return false;
#endif
}

@end
