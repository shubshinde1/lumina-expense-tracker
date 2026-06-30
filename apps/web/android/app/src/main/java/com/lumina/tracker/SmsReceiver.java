package com.lumina.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.telephony.SmsMessage;
import android.util.Log;

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
                        String messageBody = smsMessage.getMessageBody();
                        
                        Log.d("LuminaSmsReceiver", "SMS Received from: " + sender + ", Body: " + messageBody);
                        
                        // We check if this looks like a bank or UPI transaction alert
                        if (isTransactionSms(messageBody)) {
                            if (mainActivityInstance != null) {
                                mainActivityInstance.triggerSmsReceived(sender, messageBody);
                            }
                        }
                    }
                }
            }
        }
    }

    private boolean isTransactionSms(String body) {
        if (body == null) return false;
        String lower = body.toLowerCase();
        // Check for debit/credit keywords along with currency/banking indicators
        boolean isDebit = lower.contains("debited") || lower.contains("spent") || lower.contains("charged") || lower.contains("paid");
        boolean isCredit = lower.contains("credited") || lower.contains("received") || lower.contains("added") || lower.contains("deposited");
        boolean hasCurrency = lower.contains("rs") || lower.contains("inr") || lower.contains("₹") || lower.contains("rupees");
        
        return (isDebit || isCredit) && hasCurrency;
    }
}
