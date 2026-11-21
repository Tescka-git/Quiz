package fr.kuikuiz.probe;

import android.util.Log;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.util.Collections;

/** Sonde de transport uniquement. Aucune règle métier et aucune persistance. */
public final class ProbeService extends android.app.Service {
    private WebSocketServer server;
    private static volatile String status = "Serveur arrêté.";
    public static String status() { return status; }
    private static final int PORT = 8787;
    @Override public android.os.IBinder onBind(android.content.Intent intent) { return null; }
    @Override public void onCreate() {
        super.onCreate();
        android.app.NotificationManager manager = getSystemService(android.app.NotificationManager.class);
        manager.createNotificationChannel(new android.app.NotificationChannel("probe", "Serveur de test Kuikuiz", android.app.NotificationManager.IMPORTANCE_LOW));
    }
    @Override public int onStartCommand(android.content.Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) { stopSelf(); return START_NOT_STICKY; }
        android.app.PendingIntent open = android.app.PendingIntent.getActivity(this, 0,
            new android.content.Intent(this, MainActivity.class), android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.PendingIntent stop = android.app.PendingIntent.getService(this, 1,
            new android.content.Intent(this, ProbeService.class).setAction("STOP"), android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification notification = new android.app.Notification.Builder(this, "probe")
            .setSmallIcon(android.R.drawable.stat_notify_sync).setContentTitle("Kuikuiz — serveur de test actif")
            .setContentText("WebSocket local sur le port 8787").setContentIntent(open).setOngoing(true)
            .addAction(new android.app.Notification.Action.Builder(null, "Arrêter", stop).build()).build();
        if (android.os.Build.VERSION.SDK_INT >= 29)
            startForeground(1, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);
        else startForeground(1, notification);
        startServer();
        return START_NOT_STICKY;
    }
    private static synchronized void write(String message) {
        Log.i("KuikuizProbe", message);
        if (status.length() > 12000) status = "";
        status += "\n" + message;
    }

    private void startServer() {
        if (server != null) return;

        server = new WebSocketServer(new InetSocketAddress("0.0.0.0", PORT)) {
            @Override public void onStart() {
                setConnectionLostTimeout(15);
                write("Écoute sur le port " + PORT + ". Origines non filtrées : sonde sur réseau de confiance uniquement.");
                try {
                    for (NetworkInterface network : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                        for (InetAddress address : Collections.list(network.getInetAddresses())) {
                            if (address instanceof Inet4Address && !address.isLoopbackAddress())
                                write(network.getName() + " : ws://" + address.getHostAddress() + ":" + PORT);
                        }
                    }
                } catch (Exception error) { write("Adresses indisponibles : " + error.getClass().getSimpleName()); }
            }
            @Override public void onOpen(WebSocket socket, ClientHandshake handshake) {
                write("Connexion " + socket.getRemoteSocketAddress() + " ; Origin=" + handshake.getFieldValue("Origin"));
            }
            @Override public void onMessage(WebSocket socket, String text) {
                if (text.length() > 1024) { socket.close(1009, "Message trop long"); return; }
                try {
                    JSONObject input = new JSONObject(text);
                    Object id = input.opt("id");
                    if (!"ping".equals(input.optString("type")) || !(id instanceof String) || ((String) id).length() > 64) {
                        socket.close(1008, "Ping JSON avec identifiant texte requis"); return;
                    }
                    JSONObject output = new JSONObject(); output.put("type", "pong"); output.put("id", id);
                    socket.send(output.toString());
                    write("Ping reçu, pong envoyé.");
                } catch (Exception error) { socket.close(1008, "JSON invalide"); }
            }
            @Override public void onClose(WebSocket socket, int code, String reason, boolean remote) {
                write("Déconnexion : " + code);
            }
            @Override public void onError(WebSocket socket, Exception error) {
                write("Erreur : " + error.getClass().getSimpleName() + " : " + error.getMessage());
                if (socket == null) new android.os.Handler(getMainLooper()).post(() -> stopSelf());
            }
        };

        server.start();
    }

    private void stopServer() {
        WebSocketServer previous = server; server = null;


        if (previous != null) new Thread(() -> {
            try { previous.stop(1000); write("Serveur arrêté."); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); }
        }, "probe-stop").start();
    }
    @Override public void onDestroy() { stopServer(); stopForeground(STOP_FOREGROUND_REMOVE); write("Service arr?t?."); super.onDestroy(); }
}
