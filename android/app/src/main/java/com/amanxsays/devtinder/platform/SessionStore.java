package com.amanxsays.devtinder.platform;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** Encrypted app-private values. Keystore keys and ciphertext are excluded from backup. */
public final class SessionStore {
    private static final String ALIAS = "devtinder.local.v1";
    private final SharedPreferences preferences;
    public SessionStore(Context context) {
        preferences = context.getSharedPreferences("devtinder_secure_v1", Context.MODE_PRIVATE);
    }
    private static synchronized SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }
    public synchronized String read(String name) throws Exception {
        String saved = preferences.getString(name, null);
        if (saved == null) return null;
        String[] fields = saved.split(":", 2);
        if (fields.length != 2) throw new IllegalStateException("Invalid local encrypted value");
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(fields[0], Base64.NO_WRAP)));
        cipher.updateAAD(name.getBytes(StandardCharsets.UTF_8));
        return new String(cipher.doFinal(Base64.decode(fields[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }
    public synchronized void write(String name, String value) throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, key());
        cipher.updateAAD(name.getBytes(StandardCharsets.UTF_8));
        String encoded = Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP) + ":"
            + Base64.encodeToString(cipher.doFinal(value.getBytes(StandardCharsets.UTF_8)), Base64.NO_WRAP);
        if (!preferences.edit().putString(name, encoded).commit()) throw new IllegalStateException("Could not save local data");
    }
    public synchronized void remove(String name) {
        if (!preferences.edit().remove(name).commit()) throw new IllegalStateException("Could not clear local data");
    }
}
