package com.amanxsays.devtinder;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class LayoutInsetsTest {
    @Test public void brandingClearsNativeStatusBarWithNoHorizontalOverflow() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            boolean scrolled = false;
            for (int attempt = 0; attempt < 90; attempt++) {
                AtomicReference<JSONObject> measured = new AtomicReference<>();
                CountDownLatch done = new CountDownLatch(1);
                scenario.onActivity(activity -> {
                    if (activity.getBridge() == null) { done.countDown(); return; }
                    android.webkit.WebView web = activity.getBridge().getWebView();
                    WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(activity.getWindow().getDecorView());
                    if (insets == null) { done.countDown(); return; }
                    int status = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()).top;
                    int[] location = new int[2]; web.getLocationOnScreen(location);
                    web.evaluateJavascript("JSON.stringify((()=>{const b=document.querySelector('.dt-site-brand');return b?{top:b.getBoundingClientRect().top,dpr:devicePixelRatio,width:innerWidth,scroll:document.documentElement.scrollWidth,scrollY:window.scrollY}:null})())", value -> {
                        try {
                            Object decoded = new JSONTokener(value).nextValue();
                            JSONObject data = new JSONObject((String) decoded);
                            data.put("webTop", location[1]); data.put("nativeStatus", status); measured.set(data);
                        } catch (Exception ignored) { /* Retry until React and native insets are ready. */ }
                        done.countDown();
                    });
                });
                done.await(2, TimeUnit.SECONDS);
                JSONObject data = measured.get();
                if (data != null) {
                    double dpr = data.getDouble("dpr");
                    double absoluteTop = data.getDouble("webTop") + data.getDouble("top") * dpr;
                    assertTrue("Branding must be below status bar with normal spacing", absoluteTop >= data.getInt("nativeStatus") + 8 * dpr - 2);
                    assertTrue("App must not overflow horizontally", data.getInt("scroll") <= data.getInt("width") + 1);
                    if (scrolled) {
                        if (data.getInt("scrollY") > 100) return;
                    } else {
                        scrolled = true;
                        scenario.onActivity(activity -> activity.getBridge().getWebView().evaluateJavascript(
                            "document.body.style.minHeight='2600px';document.querySelector('.dt-app-frame').style.minHeight='2600px';window.scrollTo(0,600);", null));
                    }
                }
                Thread.sleep(200);
            }
            fail("Native branding geometry did not become available");
        }
    }
}
