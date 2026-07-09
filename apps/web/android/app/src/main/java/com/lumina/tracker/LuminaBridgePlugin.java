package com.lumina.tracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LuminaBridge")
public class LuminaBridgePlugin extends Plugin {

    @PluginMethod
    public void saveUserSession(PluginCall call) {
        String token = call.getString("token");
        String email = call.getString("email");
        String apiUrl = call.getString("apiUrl");

        if (token == null || email == null || apiUrl == null) {
            Log.e("LuminaBridgePlugin", "saveUserSession failed: Token, email, or API URL is null.");
            call.reject("Token, email, and API URL are required");
            return;
        }

        Log.d("LuminaBridgePlugin", "saveUserSession: Syncing session to SharedPreferences. Email: " + email + ", API: " + apiUrl);

        SharedPreferences prefs = getContext().getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        prefs.edit()
             .putString("token", token)
             .putString("email", email)
             .putString("apiUrl", apiUrl)
             .commit();

        call.resolve();
    }

    @PluginMethod
    public void clearUserSession(PluginCall call) {
        Log.d("LuminaBridgePlugin", "clearUserSession: Clearing user session from SharedPreferences.");
        SharedPreferences prefs = getContext().getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        prefs.edit()
             .remove("token")
             .remove("email")
             .remove("apiUrl")
             .commit();
        call.resolve();
    }

    @PluginMethod
    public void getPendingSmsList(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        String pendingSmsJson = prefs.getString("pendingSmsList", "[]");
        
        JSObject ret = new JSObject();
        ret.put("smsList", pendingSmsJson);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingSmsList(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        prefs.edit().remove("pendingSmsList").commit();
        call.resolve();
    }

    @PluginMethod
    public void savePendingSmsList(PluginCall call) {
        String smsListJson = call.getString("smsList");
        if (smsListJson == null) {
            call.reject("smsList is required");
            return;
        }
        SharedPreferences prefs = getContext().getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        prefs.edit().putString("pendingSmsList", smsListJson).commit();
        call.resolve();
    }

    @PluginMethod
    public void getLaunchRoute(PluginCall call) {
        String route = MainActivity.getAndClearLaunchRoute();
        JSObject ret = new JSObject();
        ret.put("route", route);
        call.resolve(ret);
    }
}
