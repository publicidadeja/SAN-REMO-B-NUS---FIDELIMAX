import Foundation
import Capacitor
import FirebaseCore
import FirebaseMessaging

public let isCapacitorApp = true

public final class FirebasePushBridge: NSObject, MessagingDelegate {
    public static let shared = FirebasePushBridge()

    private var lastPostedToken: String?

    private override init() {
        super.init()
    }

    public func configure() {
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }

        Messaging.messaging().delegate = self
    }

    public func handleDidRegisterForRemoteNotifications(deviceToken: Data) {
        Messaging.messaging().apnsToken = deviceToken

        Messaging.messaging().token { [weak self] token, error in
            if let error = error {
                NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
                return
            }

            if let token {
                self?.postRegistrationToken(token)
            }
        }
    }

    public func handleDidFailToRegisterForRemoteNotifications(error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken else {
            return
        }

        postRegistrationToken(fcmToken)
    }

    private func postRegistrationToken(_ token: String) {
        guard lastPostedToken != token else {
            return
        }

        lastPostedToken = token
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: token)
    }
}
