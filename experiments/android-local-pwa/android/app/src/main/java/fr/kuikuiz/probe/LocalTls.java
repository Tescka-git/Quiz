package fr.kuikuiz.probe;

import android.content.Context;
import java.io.File;
import java.io.FileInputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.KeyStore;
import java.util.Arrays;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;

/** Certificat de laboratoire dans les fichiers privés ; aucun secret embarqué dans l'APK. */
final class LocalTls {
    final SSLContext context;
    private final java.security.cert.X509Certificate certificate;
    private LocalTls(SSLContext context,java.security.cert.X509Certificate certificate){this.context=context;this.certificate=certificate;}
    boolean coversIp(String address) throws Exception {
        java.util.Collection<java.util.List<?>> names=certificate.getSubjectAlternativeNames();
        if(names!=null)for(java.util.List<?> name:names)if(Integer.valueOf(7).equals(name.get(0))&&address.equals(name.get(1)))return true;
        return false;
    }
    static LocalTls load(Context context) throws Exception {
        File directory=new File(context.getFilesDir(),"tls");
        File container=new File(directory,"android.p12"),secret=new File(directory,"password.txt");
        if(!container.isFile()||!secret.isFile())throw new Exception("TLS de test absent : préparer les fichiers privés avant de démarrer HTTPS");
        char[] password=new String(Files.readAllBytes(secret.toPath()),StandardCharsets.UTF_8).trim().toCharArray();
        try(FileInputStream input=new FileInputStream(container)){
            KeyStore keys=KeyStore.getInstance("PKCS12");keys.load(input,password);
            java.security.cert.X509Certificate certificate=null;
            java.util.Enumeration<String> aliases=keys.aliases();while(aliases.hasMoreElements()){
                String alias=aliases.nextElement();if(keys.isKeyEntry(alias)&&keys.getCertificate(alias) instanceof java.security.cert.X509Certificate){certificate=(java.security.cert.X509Certificate)keys.getCertificate(alias);break;}
            }
            if(certificate==null)throw new Exception("Certificat serveur absent du conteneur TLS");certificate.checkValidity();
            KeyManagerFactory factory=KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());factory.init(keys,password);
            SSLContext tls=SSLContext.getInstance("TLS");tls.init(factory.getKeyManagers(),null,null);return new LocalTls(tls,certificate);
        }finally{Arrays.fill(password,'\0');}
    }
}
