package com.lumina.tracker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat

object TransactionNotifier {
    private const val CHANNEL_ID = "transaction_alerts"
    private const val CHANNEL_NAME = "Transaction Alerts"

    @JvmStatic
    fun createChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Alerts for parsed mobile transactions"
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }

    @JvmStatic
    fun notify(context: Context, tx: ParsedTransaction) {
        createChannel(context)

        val directionLabel = if (tx.direction == "income") "Credited (Income)" else "Debited (Spend)"
        val title = "₹${tx.amount} $directionLabel"
        val body = "${tx.merchant} · ${tx.category}"

        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("route", "/dashboard/add?sms=${android.net.Uri.encode(tx.rawSms)}")
            putExtra("amount", tx.amount)
            putExtra("direction", tx.direction)
            putExtra("merchant", tx.merchant)
            putExtra("category", tx.category)
            putExtra("subcategory", tx.subcategory)
            putExtra("paymentType", tx.paymentType)
            putExtra("accountRef", tx.accountRef)
            putExtra("rawSms", tx.rawSms)
        }

        val pendingFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
            PendingIntent.FLAG_UPDATE_CURRENT
        }

        val notificationId = tx.rawSms.hashCode()
        val pendingIntent = PendingIntent.getActivity(context, notificationId, intent, pendingFlags)

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        manager.notify(notificationId, builder.build())
    }
}
