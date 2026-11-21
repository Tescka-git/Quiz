package fr.kuikuiz.probe;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.util.Log;
import androidx.javascriptengine.JavaScriptSandbox;
import androidx.javascriptengine.JavaScriptIsolate;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Expérience indépendante du serveur réseau, sans règles métier Java. */
public final class EngineProbeActivity extends Activity {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private TextView result;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        result = new TextView(this); result.setPadding(28,64,28,28); result.setTextIsSelectable(true);
        result.setText("Vérification du moteur JavaScript en cours…"); setContentView(result);
        worker.execute(this::runProbe);
    }
    private byte[] asset(String name) throws Exception {
        try (InputStream input = getAssets().open(name); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096]; int count;
            while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
            return output.toByteArray();
        }
    }
    private String text(String name) throws Exception { return new String(asset(name), StandardCharsets.UTF_8); }
    private void show(String message) {
        Log.i("KuikuizEngineProbe", message);
        runOnUiThread(() -> { if (!isDestroyed()) result.setText(message); });
    }
    private void runProbe() {
        try {
            if (!JavaScriptSandbox.isSupported()) { show("NON PRIS EN CHARGE : JavaScriptSandbox sur cet appareil."); return; }
            byte[] bytes = asset("engine.js");
            StringBuilder hash = new StringBuilder();
            for (byte b : MessageDigest.getInstance("SHA-256").digest(bytes)) hash.append(String.format(java.util.Locale.ROOT, "%02x", b & 255));
            String expectedHash = new JSONObject(text("manifest.json")).getString("sha256");
            if (!hash.toString().equals(expectedHash)) throw new Exception("SHA-256 différent du manifeste");
            try (JavaScriptSandbox sandbox = JavaScriptSandbox.createConnectedInstanceAsync(getApplicationContext()).get(20, TimeUnit.SECONDS);
                 JavaScriptIsolate isolate = sandbox.createIsolate()) {
                isolate.evaluateJavaScriptAsync(new String(bytes, StandardCharsets.UTF_8)).get(20, TimeUnit.SECONDS);
                isolate.evaluateJavaScriptAsync(text("scenario.js")).get(20, TimeUnit.SECONDS);
                String fixture = text("fixture.json");
                String output = isolate.evaluateJavaScriptAsync("runKuikuizScenario(JSON.parse(" + JSONObject.quote(fixture) + "))").get(20, TimeUnit.SECONDS);
                if (!output.equals(text("node-reference.json"))) throw new Exception("Trace Android différente de la référence Node");
                int steps = new JSONObject(fixture).getJSONArray("steps").length();
                JSONObject report = new JSONObject();
                report.put("status", "PASS"); report.put("sha256", hash.toString()); report.put("steps", steps);
                report.put("runtime", "AndroidX JavaScriptEngine 1.1.1");
                report.put("trace", new JSONObject(output));
                try (java.io.FileOutputStream file = openFileOutput("engine-probe-result.json", MODE_PRIVATE)) {
                    file.write(report.toString().getBytes(StandardCharsets.UTF_8));
                }
                show("PASS — même artefact et mêmes résultats que Node.js.\nSHA-256 : " + hash + "\nÉtapes vérifiées : " + steps
                    + "\nNe valide ni stockage durable du jeu, ni réseau, ni arrière-plan.");
            }
        } catch (Exception error) { show("ÉCHEC : " + error.getClass().getSimpleName() + " : " + error.getMessage()); }
    }
    @Override public void onDestroy() { worker.shutdownNow(); super.onDestroy(); }
}
