package com.lumina.tracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class LuminaAppWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences("LuminaPrefs", Context.MODE_PRIVATE);
        String balance = prefs.getString("widget_balance", "₹0.00");
        String inflow = prefs.getString("widget_inflow", "₹0");
        String outflow = prefs.getString("widget_outflow", "₹0");

        for (int appWidgetId : appWidgetIds) {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.lumina_widget);

            views.setTextViewText(R.id.widget_balance, balance);
            views.setTextViewText(R.id.widget_inflow, inflow);
            views.setTextViewText(R.id.widget_outflow, outflow);

            // Base tap: Main app
            Intent baseIntent = new Intent(context, MainActivity.class);
            PendingIntent basePendingIntent = PendingIntent.getActivity(
                context, 0, baseIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_balance, basePendingIntent);

            // Quick Log template 1: Coffee
            Intent intent1 = new Intent(context, MainActivity.class);
            intent1.putExtra("route", "/dashboard/add?template=Coffee&amount=50");
            intent1.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent1 = PendingIntent.getActivity(
                context, 1001, intent1, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_template_1, pendingIntent1);

            // Quick Log template 2: Metro
            Intent intent2 = new Intent(context, MainActivity.class);
            intent2.putExtra("route", "/dashboard/add?template=Metro&amount=30");
            intent2.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent2 = PendingIntent.getActivity(
                context, 1002, intent2, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_template_2, pendingIntent2);

            // Quick Log template 3: Grocery
            Intent intent3 = new Intent(context, MainActivity.class);
            intent3.putExtra("route", "/dashboard/add?template=Grocery&amount=500");
            intent3.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            PendingIntent pendingIntent3 = PendingIntent.getActivity(
                context, 1003, intent3, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.btn_template_3, pendingIntent3);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        }
    }
}
