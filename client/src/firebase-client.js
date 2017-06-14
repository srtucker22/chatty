import {
  Platform,
} from 'react-native';
import FCM, { FCMEvent, RemoteNotificationResult, WillPresentNotificationResult, NotificationType } from 'react-native-fcm';

export class FirebaseClient {
  constructor({ onWillPresentNotification }) {
    this.onWillPresentNotification = onWillPresentNotification;
  }

  init() {
    const self = this;

    // already initialized
    if (self.token) {
      return Promise.resolve(self.token);
    }

    // request user permission for notifications - iOS
    FCM.requestPermissions();

    FCM.getInitialNotification().then((notif) => {
      console.log('INITIAL NOTIFICATION', notif);
    });

    self.notificationListener = FCM.on(FCMEvent.Notification, (notification) => {
      console.log('Notification', notification);

      if (notification.local_notification) {
        // this is a local notification
        return;
      }
      if (notification.opened_from_tray) {
        // app is open/resumed because user clicked banner
        return;
      }

      if (Platform.OS === 'ios') {
        // optional
        // iOS requires developers to call completionHandler to end notification process. If you do not call it your background remote notifications could be throttled, to read more about it see the above documentation link.
        // This library handles it for you automatically with default behavior (for remote notification, finish with NoData; for WillPresent, finish depend on "show_in_foreground"). However if you want to return different result, follow the following code to override
        // notif._notificationType is available for iOS platfrom
        console.log(notification._notificationType, NotificationType.NotificationResponse);
        switch (notification._notificationType) {
          case NotificationType.Remote:
            notification.finish(RemoteNotificationResult.NewData); // other types available: RemoteNotificationResult.NewData, RemoteNotificationResult.ResultFailed
            break;
          case NotificationType.NotificationResponse:
            notification.finish();
            break;
          case NotificationType.WillPresent:
            // custom handling of WillPresent
            if (this.onWillPresentNotification) {
              this.onWillPresentNotification(notification); // needs to call notification.finish
            } else {
              notification.finish(WillPresentNotificationResult.All); // other types available: WillPresentNotificationResult.None
            }
            break;
        }
      }
    });

    // fcm token may not be available on first load, catch it here
    self.refreshTokenListener = FCM.on(FCMEvent.RefreshToken, (token) => {
      self.token = token;
      return Promise.resolve(self.token);
    });

    // return device token
    return FCM.getFCMToken().then((token) => {
      console.log('TOKEN (getFCMToken)', token);
      self.token = token;
      return token;
    });
  }

  // stop listening for notifications
  clear() {
    if (this.notificationListener) {
      this.notificationListener.remove();
    }

    if (this.refreshTokenListener) {
      this.refreshTokenListener.remove();
    }

    this.token = null;
  }
}

export default FirebaseClient;
