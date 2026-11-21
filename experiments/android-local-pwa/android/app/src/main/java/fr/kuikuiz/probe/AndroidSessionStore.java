package fr.kuikuiz.probe;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import org.json.JSONObject;
import java.util.HashSet;
import java.util.Set;

/** SQLite natif pour l'expérience : état et réponse atomiques, aucun calcul de score. */
final class AndroidSessionStore implements AutoCloseable {
    private final SQLiteDatabase database;
    private final EngineBridge engine;
    private final Set<String> ready = new HashSet<>();
    AndroidSessionStore(Context context, EngineBridge engine) {
        this.engine=engine;
        database=context.openOrCreateDatabase("kuikuiz-durability-v1.db",Context.MODE_PRIVATE,null);
        try {
            database.disableWriteAheadLogging();
            database.setForeignKeyConstraintsEnabled(true);
            try(Cursor c=database.rawQuery("PRAGMA journal_mode=DELETE",null)) { c.moveToFirst(); }
            if(android.os.Build.VERSION.SDK_INT>=30) database.execPerConnectionSQL("PRAGMA synchronous=EXTRA",new Object[0]);
            else database.execSQL("PRAGMA synchronous=EXTRA");
            database.execSQL("CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY NOT NULL,state_json TEXT NOT NULL,engine_sha TEXT NOT NULL,prepare_pid INTEGER NOT NULL)");
            database.execSQL("CREATE TABLE IF NOT EXISTS answers(session_id TEXT NOT NULL REFERENCES sessions(id),submission_id TEXT NOT NULL,player_id TEXT NOT NULL,answer_json TEXT NOT NULL,PRIMARY KEY(session_id,submission_id),UNIQUE(session_id,player_id))");
        } catch(RuntimeException error) { database.close(); throw error; }
    }
    String scalar(String sql,String... args) {
        try(Cursor c=database.rawQuery(sql,args)) {
            if(!c.moveToFirst()) throw new IllegalStateException("Aucun résultat");
            return c.getString(0);
        }
    }
    String latest() { return scalar("SELECT id FROM sessions ORDER BY rowid DESC LIMIT 1"); }
    JSONObject read(String id) throws Exception {
        if(!engine.sha256.equals(scalar("SELECT engine_sha FROM sessions WHERE id=?",id))) throw new Exception("Version moteur incompatible avec cette session");
        return new JSONObject(scalar("SELECT state_json FROM sessions WHERE id=?",id));
    }
    void create(String id, JSONObject state) {
        database.beginTransaction();
        try {
            ContentValues row=new ContentValues(); row.put("id",id);row.put("state_json",state.toString());
            row.put("engine_sha",engine.sha256);row.put("prepare_pid",android.os.Process.myPid());
            database.insertOrThrow("sessions",null,row); database.setTransactionSuccessful();
        } finally { database.endTransaction(); }
        ready.add(id);
    }
    private void save(String id,JSONObject state) {
        ContentValues row=new ContentValues();row.put("state_json",state.toString());
        if(database.update("sessions",row,"id=?",new String[]{id})!=1) throw new IllegalStateException("Session inconnue");
    }
    JSONObject recover(String id,long now) throws Exception {
        ready.remove(id); JSONObject state;
        database.beginTransaction();
        try {
            state=engine.json("KuikuizEngine.recover("+EngineBridge.value(read(id))+","+now+")");
            save(id,state);database.setTransactionSuccessful();
        } finally { database.endTransaction(); }
        ready.add(id);return state;
    }
    JSONObject dispatch(String id,JSONObject command,long now) throws Exception {
        if(!ready.contains(id)) throw new IllegalStateException("Restauration requise");
        JSONObject result; boolean confirmed;
        database.beginTransaction();
        try {
            result=engine.json("KuikuizEngine.apply("+EngineBridge.value(read(id))+","+EngineBridge.value(command)+","+now+")");
            String status=result.getString("status");
            if(status.equals("accepted-in-memory")) {
                JSONObject answer=result.getJSONObject("answer");ContentValues row=new ContentValues();
                row.put("session_id",id);row.put("submission_id",answer.getString("submissionId"));
                row.put("player_id",answer.getString("playerId"));row.put("answer_json",answer.toString());
                database.insertOrThrow("answers",null,row);
            }
            save(id,result.getJSONObject("state"));
            confirmed=status.equals("accepted-in-memory")||status.equals("duplicate");
            if(confirmed) {
                JSONObject answer=result.getJSONObject("answer");
                JSONObject stored=new JSONObject(scalar("SELECT answer_json FROM answers WHERE session_id=? AND submission_id=?",id,answer.getString("submissionId")));
                for(String field:new String[]{"submissionId","playerId","option"})
                    if(!stored.getString(field).equals(answer.getString(field))) throw new Exception("Réponse durable incohérente");
                for(String field:new String[]{"elapsedMs","points"})
                    if(stored.getDouble(field)!=answer.getDouble(field)) throw new Exception("Résultat durable incohérent");
            }
            database.setTransactionSuccessful();
        } finally { database.endTransaction(); }
        // Aucun indicateur de confirmation tant que endTransaction n'a pas réussi.
        result.put("confirmed",confirmed);return result;
    }
    @Override public void close() { database.close(); }
}
