package com.lumina.tracker;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int SMS_PERMISSION_CODE = 101;
    private static String launchRoute = null;

    public static String getAndClearLaunchRoute() {
        String route = launchRoute;
        launchRoute = null;
        return route;
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SmsReceiver.setMainActivity(this);

        Intent intent = getIntent();
        if (intent != null && intent.hasExtra("route")) {
            launchRoute = intent.getStringExtra("route");
        }

        // Runtime permission check for RECEIVE_SMS, RECORD_AUDIO and POST_NOTIFICATIONS
        boolean hasSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        boolean hasNotifications = true;
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            hasNotifications = ContextCompat.checkSelfPermission(this, "android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED;
        }
        
        if (!hasSms || !hasAudio || !hasNotifications) {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.RECORD_AUDIO,
                    "android.permission.POST_NOTIFICATIONS"
                }, SMS_PERMISSION_CODE);
            } else {
                ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.RECEIVE_SMS,
                    Manifest.permission.RECORD_AUDIO
                }, SMS_PERMISSION_CODE);
            }
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.hasExtra("route")) {
            String route = intent.getStringExtra("route");
            launchRoute = route;
            triggerRouteNavigation(route);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        SmsReceiver.setMainActivity(null);
    }

    public void triggerRouteNavigation(final String route) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getBridge() != null && getBridge().getWebView() != null && route != null) {
                    String js = "window.dispatchEvent(new CustomEvent('navigateToRoute', { detail: { route: '" + route + "' } }));";
                    getBridge().getWebView().evaluateJavascript(js, null);
                    Log.d("LuminaMainActivity", "Dispatched navigateToRoute JS event successfully: " + route);
                }
            }
        });
    }

    public void triggerSmsReceived(final String sender, final String body) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                if (getBridge() != null && getBridge().getWebView() != null) {
                    // Escape special characters to ensure valid JS evaluate call
                    String escapedBody = body.replace("\\", "\\\\")
                                              .replace("'", "\\'")
                                              .replace("\"", "\\\"")
                                              .replace("\n", "\\n")
                                              .replace("\r", "\\r");
                    String escapedSender = sender.replace("\\", "\\\\")
                                                  .replace("'", "\\'")
                                                  .replace("\"", "\\\"");

                    String js = "window.dispatchEvent(new CustomEvent('bankSmsReceived', { detail: { sender: '" + escapedSender + "', body: '" + escapedBody + "' } }));";
                    getBridge().getWebView().evaluateJavascript(js, null);
                    Log.d("LuminaMainActivity", "Dispatched bankSmsReceived JS event successfully");
                }
            }
        });
    }
}
