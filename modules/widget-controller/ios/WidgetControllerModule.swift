import Foundation
import WidgetKit
import React

@objc(HabitWidgetController)
class HabitWidgetController: NSObject {

  @objc
  func reloadAllTimelines() {
    print("[widget] reloadAllTimelines called from Native Module!")
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
        print("[widget] WidgetCenter.shared.reloadAllTimelines() executed")
      }
    }
  }

  @objc
  func reloadTimelines(ofKind kind: String) {
    print("[widget] reloadTimelines(ofKind: \(kind)) called from Native Module!")
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
        print("[widget] WidgetCenter.shared.reloadTimelines(ofKind: \(kind)) executed")
      }
    }
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
