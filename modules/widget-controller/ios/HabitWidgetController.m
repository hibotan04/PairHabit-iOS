
// Wrapper file to export the Swift module to React Native Bridge
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(HabitWidgetController, NSObject)

RCT_EXTERN_METHOD(reloadAllTimelines)

@end
