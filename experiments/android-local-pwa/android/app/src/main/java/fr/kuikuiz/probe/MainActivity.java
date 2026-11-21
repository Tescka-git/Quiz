package fr.kuikuiz.probe;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
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
public final class MainActivity extends Activity {
    private WebSocketServer server;
    private TextView journal;
    private Button start;
    private Button stop;
    private static final int PORT = 8787;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(28, 64, 28, 28);
        TextView title = new TextView(this);
        title.setText("Kuikuiz — Sonde WebSocket\nws:// uniquement, premier plan. Ni quiz, ni WSS, ni stockage durable.");
        layout.addView(title);
        start = new Button(this); start.setText("Démarrer le serveur"); layout.addView(start);
        stop = new Button(this); stop.setText("Arrêter le serveur"); stop.setEnabled(false); layout.addView(stop);
        journal = new TextView(this); journal.setTextIsSelectable(true);
        ScrollView scroll = new ScrollView(this); scroll.addView(journal); layout.addView(scroll);
        setContentView(layout);
        start.setOnClickListener(view -> startServer());
        stop.setOnClickListener(view -> stopServer());
        write("Prêt. Serveur arrêté.");
    }

    private void write(String message) {
        Log.i("KuikuizProbe", message);
        runOnUiThread(() -> {
            if (journal.length() > 12000) journal.setText("");
            journal.append(message + "\n");
        });
    }

    private void startServer() {
        if (server != null) return;
        start.setEnabled(false); stop.setEnabled(true);
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
                if (socket == null) runOnUiThread(() -> stopServer());
            }
        };
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        server.start();
    }

    private void stopServer() {
        WebSocketServer previous = server; server = null;
        start.setEnabled(true); stop.setEnabled(false);
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (previous != null) new Thread(() -> {
            try { previous.stop(1000); write("Serveur arrêté."); }
            catch (InterruptedException error) { Thread.currentThread().interrupt(); }
        }, "probe-stop").start();
    }
    @Override public void onDestroy() { stopServer(); super.onDestroy(); }
}
