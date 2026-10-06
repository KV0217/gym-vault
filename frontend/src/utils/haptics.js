/**
 * Native iOS Taptic Engine & Web Haptic Feedback Utility
 * Leverages @capacitor/haptics for real iPhone Taptic Engine pulses
 * with graceful fallback to Web Vibration API in browsers.
 */
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const HapticType = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SUCCESS: 'success',
  PR: 'pr',
  REST_END: 'rest_end',
};

export async function triggerHaptic(type = HapticType.LIGHT) {
  try {
    switch (type) {
      case HapticType.LIGHT:
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
      case HapticType.MEDIUM:
        await Haptics.impact({ style: ImpactStyle.Medium });
        return;
      case HapticType.HEAVY:
        await Haptics.impact({ style: ImpactStyle.Heavy });
        return;
      case HapticType.SUCCESS:
        await Haptics.notification({ type: NotificationType.Success });
        return;
      case HapticType.PR:
        await Haptics.notification({ type: NotificationType.Success });
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 120);
        return;
      case HapticType.REST_END:
        await Haptics.notification({ type: NotificationType.Warning });
        return;
      default:
        await Haptics.impact({ style: ImpactStyle.Light });
        return;
    }
  } catch (e) {
    // Fallback to web vibration API if outside native Capacitor container
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      try {
        switch (type) {
          case HapticType.LIGHT:
            window.navigator.vibrate(8);
            break;
          case HapticType.MEDIUM:
            window.navigator.vibrate(22);
            break;
          case HapticType.HEAVY:
            window.navigator.vibrate(45);
            break;
          case HapticType.SUCCESS:
            window.navigator.vibrate([15, 60, 25]);
            break;
          case HapticType.PR:
            window.navigator.vibrate([30, 50, 40, 50, 70]);
            break;
          case HapticType.REST_END:
            window.navigator.vibrate([100, 100, 150, 100, 250]);
            break;
          default:
            window.navigator.vibrate(10);
        }
      } catch (err) {
        // Ignored
      }
    }
  }
}
