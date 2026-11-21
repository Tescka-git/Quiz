package fr.kuikuiz.probe;

import android.app.Activity;
import android.os.Bundle;
import android.widget.*;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ExecutorService;

/** Scénario en deux phases séparées par un arrêt forcé externe. Données fictives uniquement. */
public final class DurabilityProbeActivity extends Activity {
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private TextView log;
    private Button prepare,verify;
    private AndroidSessionStore heldStore;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setPadding(28,64,28,28);
        prepare=new Button(this);prepare.setText("1. Préparer une session fictive");layout.addView(prepare);
        verify=new Button(this);verify.setText("2. Vérifier après arrêt forcé");layout.addView(verify);
        log=new TextView(this);log.setTextIsSelectable(true);layout.addView(log);setContentView(layout);
        log.setText("Préparer, puis forcer l'arrêt de la sonde. Rouvrir et vérifier sans préparer une nouvelle session.");
        prepare.setOnClickListener(v->launch(true));verify.setOnClickListener(v->launch(false));
    }
    private static void check(boolean value,String message) throws Exception {if(!value)throw new Exception(message);}
    private JSONObject command(String type) throws Exception {return new JSONObject().put("type",type);}
    private JSONObject answer(String player,String submission) throws Exception {return command("answer").put("playerId",player).put("submissionId",submission).put("option","a");}
    private void launch(boolean preparing) {
        prepare.setEnabled(false);verify.setEnabled(false);log.setText("Test en cours…");
        worker.execute(()->{
            String message;
            AndroidSessionStore currentStore=null;
            try(EngineBridge engine=new EngineBridge(this)) {
                if(heldStore!=null) {heldStore.close();heldStore=null;}
                AndroidSessionStore store=new AndroidSessionStore(this,engine);currentStore=store;
                JSONObject report=new JSONObject();report.put("sha256",engine.sha256);report.put("pid",android.os.Process.myPid());
                if(preparing) {
                    String id=UUID.randomUUID().toString();
                    JSONObject state=engine.json("KuikuizEngine.create({id:'q1',options:['a','b'],correctOption:'a',durationMs:10000,maxPoints:1000,scoring:'speed'},['p1','p2'],100000)");
                    store.create(id,state);
                    JSONObject accepted=store.dispatch(id,answer("p1","s1"),102000);
                    check(accepted.getBoolean("confirmed"),"Réponse non confirmée après commit");
                    store.dispatch(id,command("checkpoint"),104000);
                    check(store.read(id).getLong("elapsedMs")==4000,"Checkpoint absent");
                    report.put("status","PREPARED");report.put("sessionId",id);report.put("confirmedAnswer",accepted.getJSONObject("answer"));
                    report.put("checkpointMs",4000);write("durability-prepared.json",report);
                    // Garder la connexion SQLite ouverte jusqu'à l'arrêt forcé externe.
                    heldStore=store;currentStore=null;
                    message="PRÉPARÉ — réponse confirmée après commit, checkpoint à 4000 ms.\nPID : "+android.os.Process.myPid()+"\nForcer maintenant l'arrêt, puis rouvrir et utiliser le bouton 2.";
                } else {
                    String id=store.latest();
                    JSONObject prepared=new JSONObject(new String(java.nio.file.Files.readAllBytes(new java.io.File(getFilesDir(),"durability-prepared.json").toPath()),StandardCharsets.UTF_8));
                    check(id.equals(prepared.getString("sessionId")),"Session différente du témoin de préparation");
                    int oldPid=Integer.parseInt(store.scalar("SELECT prepare_pid FROM sessions WHERE id=?",id));
                    check(oldPid!=android.os.Process.myPid(),"Le processus n'a pas été arrêté : refaire avec un arrêt forcé");
                    JSONObject restored=store.recover(id,10);
                    check(restored.getString("phase").equals("paused")&&restored.getLong("elapsedMs")==4000,"Temps non gelé");
                    check(restored.getJSONArray("answers").length()==1,"Réponse perdue ou doublée");
                    JSONObject refused=store.dispatch(id,answer("p2","s2"),1000);
                    check(refused.getString("status").equals("paused")&&!refused.getBoolean("confirmed"),"Réponse acceptée pendant pause");
                    JSONObject duplicate=store.dispatch(id,answer("p1","s1"),2000);
                    check(duplicate.getString("status").equals("duplicate")&&duplicate.getBoolean("confirmed"),"Doublon non retrouvé");
                    check(duplicate.getJSONObject("answer").getDouble("points")==860,"Score initial modifié");
                    store.dispatch(id,command("resume"),5000);
                    boolean rollbackVerified=false;
                    try(android.database.sqlite.SQLiteDatabase faults=openOrCreateDatabase("kuikuiz-durability-v1.db",MODE_PRIVATE,null)) {
                        faults.execSQL("CREATE TRIGGER probe_fail_write BEFORE UPDATE ON sessions BEGIN SELECT RAISE(ABORT,'probe-write-failure'); END");
                        try {
                            try {
                                store.dispatch(id,answer("p2","s2"),6000);
                                throw new Exception("L'erreur SQL injectée n'a pas interrompu la confirmation");
                            } catch(android.database.sqlite.SQLiteException expected) {
                                check(store.read(id).getJSONArray("answers").length()==1,"État partiel après erreur SQL");
                                check(Integer.parseInt(store.scalar("SELECT count(*) FROM answers WHERE session_id=?",id))==1,"Réponse partielle après erreur SQL");
                                rollbackVerified=true;
                            }
                        } finally {faults.execSQL("DROP TRIGGER probe_fail_write");}
                    }
                    JSONObject next=store.dispatch(id,answer("p2","s2"),6000);
                    check(next.getBoolean("confirmed")&&next.getJSONObject("answer").getDouble("points")==650,"Reprise incohérente");
                    check(Integer.parseInt(store.scalar("SELECT count(*) FROM answers WHERE session_id=?",id))==2,"Comptage incohérent");
                    check(store.scalar("PRAGMA integrity_check").equals("ok"),"Intégrité SQLite invalide");
                    report.put("status","PASS");report.put("sessionId",id);report.put("preparePid",oldPid);
                    report.put("restored",restored);report.put("duplicate",duplicate);report.put("afterResume",next);
                    report.put("rollbackVerified",rollbackVerified);
                    report.put("sqliteVersion",store.scalar("SELECT sqlite_version()"));
                    report.put("journalMode",store.scalar("PRAGMA journal_mode"));report.put("synchronous",store.scalar("PRAGMA synchronous"));
                    write("durability-result.json",report);
                    message="PASS — nouveau processus, réponse conservée, reprise gelée, doublon unique et score après reprise correct.\nSQLite Android : "+report.getString("sqliteVersion")+"\nNe valide ni panne électrique, ni confirmation réseau.";
                }
            } catch(Exception error) {message="ÉCHEC : "+error.getClass().getSimpleName()+" : "+error.getMessage();}
            finally {if(currentStore!=null)currentStore.close();}
            final String text=message;android.util.Log.i("KuikuizDurability",text);
            runOnUiThread(()->{if(!isDestroyed()){log.setText(text);prepare.setEnabled(true);verify.setEnabled(true);}});
        });
    }
    private void write(String name,JSONObject report) throws Exception {
        try(java.io.FileOutputStream output=openFileOutput(name,MODE_PRIVATE)) {output.write(report.toString().getBytes(StandardCharsets.UTF_8));output.getFD().sync();}
    }
    @Override public void onDestroy(){
        worker.execute(()->{if(heldStore!=null){heldStore.close();heldStore=null;}});
        worker.shutdown();super.onDestroy();
    }
}
