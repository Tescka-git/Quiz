package fr.kuikuiz.probe;

/** Le téléphone héberge le jeu ; aucun droit animateur n'est attribué au service. */
public final class QuizService extends android.app.Service {
    private static volatile String status="Maquette arrêtée.";
    // File commune aux instances successives : terminer l'ancien sandbox avant le suivant.
    private static final java.util.concurrent.ExecutorService lifecycle=java.util.concurrent.Executors.newSingleThreadExecutor(r->new Thread(r,"game-lifecycle"));
    private QuizHost host;
    private boolean started;
    private boolean secure;
    private volatile boolean stopping;
    static synchronized void write(String message){android.util.Log.i("KuikuizGame",message);if(status.length()>12000)status="";status+="\n"+message;}
    static String status(){return status;}
    @Override public android.os.IBinder onBind(android.content.Intent intent){return null;}
    @Override public int onStartCommand(android.content.Intent intent,int flags,int id){
        if(intent!=null&&"STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        boolean requested=intent!=null&&intent.getBooleanExtra("secure",false);
        if(started){if(requested!=secure)write("Arrêter la maquette avant de changer de mode HTTP/HTTPS.");return START_NOT_STICKY;}
        secure=requested;
        android.app.NotificationManager manager=getSystemService(android.app.NotificationManager.class);
        manager.createNotificationChannel(new android.app.NotificationChannel("game","Maquette Kuikuiz",android.app.NotificationManager.IMPORTANCE_LOW));
        android.app.PendingIntent open=android.app.PendingIntent.getActivity(this,2,new android.content.Intent(this,MainActivity.class),android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.PendingIntent stop=android.app.PendingIntent.getService(this,3,new android.content.Intent(this,QuizService.class).setAction("STOP"),android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification notification=new android.app.Notification.Builder(this,"game").setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Kuikuiz — maquette hébergée sur Android").setContentText(secure?"HTTPS 8443 · WSS 8789 · certificat de laboratoire":"HTTP 8080 · WebSocket 8788 · réseau local de test")
            .setContentIntent(open).setOngoing(true).addAction(new android.app.Notification.Action.Builder(null,"Arrêter",stop).build()).build();
        if(android.os.Build.VERSION.SDK_INT>=29)startForeground(2,notification,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);else startForeground(2,notification);
        if(!started){started=true;lifecycle.execute(()->{if(stopping)return;host=new QuizHost(this,secure);
            try{host.start();}catch(Exception e){write("Démarrage impossible : "+e.getClass().getSimpleName()+" / "+e.getMessage());host.close();host=null;new android.os.Handler(getMainLooper()).post(()->stopSelf());}
        });}
        return START_NOT_STICKY;
    }
    @Override public void onDestroy(){stopping=true;lifecycle.execute(()->{if(host!=null){host.close();host=null;}write("Maquette arrêtée.");});stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
}
