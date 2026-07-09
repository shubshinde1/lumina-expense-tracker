package com.lumina.tracker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SmsReceiver extends BroadcastReceiver {
    private static MainActivity mainActivityInstance = null;

    public static void setMainActivity(MainActivity activity) {
        mainActivityInstance = activity;
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("android.provider.Telephony.SMS_RECEIVED".equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                Object[] pdus = (Object[]) bundle.get("pdus");
                if (pdus != null) {
                    for (Object pdu : pdus) {
                        SmsMessage smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                        String sender = smsMessage.getDisplayOriginatingAddress();
                        final String messageBody = smsMessage.getMessageBody();
                        
                        Log.d("LuminaSmsReceiver", "SMS Received from: " + sender + ", Body: " + messageBody);
                        
                        // Check if this looks like a bank or UPI transaction alert
                        if (isTransactionSms(messageBody)) {
                            // 1. If app is currently open, trigger the real-time UI flow
                            if (mainActivityInstance != null) {
                                mainActivityInstance.triggerSmsReceived(sender, messageBody);
                            }
                            
                            // 2. Perform background auto-logging asynchronously with goAsync()
                            final PendingResult pendingResult = goAsync();
                            final Context appContext = context.getApplicationContext();
                            
                            new Thread(new Runnable() {
                                @Override
                                public void run() {
                                    try {
                                        handleBackgroundSms(appContext, messageBody);
                                    } finally {
                                        pendingResult.finish();
                                    }
                                }
                            }).start();
                        }
                    }
                }
            }
        }
    }

    private void handleBackgroundSms(final Context context, final String messageBody) {
        SharedPreferences prefs = context.getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        final String token = prefs.getString("token", null);
        final String apiUrl = prefs.getString("apiUrl", null);

        // If the user has not logged in, we cannot authenticate the request.
        // Prompt them to open the app and log in.
        if (token == null || apiUrl == null) {
            Log.w("LuminaSmsReceiver", "No auth token or API URL found. Saving locally.");
            double amount = parseAmountLocally(messageBody);
            String type = parseTypeLocally(messageBody);
            savePendingSms(context, messageBody);
            showNotification(context, "Captured Transaction", 
                "Detected " + (type.equals("income") ? "income" : "spend") + " of ₹" + amount + ". Log in to save directly.",
                "/dashboard/notifications");
            return;
        }

        // Run HTTP POST synchronously inside this background thread
        try {
            URL url = new URL(apiUrl + "/transactions/auto-log");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json; utf-8");
            conn.setRequestProperty("Accept", "application/json");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            conn.setDoOutput(true);
            conn.setConnectTimeout(12000);
            conn.setReadTimeout(12000);

            // Escape characters for valid JSON
            String escapedSms = messageBody.replace("\\", "\\\\")
                                           .replace("\"", "\\\"")
                                           .replace("\n", "\\n")
                                           .replace("\r", "\\r");
            String jsonInputString = "{\"smsText\": \"" + escapedSms + "\"}";

            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonInputString.getBytes("utf-8");
                os.write(input, 0, input.length);
            }

            int responseCode = conn.getResponseCode();
            if (responseCode == 201 || responseCode == 200) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "utf-8"));
                StringBuilder response = new StringBuilder();
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }

                JSONObject jsonResponse = new JSONObject(response.toString());
                JSONObject transaction = jsonResponse.getJSONObject("transaction");
                double amount = transaction.getDouble("amount");
                String desc = transaction.getString("description");
                String type = transaction.getString("type");

                String transactionId = transaction.getString("_id");

                showNotification(context, "Auto-Logging Transaction", 
                    "Logged " + (type.equals("income") ? "income" : "spend") + " of ₹" + amount + " at " + desc + ". Tap to view/edit.",
                    "/dashboard/edit?id=" + transactionId);
                Log.d("LuminaSmsReceiver", "Successfully auto-logged transaction to backend database.");
            } else {
                Log.e("LuminaSmsReceiver", "Backend rejection code: " + responseCode);
                fallbackOffline(context, messageBody);
            }
        } catch (Exception e) {
            Log.e("LuminaSmsReceiver", "Error connecting to backend API: " + e.getMessage(), e);
            fallbackOffline(context, messageBody);
        }
    }

    private void fallbackOffline(Context context, String messageBody) {
        double amount = parseAmountLocally(messageBody);
        String type = parseTypeLocally(messageBody);
        
        savePendingSms(context, messageBody);
        
        showNotification(context, "Transaction Auto-Logged (Offline)", 
            "Recorded " + (type.equals("income") ? "income" : "spend") + " of ₹" + amount + " locally. Tap to sync when online.",
            "/dashboard/notifications");
    }

    private void savePendingSms(Context context, String messageBody) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
            String pendingJson = prefs.getString("pendingSmsList", "[]");
            JSONArray array = new JSONArray(pendingJson);
            array.put(messageBody);
            prefs.edit().putString("pendingSmsList", array.toString()).commit();
            Log.d("LuminaSmsReceiver", "Saved SMS to pending list: " + messageBody);
        } catch (Exception e) {
            Log.e("LuminaSmsReceiver", "Failed to save pending SMS", e);
        }
    }

    private double parseAmountLocally(String body) {
        if (body == null) return 0.0;
        try {
            // First pass: look specifically for debited/credited/paid/spent/sent/received/added/deposited/transfer/withdrawn followed by amount
            Pattern priorityPattern = Pattern.compile(
                "(?:debited|credited|paid|spent|sent|received|added|deposited|transfer|withdrawn|Rs\\.?|INR|₹)\\s*(?:for|of)?\\s*(?:rs\\.?|inr|₹)?\\s*([\\d,]+(?:\\.\\d{1,2})?)", 
                Pattern.CASE_INSENSITIVE
            );
            Matcher priorityMatcher = priorityPattern.matcher(body);
            if (priorityMatcher.find()) {
                String valStr = priorityMatcher.group(1).replace(",", "");
                return Double.parseDouble(valStr);
            }

            // Fallback: standard currency pattern matching
            Pattern fallbackPattern = Pattern.compile("(?:rs\\.?|inr|₹)\\s*([\\d,]+(?:\\.\\d{1,2})?)", Pattern.CASE_INSENSITIVE);
            Matcher fallbackMatcher = fallbackPattern.matcher(body);
            if (fallbackMatcher.find()) {
                String valStr = fallbackMatcher.group(1).replace(",", "");
                return Double.parseDouble(valStr);
            }
        } catch (Exception e) {
            Log.e("LuminaSmsReceiver", "Failed local amount parse", e);
        }
        return 0.0;
    }

    private String parseTypeLocally(String body) {
        if (body == null) return "expense";
        String lower = body.toLowerCase();
        boolean isCredit = lower.contains("credited") || lower.contains("received") || lower.contains("added") || lower.contains("deposited");
        return isCredit ? "income" : "expense";
    }

    private void showNotification(Context context, String title, String content, String route) {
        NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "lumina_sms_alerts";
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(channelId, "Transaction Alerts", NotificationManager.IMPORTANCE_DEFAULT);
            channel.setDescription("Alerts for auto-logged transactions");
            notificationManager.createNotificationChannel(channel);
        }
        
        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        launchIntent.putExtra("route", route);
        
        int pendingFlags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M 
            ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE 
            : PendingIntent.FLAG_UPDATE_CURRENT;
            
        int notificationId = (int) System.currentTimeMillis();
        PendingIntent pendingIntent = PendingIntent.getActivity(context, notificationId, launchIntent, pendingFlags);
        
        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(content)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true);
            
        notificationManager.notify(notificationId, builder.build());
    }

    private boolean isTransactionSms(String body) {
        if (body == null) return false;
        String lower = body.toLowerCase();
        
        // Exclude failed or declined attempts to prevent auto-logging errors
        if (lower.contains("failed") || 
            lower.contains("declined") || 
            lower.contains("reverted") || 
            lower.contains("returned") || 
            lower.contains("cancelled") || 
            lower.contains("unsuccessful") ||
            lower.contains("insufficient")) {
            return false;
        }

        boolean isDebit = lower.contains("debited") || lower.contains("spent") || lower.contains("charged") || 
                          lower.contains("paid") || lower.contains("sent") || lower.contains("withdrawn") || 
                          lower.contains("transfer") || lower.contains("txn") || lower.contains("transaction");
                          
        boolean isCredit = lower.contains("credited") || lower.contains("received") || lower.contains("added") || lower.contains("deposited");
        boolean hasCurrency = lower.contains("rs") || lower.contains("inr") || lower.contains("₹") || lower.contains("rupees");
        
        return (isDebit || isCredit) && hasCurrency;
    }
}
