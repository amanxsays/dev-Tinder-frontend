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
        registerPlugin(SpeechPlugin.class);
        registerPlugin(NotificationsPlugin.class);
        registerPlugin(PdfPlugin.class);
        super.onCreate(state);
        boolean debug = (getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        android.webkit.WebView.setWebContentsDebuggingEnabled(debug);
        if (debug && getBridge() != null) {
            // Only debug's network security config permits emulator loopback HTTP.
            getBridge().getWebView().getSettings().setMixedContentMode(android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
    }
}
