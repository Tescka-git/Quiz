package fr.kuikuiz.probe;

import android.content.Context;
import androidx.javascriptengine.JavaScriptSandbox;
import androidx.javascriptengine.JavaScriptIsolate;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/** Adaptateur d'évaluation, sans règle métier native. Appeler hors du thread UI. */
final class EngineBridge implements AutoCloseable {
    private final JavaScriptSandbox sandbox;
    private final JavaScriptIsolate isolate;
    final String sha256;
    EngineBridge(Context context) throws Exception {
        if (!JavaScriptSandbox.isSupported()) throw new Exception("JavaScriptSandbox non pris en charge");
        byte[] bytes = asset(context, "engine.js");
        StringBuilder hash = new StringBuilder();
        for (byte b : MessageDigest.getInstance("SHA-256").digest(bytes)) hash.append(String.format(Locale.ROOT,"%02x",b & 255));
        sha256 = hash.toString();
        JSONObject manifest = new JSONObject(new String(asset(context,"manifest.json"),StandardCharsets.UTF_8));
        if (!sha256.equals(manifest.getString("sha256"))) throw new Exception("Artefact moteur différent du manifeste");
        sandbox = JavaScriptSandbox.createConnectedInstanceAsync(context.getApplicationContext()).get(20,TimeUnit.SECONDS);
        JavaScriptIsolate created = null;
        try {
            created = sandbox.createIsolate();
            created.evaluateJavaScriptAsync(new String(bytes,StandardCharsets.UTF_8)).get(20,TimeUnit.SECONDS);
            isolate = created;
        } catch (Exception error) { if (created != null) created.close(); sandbox.close(); throw error; }
    }
    static byte[] asset(Context context, String name) throws Exception {
        try (InputStream input=context.getAssets().open(name); ByteArrayOutputStream output=new ByteArrayOutputStream()) {
            byte[] bytes=new byte[4096]; int count;
            while((count=input.read(bytes))!=-1) output.write(bytes,0,count);
            return output.toByteArray();
        }
    }
    JSONObject json(String expression) throws Exception {
        return new JSONObject(isolate.evaluateJavaScriptAsync("JSON.stringify("+expression+")").get(20,TimeUnit.SECONDS));
    }
    static String value(JSONObject object) { return "JSON.parse("+JSONObject.quote(object.toString())+")"; }
    @Override public void close() { isolate.close(); sandbox.close(); }
}
