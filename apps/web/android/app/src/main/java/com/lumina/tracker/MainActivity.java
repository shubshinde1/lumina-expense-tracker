package com.lumina.tracker;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.util.Log;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int SMS_PERMISSION_CODE = 101;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SmsReceiver.setMainActivity(this);

        // Runtime permission check for RECEIVE_SMS and RECORD_AUDIO
        boolean hasSms = ContextCompat.checkSelfPermission(this, Manifest.permission.RECEIVE_SMS) == PackageManager.PERMISSION_GRANTED;
        boolean hasAudio = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        
        if (!hasSms || !hasAudio) {
            ActivityCompat.requestPermissions(this, new String[]{
                Manifest.permission.RECEIVE_SMS,
                Manifest.permission.RECORD_AUDIO
            }, SMS_PERMISSION_CODE);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        SmsReceiver.setMainActivity(null);
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
