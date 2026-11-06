package com.amanxsays.devtinder;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import com.amanxsays.devtinder.platform.SessionPlugin;
import com.amanxsays.devtinder.platform.SpeechPlugin;
import com.amanxsays.devtinder.platform.NotificationsPlugin;
import com.amanxsays.devtinder.platform.PdfPlugin;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(SessionPlugin.class);
        registerPlugin(com.amanxsays.devtinder.platform.DeviceDataPlugin.class);
        registerPlugin(SpeechPlugin.class);
        registerPlugin(NotificationsPlugin.class);
        registerPlugin(PdfPlugin.class);
        super.onCreate(state);
        // Keep the entire WebView below system bars, independent of document
        // scrolling and WebView's version-dependent CSS safe-area reporting.
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        android.view.View content = findViewById(android.R.id.content);
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(content, (view, insets) -> {
            androidx.core.graphics.Insets barsInsets = insets.getInsets(
                androidx.core.view.WindowInsetsCompat.Type.systemBars()
                    | androidx.core.view.WindowInsetsCompat.Type.displayCutout());
            androidx.core.graphics.Insets keyboard = insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.ime());
            view.setPadding(barsInsets.left, barsInsets.top, barsInsets.right, Math.max(barsInsets.bottom, keyboard.bottom));
            return new androidx.core.view.WindowInsetsCompat.Builder(insets)
                .setInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()
                    | androidx.core.view.WindowInsetsCompat.Type.displayCutout()
                    | androidx.core.view.WindowInsetsCompat.Type.ime(), androidx.core.graphics.Insets.NONE)
                .build();
        });
        androidx.core.view.ViewCompat.requestApplyInsets(content);
        int background = android.graphics.Color.rgb(12, 21, 32);
        getWindow().getDecorView().setBackgroundColor(background);
        getWindow().setStatusBarColor(background);
        getWindow().setNavigationBarColor(background);
        androidx.core.view.WindowInsetsControllerCompat bars = androidx.core.view.WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView());
        bars.setAppearanceLightStatusBars(false);
        bars.setAppearanceLightNavigationBars(false);
        if (getBridge() != null) {
            getBridge().getWebView().setImportantForAutofill(android.view.View.IMPORTANT_FOR_AUTOFILL_YES);
        }
        boolean debug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        android.webkit.WebView.setWebContentsDebuggingEnabled(debug);
        if (debug && getBridge() != null) {
            // Only debug's network security config permits emulator loopback HTTP.
            getBridge().getWebView().getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
