package com.dypu.connect

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class MyFirebaseMessagingService : FirebaseMessagingService() {

    private val TAG = "DYPU_FCMService"

    companion object {
        const val CHANNEL_MESSAGES = "dypu_connect_messages"
        const val CHANNEL_CALLS = "dypu_connect_calls"
        const val CHANNEL_CONFESSIONS = "dypu_connect_confessions"
        const val CHANNEL_GENERAL = "dypu_connect_general"
        const val NOTIFICATION_GROUP = "com.dypu.connect.NOTIFICATIONS"
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        Log.d(TAG, "From: ${remoteMessage.from}, data: ${remoteMessage.data}")

        var title = remoteMessage.notification?.title ?: "DYPU Connect"
        var body = remoteMessage.notification?.body ?: ""
        var url: String? = null
        var type = "general"
        var senderId: String? = null
        var chatId: String? = null

        if (remoteMessage.data.isNotEmpty()) {
            title = remoteMessage.data["title"] ?: title
            body = remoteMessage.data["body"] ?: body
            url = remoteMessage.data["url"]
            type = remoteMessage.data["type"] ?: "general"
            senderId = remoteMessage.data["senderId"]
            chatId = remoteMessage.data["chatId"]
        }

        // If body is empty, fallback to title or ignore
        if (body.isEmpty() && remoteMessage.data.isEmpty()) {
            return
        }

        when (type.lowercase()) {
            "call", "incoming_call" -> {
                sendCallNotification(title, body, url, chatId)
            }
            "message", "chat", "private_chat", "group_chat" -> {
                sendMessageNotification(title, body, url, chatId ?: senderId)
            }
            "confession", "like", "comment" -> {
                sendConfessionNotification(title, body, url)
            }
            else -> {
                sendGeneralNotification(title, body, url)
            }
        }
    }

    override fun onNewToken(token: String) {
        Log.d(TAG, "Refreshed token: $token")
        val prefs = getSharedPreferences("dypu_prefs", Context.MODE_PRIVATE)
        prefs.edit().putString("fcm_token", token).apply()

        val intent = Intent("FCM_TOKEN_UPDATE").apply {
            putExtra("token", token)
            setPackage(packageName)
        }
        sendBroadcast(intent)
    }

    private fun sendMessageNotification(title: String, messageBody: String, url: String?, conversationKey: String?) {
        val targetUrl = url ?: if (conversationKey != null) "/messages/$conversationKey" else "/messages"
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("target_url", targetUrl)
        }

        val notificationId = conversationKey?.hashCode() ?: System.currentTimeMillis().toInt()
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val builder = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(messageBody))
            .setAutoCancel(true)
            .setSound(soundUri)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setContentIntent(pendingIntent)
            .setGroup(NOTIFICATION_GROUP)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, builder.build())
    }

    private fun sendCallNotification(title: String, messageBody: String, url: String?, chatId: String?) {
        val targetUrl = url ?: if (chatId != null) "/messages/$chatId" else "/messages"

        // Main Tap Intent
        val fullScreenIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("target_url", targetUrl)
            putExtra("is_call", true)
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            1001,
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Accept Intent
        val acceptIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("target_url", "$targetUrl?action=answer_call")
            putExtra("is_call", true)
        }
        val acceptPendingIntent = PendingIntent.getActivity(
            this,
            1002,
            acceptIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Decline Intent
        val declineIntent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("target_url", "$targetUrl?action=decline_call")
        }
        val declinePendingIntent = PendingIntent.getActivity(
            this,
            1003,
            declineIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)

        val builder = NotificationCompat.Builder(this, CHANNEL_CALLS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(messageBody.ifEmpty { "Incoming audio or video call" })
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setAutoCancel(true)
            .setOngoing(true)
            .setSound(ringtoneUri)
            .setVibrate(longArrayOf(0, 1000, 500, 1000, 500, 1000))
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setContentIntent(fullScreenPendingIntent)
            .addAction(R.drawable.ic_refresh, "Decline", declinePendingIntent)
            .addAction(R.drawable.ic_refresh, "Answer", acceptPendingIntent)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val callNotificationId = 99999
        notificationManager.notify(callNotificationId, builder.build())
    }

    private fun sendConfessionNotification(title: String, messageBody: String, url: String?) {
        val targetUrl = url ?: "/confessions"
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            putExtra("target_url", targetUrl)
        }

        val notificationId = (targetUrl.hashCode() + System.currentTimeMillis() % 10000).toInt()
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val soundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val builder = NotificationCompat.Builder(this, CHANNEL_CONFESSIONS)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(messageBody))
            .setAutoCancel(true)
            .setSound(soundUri)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setGroup(NOTIFICATION_GROUP)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, builder.build())
    }

    private fun sendGeneralNotification(title: String, messageBody: String, url: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            url?.takeIf { it.isNotEmpty() }?.let { putExtra("target_url", it) }
        }

        val notificationId = (System.currentTimeMillis() % 100000).toInt()
        val pendingIntent = PendingIntent.getActivity(
            this,
            notificationId,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val defaultSoundUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
        val builder = NotificationCompat.Builder(this, CHANNEL_GENERAL)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(messageBody)
            .setStyle(NotificationCompat.BigTextStyle().bigText(messageBody))
            .setAutoCancel(true)
            .setSound(defaultSoundUri)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setGroup(NOTIFICATION_GROUP)

        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.notify(notificationId, builder.build())
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val audioAttributesNotification = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_COMMUNICATION_INSTANT)
                .build()

            val audioAttributesCall = AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build()

            // 1. Messages & Chats Channel (High Importance)
            val messagesChannel = NotificationChannel(
                CHANNEL_MESSAGES,
                getString(R.string.channel_messages_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_messages_desc)
                enableLights(true)
                lightColor = Color.parseColor("#6366F1")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 250, 150, 250)
                setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION), audioAttributesNotification)
            }

            // 2. Incoming Calls Channel (Max Importance, Ringtone)
            val callsChannel = NotificationChannel(
                CHANNEL_CALLS,
                getString(R.string.channel_calls_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_calls_desc)
                enableLights(true)
                lightColor = Color.parseColor("#10B981")
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 1000, 500, 1000, 500, 1000)
                val callSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                setSound(callSound, audioAttributesCall)
            }

            // 3. Confessions Channel (Default Importance)
            val confessionsChannel = NotificationChannel(
                CHANNEL_CONFESSIONS,
                getString(R.string.channel_confessions_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.channel_confessions_desc)
                enableLights(true)
                lightColor = Color.parseColor("#F59E0B")
            }

            // 4. General Announcements Channel (Default Importance)
            val generalChannel = NotificationChannel(
                CHANNEL_GENERAL,
                getString(R.string.channel_general_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.channel_general_desc)
            }

            notificationManager.createNotificationChannels(
                listOf(messagesChannel, callsChannel, confessionsChannel, generalChannel)
            )
        }
    }
}

