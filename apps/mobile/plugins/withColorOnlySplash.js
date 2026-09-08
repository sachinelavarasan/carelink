const { withAndroidStyles } = require('expo/config-plugins');

/**
 * expo-splash-screen@57 unconditionally writes
 *   <item name="windowSplashScreenAnimatedIcon">@drawable/splashscreen_logo</item>
 * into res/values/styles.xml, but it only generates that drawable when the plugin
 * is given an `image`. We configure a colour-only splash (backgroundColor only),
 * so the reference dangles and `:app:processDebugResources` fails with
 *   "resource drawable/splashscreen_logo not found".
 *
 * This runs after expo-splash-screen and removes the dangling item so Android
 * resource linking succeeds. It is idempotent, so it is safe on every prebuild.
 */
module.exports = function withColorOnlySplash(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults.resources.style ?? [];
    config.modResults.resources.style = styles.map((style) => {
      if (style.$?.name !== 'Theme.App.SplashScreen') {
        return style;
      }
      return {
        ...style,
        item: (style.item ?? []).filter(
          (item) => item.$?.name !== 'windowSplashScreenAnimatedIcon',
        ),
      };
    });
    return config;
  });
};
