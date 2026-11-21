package fr.kuikuiz.probe;
import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.widget.*;
public final class MainActivity extends Activity {
    private final Handler handler = new Handler();
    private TextView journal;
    private final Runnable refresh = new Runnable() {
        public void run() { journal.setText(ProbeService.status()); handler.postDelayed(this, 1000); }
    };
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout layout = new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(28,64,28,28);
        TextView title = new TextView(this); title.setText("Kuikuiz — Sonde WebSocket\nService avec notification. ws:// uniquement ; ni WSS ni stockage durable."); layout.addView(title);
        Button start = new Button(this); start.setText("Démarrer le serveur"); layout.addView(start);
        Button stop = new Button(this); stop.setText("Arrêter le serveur"); layout.addView(stop);
        Button engine = new Button(this); engine.setText("Tester le moteur JavaScript"); layout.addView(engine);
        engine.setOnClickListener(view -> startActivity(new Intent(this, EngineProbeActivity.class)));
        Button durability=new Button(this);durability.setText("Tester SQLite après arrêt forcé");layout.addView(durability);
        durability.setOnClickListener(view->startActivity(new Intent(this,DurabilityProbeActivity.class)));
        journal = new TextView(this); journal.setTextIsSelectable(true);
        ScrollView scroll = new ScrollView(this); scroll.addView(journal); layout.addView(scroll); setContentView(layout);
        start.setOnClickListener(view -> {
            if (android.os.Build.VERSION.SDK_INT >= 33 && checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},10); return;
            }
            startForegroundService(new Intent(this, ProbeService.class));
        });
        stop.setOnClickListener(view -> stopService(new Intent(this, ProbeService.class)));
    }
    @Override public void onResume() { super.onResume(); handler.post(refresh); }
    @Override public void onPause() { handler.removeCallbacks(refresh); super.onPause(); }
}
