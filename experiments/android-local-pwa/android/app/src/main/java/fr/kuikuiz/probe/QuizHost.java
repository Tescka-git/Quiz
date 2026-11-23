package fr.kuikuiz.probe;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.SystemClock;
import fi.iki.elonen.NanoHTTPD;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/** Adaptateur expérimental : réseau et SQLite natifs, règles et projection JavaScript communes. */
final class QuizHost implements AutoCloseable {
    private final Context context;
    private final boolean secure;
    private final int httpPort,socketPort;
    private final String httpScheme,socketScheme;
    private final ScheduledThreadPoolExecutor worker = new ScheduledThreadPoolExecutor(1);
    private final Map<WebSocket,JSONObject> identities = new HashMap<>();
    private final Map<WebSocket,long[]> limits = new HashMap<>();
    private final SecureRandom random = new SecureRandom();
    private EngineBridge engine;
    private SQLiteDatabase db;
    private WebSocketServer sockets;
    private NanoHTTPD http;
    private JSONArray questions;
    private volatile boolean closing;
    QuizHost(Context context,boolean secure) {
        this.context=context.getApplicationContext();this.secure=secure;
        httpPort=secure?8443:8080;socketPort=secure?8789:8788;
        httpScheme=secure?"https://":"http://";socketScheme=secure?"wss://":"ws://";
    }
    private String socketAuthority(String host){return host.replaceFirst(":"+httpPort+"$",":"+socketPort);}
    private static JSONObject object(String text) throws Exception { return new JSONObject(text); }
    private static double now() { return SystemClock.elapsedRealtime(); }
    private String textAsset(String name) throws Exception { return new String(EngineBridge.asset(context,name),StandardCharsets.UTF_8); }
    private String token(int count) { byte[] bytes=new byte[count];random.nextBytes(bytes);StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString(); }
    private static String hash(String value) throws Exception {StringBuilder out=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)))out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
    private JSONObject row(String sql,String... args) throws Exception {
        try(Cursor cursor=db.rawQuery(sql,args)){
            if(!cursor.moveToFirst())return null;JSONObject row=new JSONObject();
            for(int i=0;i<cursor.getColumnCount();i++)row.put(cursor.getColumnName(i),cursor.getString(i));return row;
        }
    }
    private JSONArray players(String id) throws Exception {
        JSONArray result=new JSONArray();try(Cursor c=db.rawQuery("SELECT id,name FROM mock_players WHERE room_id=? ORDER BY rowid",new String[]{id})){
            while(c.moveToNext())result.put(new JSONObject().put("id",c.getString(0)).put("name",c.getString(1)));}return result;
    }
    private JSONObject room(String id) throws Exception {JSONObject r=row("SELECT * FROM mock_rooms WHERE id=?",id);if(r==null)throw new Exception("unknown-room");return r;}
    private JSONObject state(String id) throws Exception {JSONObject r=row("SELECT state_json FROM quiz_sessions WHERE id=?",id);return r==null?null:object(r.getString("state_json"));}
    private void save(String id,JSONObject state) { db.execSQL("UPDATE quiz_sessions SET state_json=? WHERE id=?",new Object[]{state.toString(),id}); }
    private JSONObject authenticate(String role,String id,String secret) throws Exception {
        JSONObject room=room(id),identity=new JSONObject().put("role",role).put("roomId",id);
        if("host".equals(role)){if(!hash(secret).equals(room.getString("host_hash")))throw new Exception("unauthorized");return identity;}
        JSONObject player=row("SELECT id FROM mock_players WHERE room_id=? AND token_hash=?",id,hash(secret));
        if(player==null)throw new Exception("unauthorized");return identity.put("playerId",player.getString("id"));
    }
    private JSONObject create() throws Exception {
        // Maquette de laboratoire : conserver l'unicité même pour les anciennes salles.
        String code=null;
        for(int attempt=0;attempt<10000;attempt++){
            String candidate=String.format(java.util.Locale.ROOT,"%04d",(1234+attempt)%10000);
            if(row("SELECT id FROM mock_rooms WHERE code=?",candidate)==null){code=candidate;break;}
        }
        if(code==null)throw new Exception("Laboratory room codes exhausted");
        String id=token(24),secret=token(24);
        db.execSQL("INSERT INTO mock_rooms VALUES (?,?,?,?,?)",new Object[]{id,code,hash(secret),engine.sha256,questions.toString()});
        return new JSONObject().put("role","host").put("roomId",id).put("token",secret).put("code",code);
    }
    private JSONObject join(JSONObject message) throws Exception {
        JSONObject room=row("SELECT * FROM mock_rooms WHERE code=?",message.getString("code"));if(room==null)throw new Exception("unknown-room");
        String roomId=room.getString("id");JSONObject admission=engine.json("kuikuizAdmission("+(state(roomId)!=null)+")");if(admission.has("error"))throw new Exception(admission.getString("error"));
        String id=token(24),secret=token(24);db.execSQL("INSERT INTO mock_players VALUES (?,?,?,?)",new Object[]{id,roomId,message.getString("name"),hash(secret)});
        return new JSONObject().put("v",1).put("type","credentials").put("role","player").put("roomId",roomId).put("playerId",id).put("token",secret).put("code",room.getString("code"));
    }
    private JSONObject snapshot(JSONObject identity) throws Exception {
        String id=identity.getString("roomId");JSONObject r=room(id),quiz=state(id);
        JSONObject view=new JSONObject().put("id",id).put("code",r.getString("code")).put("questions",new JSONArray(r.getString("question_json")));
        return engine.json("kuikuizSnapshot("+(quiz==null?"null":EngineBridge.value(quiz))+","+EngineBridge.value(view)+","+players(id).toString()+","+EngineBridge.value(identity)+","+now()+")");
    }
    private JSONObject dispatch(String id,JSONObject command,String questionId) throws Exception {
        JSONObject output;
        db.beginTransaction();
        try {
            output=engine.json("KuikuizEngine.applyQuiz("+EngineBridge.value(state(id))+","+EngineBridge.value(command)+","+now()+","+JSONObject.quote(questionId)+")");
            String status=output.getString("status");
            if("accepted-in-memory".equals(status)){
                JSONObject answer=output.getJSONObject("answer");
                db.execSQL("INSERT INTO quiz_answers VALUES (?,?,?,?,?)",new Object[]{id,questionId,answer.getString("submissionId"),answer.getString("playerId"),answer.toString()});
            }
            save(id,output.getJSONObject("state"));
            boolean confirmed="accepted-in-memory".equals(status)||"duplicate".equals(status);
            if(confirmed){JSONObject answer=output.getJSONObject("answer");JSONObject stored=row("SELECT answer_json FROM quiz_answers WHERE session_id=? AND question_id=? AND submission_id=?",id,questionId,answer.getString("submissionId"));
                if(stored==null||!stored.getString("answer_json").equals(answer.toString()))throw new Exception("Inconsistent stored answer");}
            output.put("confirmed",confirmed);db.setTransactionSuccessful();
        } finally { db.endTransaction(); }
        return output; // endTransaction a effectué le COMMIT avant toute confirmation réseau.
    }
    private JSONObject command(JSONObject identity,JSONObject message) throws Exception {
        String id=identity.getString("roomId");
        JSONObject command=engine.json("kuikuizCommand("+EngineBridge.value(identity)+","+EngineBridge.value(message)+","+(state(id)!=null)+")");
        if(command.has("error"))throw new Exception(command.getString("error"));
        String type=command.getString("type");
        if("sync".equals(type))return null;
        if("start".equals(type)){
            JSONArray roster=players(id);if(roster.length()==0)throw new Exception("no-players");
            JSONArray ids=new JSONArray();for(int i=0;i<roster.length();i++)ids.put(roster.getJSONObject(i).getString("id"));
            JSONArray content=new JSONArray(room(id).getString("question_json"));
            // Le contenu est projeté vers le contrat métier, sans règle de jeu native.
            JSONArray definitions=new JSONArray();for(int i=0;i<content.length();i++){
                JSONObject q=content.getJSONObject(i),definition=new JSONObject(q.toString());JSONArray options=new JSONArray(),choices=q.getJSONArray("choices");
                for(int j=0;j<choices.length();j++)options.put(choices.getJSONObject(j).getString("id"));definition.remove("choices");definition.remove("text");definition.put("options",options);definitions.put(definition);
            }
            JSONObject initial=engine.json("KuikuizEngine.createQuiz("+definitions+","+ids+","+now()+")");
            db.execSQL("INSERT INTO quiz_sessions VALUES (?,?)",new Object[]{id,initial.toString()});return null;
        }
        return dispatch(id,command,message.getString("questionId"));
    }
    private void send(WebSocket socket,JSONObject message){if(socket.isOpen())socket.send(message.toString());}
    private void error(WebSocket socket,Exception error){
        String code=error.getMessage();if(code==null||!java.util.Arrays.asList("invalid-message","unknown-room","unauthorized","already-started","forbidden","no-players","not-started").contains(code))code="storage-failed";
        try{send(socket,new JSONObject().put("v",1).put("type","error").put("code",code));}catch(Exception ignored){}
    }
    private void publish(){if(closing)return;for(Map.Entry<WebSocket,JSONObject> entry:identities.entrySet())try{send(entry.getKey(),snapshot(entry.getValue()));}catch(Exception e){error(entry.getKey(),e);}}
    private void message(WebSocket socket,String raw){
        if(closing||!socket.isOpen())return;
        try{
            long[] limit=limits.get(socket);if(limit==null)return;
            long time=SystemClock.elapsedRealtime();if(time-limit[0]>1000){limit[0]=time;limit[1]=0;}if(++limit[1]>40||raw.getBytes(StandardCharsets.UTF_8).length>4096){socket.close(1008,"Limite de messages");return;}
            JSONObject parsed;
            try{parsed=engine.json("parseClientMessage("+JSONObject.quote(raw)+")");}catch(Exception e){throw new Exception("invalid-message");}
            String type=parsed.getString("type");JSONObject identity=identities.get(socket);
            if(identity==null){
                if("join".equals(type)){JSONObject credentials=join(parsed);identity=authenticate("player",credentials.getString("roomId"),credentials.getString("token"));send(socket,credentials);}
                else if("host".equals(type)||"player".equals(type))identity=authenticate(type,parsed.getString("roomId"),parsed.getString("token"));
                else throw new Exception("unauthorized");identities.put(socket,identity);publish();return;
            }
            if(java.util.Arrays.asList("host","player","join").contains(type))throw new Exception("forbidden");
            JSONObject result=command(identity,parsed);
            if("answer".equals(type))send(socket,new JSONObject().put("v",1).put("type","answer-result").put("questionId",parsed.getString("questionId"))
                .put("submissionId",parsed.getString("submissionId")).put("confirmed",result.getBoolean("confirmed")).put("status",result.getString("status")));
            publish();
        }catch(Exception e){error(socket,e);}
    }
    void start() throws Exception {
        final LocalTls material=secure?LocalTls.load(context):null;
        final javax.net.ssl.SSLContext tls=material==null?null:material.context;
        // Toutes les utilisations du pont et de SQLite se font sur ce même worker.
        worker.submit(()->{try{
            engine=new EngineBridge(context);engine.evaluate(textAsset("mock-protocol.js"));engine.evaluate(textAsset("mock-presentation.js"));questions=new JSONArray(textAsset("mock-quiz.json"));
            // Nouveau comportement métier : conserver les bases précédentes sans les réinterpréter.
            db=context.openOrCreateDatabase("kuikuiz-playable-v4.db",Context.MODE_PRIVATE,null);db.disableWriteAheadLogging();db.setForeignKeyConstraintsEnabled(true);
            try(Cursor journal=db.rawQuery("PRAGMA journal_mode=DELETE",null)){if(!journal.moveToFirst()||!"delete".equalsIgnoreCase(journal.getString(0)))throw new Exception("Mode de journal SQLite indisponible");}
            if(android.os.Build.VERSION.SDK_INT>=30)db.execPerConnectionSQL("PRAGMA synchronous=EXTRA",null);else db.execSQL("PRAGMA synchronous=EXTRA");
            db.execSQL("CREATE TABLE IF NOT EXISTS mock_rooms(id TEXT PRIMARY KEY,code TEXT UNIQUE NOT NULL,host_hash TEXT NOT NULL,engine_hash TEXT NOT NULL,question_json TEXT NOT NULL)");
            db.execSQL("CREATE TABLE IF NOT EXISTS mock_players(id TEXT PRIMARY KEY,room_id TEXT NOT NULL REFERENCES mock_rooms(id),name TEXT NOT NULL,token_hash TEXT UNIQUE NOT NULL)");
            db.execSQL("CREATE TABLE IF NOT EXISTS quiz_sessions(id TEXT PRIMARY KEY,state_json TEXT NOT NULL)");
            db.execSQL("CREATE TABLE IF NOT EXISTS quiz_answers(session_id TEXT NOT NULL REFERENCES quiz_sessions(id),question_id TEXT NOT NULL,submission_id TEXT NOT NULL,player_id TEXT NOT NULL,answer_json TEXT NOT NULL,PRIMARY KEY(session_id,question_id,submission_id),UNIQUE(session_id,question_id,player_id))");
            db.beginTransaction();try(Cursor c=db.rawQuery("SELECT id,engine_hash FROM mock_rooms",null)){
                while(c.moveToNext()){
                    if(!engine.sha256.equals(c.getString(1)))throw new Exception("Base liée à un autre moteur : migration requise");
                    JSONObject previous=state(c.getString(0));if(previous!=null)save(c.getString(0),engine.json("KuikuizEngine.recoverQuiz("+EngineBridge.value(previous)+","+now()+")"));
                }db.setTransactionSuccessful();
            }finally{db.endTransaction();}
            return null;
        }catch(Exception e){throw new java.util.concurrent.CompletionException(e);}}).get(45,TimeUnit.SECONDS);
        final java.util.concurrent.CompletableFuture<Void> socketReady=new java.util.concurrent.CompletableFuture<>();
        sockets=new WebSocketServer(new InetSocketAddress("0.0.0.0",socketPort)){
            @Override public void onStart(){setConnectionLostTimeout(15);QuizService.write("WebSocket de jeu actif : port "+socketPort+". Moteur "+engine.sha256);socketReady.complete(null);}
            @Override public void onOpen(WebSocket socket,ClientHandshake handshake){
                if(closing){socket.close(1001,"Arrêt en cours");return;}
                String host=handshake.getFieldValue("Host"),origin=handshake.getFieldValue("Origin");
                String expected=httpScheme+host.replaceFirst(":"+socketPort+"$",":"+httpPort);
                if(!"/socket".equals(handshake.getResourceDescriptor())||!expected.equals(origin)){socket.close(1008,"Origine refusée");return;}
                worker.execute(()->limits.put(socket,new long[]{SystemClock.elapsedRealtime(),0}));
                worker.schedule(()->{if(!identities.containsKey(socket))socket.close(1008,"Identification requise");},10,TimeUnit.SECONDS);
            }
            @Override public void onMessage(WebSocket socket,String raw){if(!closing)worker.execute(()->message(socket,raw));}
            @Override public void onClose(WebSocket socket,int code,String reason,boolean remote){if(!closing)worker.execute(()->{identities.remove(socket);limits.remove(socket);});}
            @Override public void onError(WebSocket socket,Exception e){if(socket==null)socketReady.completeExceptionally(e);QuizService.write("Erreur réseau : "+e.getClass().getSimpleName());}
        };
        sockets.setReuseAddr(true);
        if(tls!=null)sockets.setWebSocketFactory(new org.java_websocket.server.DefaultSSLWebSocketServerFactory(tls));
        sockets.start();
        socketReady.get(10,TimeUnit.SECONDS);
        http=new NanoHTTPD("0.0.0.0",httpPort){
            @Override public Response serve(IHTTPSession request){
                try{
                    String path=request.getUri(),host=request.getHeaders().get("host");Response response;
                    if("/connection.json".equals(path)&&request.getMethod()==Method.GET){
                        response=newFixedLengthResponse(Response.Status.OK,"application/json",new JSONObject().put("socketPath",socketScheme+socketAuthority(host)+"/socket").toString());
                    }else if("/api/rooms".equals(path)&&request.getMethod()==Method.POST){
                        if(!(httpScheme+host).equals(request.getHeaders().get("origin")))return newFixedLengthResponse(Response.Status.FORBIDDEN,MIME_PLAINTEXT,"Origine refusée");
                        JSONObject created=worker.submit(()->create()).get(25,TimeUnit.SECONDS);response=newFixedLengthResponse(Response.Status.CREATED,"application/json",created.toString());
                    }else{
                        String name="/".equals(path)||"/animateur".equals(path)||"/joueur".equals(path)?"index.html":
                            java.util.Arrays.asList("/app.js","/offline.js","/sw.js","/style.css","/manifest.webmanifest","/icon.svg").contains(path)?path.substring(1):null;
                        if(request.getMethod()!=Method.GET||name==null)return newFixedLengthResponse(Response.Status.NOT_FOUND,MIME_PLAINTEXT,"Introuvable");
                        response=newFixedLengthResponse(Response.Status.OK,name.endsWith(".js")?"text/javascript; charset=utf-8":name.endsWith(".css")?"text/css; charset=utf-8":name.endsWith(".webmanifest")?"application/manifest+json":name.endsWith(".svg")?"image/svg+xml":"text/html; charset=utf-8",textAsset(name));
                    }
                    response.addHeader("Cache-Control","no-store");response.addHeader("X-Content-Type-Options","nosniff");response.addHeader("Referrer-Policy","no-referrer");
                    response.addHeader("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' "+socketScheme+socketAuthority(host)+"; frame-ancestors 'none'; base-uri 'none'");return response;
                }catch(Exception e){return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,MIME_PLAINTEXT,"Service indisponible");}
            }
        };
        if(tls!=null)http.makeSecure(tls.getServerSocketFactory(),null);
        http.start(30000,false);
        worker.scheduleAtFixedRate(()->publish(),500,500,TimeUnit.MILLISECONDS);
        worker.scheduleAtFixedRate(()->{if(closing)return;try(Cursor c=db.rawQuery("SELECT id,state_json FROM quiz_sessions",null)){
            while(c.moveToNext()){JSONObject current=object(c.getString(1)).getJSONObject("current");if("open".equals(current.getString("phase"))&&current.getDouble("elapsedMs")<current.getJSONObject("question").getDouble("durationMs"))
                dispatch(c.getString(0),new JSONObject().put("type","checkpoint"),current.getJSONObject("question").getString("id"));}
        }catch(Exception e){QuizService.write("Checkpoint non sauvegardé : "+e.getClass().getSimpleName());}},1,1,TimeUnit.SECONDS);
        QuizService.write(secure?"HTTPS/WSS de laboratoire actif. L'adresse doit être couverte par le certificat.":"HTTP/ws local actif — réseau de confiance uniquement.");
        for(java.net.NetworkInterface network:java.util.Collections.list(java.net.NetworkInterface.getNetworkInterfaces()))
            for(java.net.InetAddress address:java.util.Collections.list(network.getInetAddresses()))
                if(address instanceof java.net.Inet4Address&&!address.isLoopbackAddress()){
                    if(material==null||material.coversIp(address.getHostAddress()))QuizService.write("Ouvrir "+httpScheme+address.getHostAddress()+":"+httpPort);
                    else QuizService.write("Adresse "+address.getHostAddress()+" hors du certificat TLS de test : ne pas l'utiliser pour cet essai HTTPS.");
                }
    }
    @Override public void close(){
        closing=true;if(http!=null)http.stop();if(sockets!=null)try{sockets.stop(1000);}catch(InterruptedException e){Thread.currentThread().interrupt();}
        worker.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);worker.setContinueExistingPeriodicTasksAfterShutdownPolicy(false);
        // shutdown() peut annuler même une tâche immédiate dans ce ScheduledThreadPoolExecutor.
        // Attendre donc explicitement le nettoyage AVANT d'arrêter l'exécuteur.
        java.util.concurrent.Future<?> cleanup=worker.submit(()->{try{if(db!=null)db.close();}finally{if(engine!=null)engine.close();}});
        try{cleanup.get(30,TimeUnit.SECONDS);}
        catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException("Arrêt du moteur interrompu",e);}
        catch(Exception e){throw new IllegalStateException("Arrêt du moteur incomplet ; redémarrer l'application avant un nouvel hébergement",e);}
        finally{worker.shutdown();}
    }
}
