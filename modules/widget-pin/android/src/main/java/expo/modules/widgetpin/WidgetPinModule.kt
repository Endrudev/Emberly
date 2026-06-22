package expo.modules.widgetpin

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * `react-native-android-widget` nevystavuje pin API — toto je tenký native
 * wrapper jen kolem `AppWidgetManager.requestPinAppWidget`, dostupného od
 * Android 8 (API 26) a ne na všech launcherech.
 */
class WidgetPinModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("WidgetPin")

    Function("isSupported") {
      isPinSupported()
    }

    Function("requestPin") { providerClassName: String ->
      if (!isPinSupported()) return@Function false
      val context = appContext.reactContext ?: return@Function false
      val manager = context.getSystemService(AppWidgetManager::class.java) ?: return@Function false
      val provider = ComponentName(context, providerClassName)
      manager.requestPinAppWidget(provider, null, null)
    }
  }

  private fun isPinSupported(): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
    val context = appContext.reactContext ?: return false
    val manager = context.getSystemService(AppWidgetManager::class.java) ?: return false
    return manager.isRequestPinAppWidgetSupported
  }
}
