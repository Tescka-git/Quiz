package fr.kuikuiz.probe;

/** Le téléphone héberge le jeu ; aucun droit animateur n'est attribué au service. */
public final class QuizService extends android.app.Service {
    private static volatile String status="Maquette arrêtée.";
    private final Object lifecycle=new Object();
    private QuizHost host;
    private boolean started;
    private volatile boolean stopping;
    static synchronized void write(String message){android.util.Log.i("KuikuizGame",message);if(status.length()>12000)status="";status+="\n"+message;}
    static String status(){return status;}
    @Override public android.os.IBinder onBind(android.content.Intent intent){return null;}
    @Override public int onStartCommand(android.content.Intent intent,int flags,int id){
        if(intent!=null&&"STOP".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}
        android.app.NotificationManager manager=getSystemService(android.app.NotificationManager.class);
        manager.createNotificationChannel(new android.app.NotificationChannel("game","Maquette Kuikuiz",android.app.NotificationManager.IMPORTANCE_LOW));
        android.app.PendingIntent open=android.app.PendingIntent.getActivity(this,2,new android.content.Intent(this,MainActivity.class),android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.PendingIntent stop=android.app.PendingIntent.getService(this,3,new android.content.Intent(this,QuizService.class).setAction("STOP"),android.app.PendingIntent.FLAG_IMMUTABLE);
        android.app.Notification notification=new android.app.Notification.Builder(this,"game").setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Kuikuiz — maquette hébergée sur Android").setContentText("HTTP 8080 · WebSocket 8788 · réseau local de test")
            .setContentIntent(open).setOngoing(true).addAction(new android.app.Notification.Action.Builder(null,"Arrêter",stop).build()).build();
        if(android.os.Build.VERSION.SDK_INT>=29)startForeground(2,notification,android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_CONNECTED_DEVICE);else startForeground(2,notification);
        if(!started){started=true;new Thread(()->{synchronized(lifecycle){if(stopping)return;host=new QuizHost(this);
            try{host.start();}catch(Exception e){write("Démarrage impossible : "+e.getClass().getSimpleName()+" / "+e.getMessage());host.close();host=null;new android.os.Handler(getMainLooper()).post(()->stopSelf());}
        }},"game-start").start();}
        return START_NOT_STICKY;
    }
    @Override public void onDestroy(){stopping=true;new Thread(()->{synchronized(lifecycle){if(host!=null){host.close();host=null;}write("Maquette arrêtée.");}},"game-stop").start();stopForeground(STOP_FOREGROUND_REMOVE);super.onDestroy();}
}
