package com.amanxsays.devtinder.platform;

import android.Manifest;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(name = "DevTinderSpeech", permissions = {
    @Permission(alias = "microphone", strings = { Manifest.permission.RECORD_AUDIO })
})
public class SpeechPlugin extends Plugin {
    private final Handler main = new Handler(Looper.getMainLooper());
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady;
    private boolean ttsInitializing = true, waitingPermission;
    private final ArrayList<PluginCall> capabilitiesWaiting = new ArrayList<>();
    private String captureId, speakingId;
    private Runnable expiry, finishing;
    private int generation;

    @Override public void load() {
        main.post(() -> {
            tts = new TextToSpeech(getContext(), status -> main.post(() -> {
                ttsReady = status == TextToSpeech.SUCCESS; ttsInitializing = false;
                for (PluginCall waiting : new ArrayList<>(capabilitiesWaiting)) resolveCapabilities(waiting);
            }));
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String id) {}
                @Override public void onDone(String id) { main.post(() -> {
                    if (id.equals(speakingId)) { speakingId = null; emit(id, "speechEnd", null, null); }
                }); }
                @Override public void onError(String id) { main.post(() -> {
                    if (id.equals(speakingId)) { speakingId = null; emit(id, "speechError", null, "synthesis-failed"); }
                }); }
            });
        });
    }
    private void emit(String sessionId, String type, String text, String error) {
        if (sessionId == null) return;
        JSObject data = new JSObject(); data.put("sessionId", sessionId); data.put("type", type);
        if (text != null) data.put("text", text);
        if (error != null) data.put("error", error);
        notifyListeners("speechEvent", data);
    }
    @PluginMethod public void getCapabilities(PluginCall call) {
        main.post(() -> {
            if (!ttsInitializing) { resolveCapabilities(call); return; }
            capabilitiesWaiting.add(call);
            main.postDelayed(() -> { if (capabilitiesWaiting.contains(call)) resolveCapabilities(call); }, 5000);
        });
    }
    private void resolveCapabilities(PluginCall call) {
        capabilitiesWaiting.remove(call);
        JSObject data = new JSObject();
        data.put("recognition", SpeechRecognizer.isRecognitionAvailable(getContext()));
        data.put("synthesis", ttsReady); call.resolve(data);
    }
    @PluginMethod public void start(PluginCall call) {
        main.post(() -> {
            if (captureId != null) { call.reject("Another dictation session is active.", "SPEECH_BUSY"); return; }
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) { call.reject("English dictation is unavailable. Keep typing.", "SPEECH_UNSUPPORTED"); return; }
            if (!validId(call.getString("sessionId"))) { call.reject("Invalid speech session", "INVALID_SESSION"); return; }
            captureId = call.getString("sessionId"); generation++;
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                waitingPermission = true;
                requestPermissionForAlias("microphone", call, "microphoneResult"); return;
            }
            begin(call);
        });
    }
    @PermissionCallback private void microphoneResult(PluginCall call) {
        main.post(() -> {
            waitingPermission = false;
            if (!call.getString("sessionId", "").equals(captureId)) { call.reject("Dictation cancelled.", "SPEECH_CANCELLED"); return; }
            if (getPermissionState("microphone") != PermissionState.GRANTED) {
                String id = captureId; destroyCapture(); emit(id, "error", null, "not-allowed");
                call.reject("Microphone permission was denied. Keep typing.", "MICROPHONE_DENIED"); return;
            }
            begin(call);
        });
    }
    private boolean validId(String id) { return id != null && !id.trim().isEmpty() && id.length() <= 160; }
    private void begin(PluginCall call) {
        String id = captureId; int ownGeneration = generation;
        try {
            stopTts();
            recognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            recognizer.setRecognitionListener(new RecognitionListener() {
                private boolean current() { return ownGeneration == generation && id.equals(captureId); }
                @Override public void onReadyForSpeech(Bundle params) { if (current()) emit(id, "start", null, null); }
                @Override public void onBeginningOfSpeech() {}
                @Override public void onRmsChanged(float rms) {}
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onError(int code) {
                    if (!current()) return;
                    String error = switch (code) {
                        case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed";
                        case SpeechRecognizer.ERROR_AUDIO -> "audio-capture";
                        case SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network";
                        case SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech";
                        case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED, SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "language-not-supported";
                        default -> "recognition-failed";
                    };
                    destroyCapture(); emit(id, "error", null, error);
                }
                @Override public void onResults(Bundle results) {
                    if (!current()) return;
                    String text = firstResult(results);
                    emit(id, "final", text, null); destroyCapture(); emit(id, "end", null, null);
                }
                @Override public void onPartialResults(Bundle results) { if (current()) emit(id, "partial", firstResult(results), null); }
                @Override public void onEvent(int event, Bundle params) {}
            });
            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-IN");
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            recognizer.startListening(intent);
            int duration = Math.min(60000, Math.max(1000, call.getInt("maxDurationMs", 60000)));
            expiry = () -> stopCapture(id);
            main.postDelayed(expiry, duration);
            call.resolve();
        } catch (Exception error) { destroyCapture(); emit(id, "error", null, "recognition-failed"); call.reject("Could not start dictation. Keep typing.", "SPEECH_START_FAILED"); }
    }
    private String firstResult(Bundle results) {
        ArrayList<String> values = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return values == null || values.isEmpty() ? "" : values.get(0);
    }
    private void destroyCapture() {
        generation++; captureId = null; waitingPermission = false;
        if (expiry != null) main.removeCallbacks(expiry);
        if (finishing != null) main.removeCallbacks(finishing);
        expiry = null; finishing = null;
        if (recognizer != null) {
            try { recognizer.cancel(); recognizer.destroy(); } catch (Exception ignored) {}
            recognizer = null;
        }
    }
    private void stopCapture(String id) {
        if (!id.equals(captureId)) return;
        if (recognizer == null) { destroyCapture(); emit(id, "end", null, null); return; }
        try { recognizer.stopListening(); } catch (Exception ignored) {}
        finishing = () -> { if (id.equals(captureId)) { destroyCapture(); emit(id, "end", null, null); } };
        main.postDelayed(finishing, 2000);
    }
    @PluginMethod public void stop(PluginCall call) { main.post(() -> { stopCapture(call.getString("sessionId", "")); call.resolve(); }); }
    @PluginMethod public void cancel(PluginCall call) { main.post(() -> {
        if (call.getString("sessionId", "").equals(captureId)) destroyCapture();
        call.resolve();
    }); }
    @PluginMethod public void speak(PluginCall call) { main.post(() -> {
        String id = call.getString("sessionId", ""), text = call.getString("text", "");
        if (!validId(id) || text.trim().isEmpty() || text.length() > TextToSpeech.getMaxSpeechInputLength()) { call.reject("Invalid speech content.", "INVALID_SPEECH"); return; }
        if (!ttsReady || tts == null) { call.reject("Read aloud is unavailable. The text is still available.", "TTS_UNAVAILABLE"); return; }
        destroyCapture(); stopTts();
        int language = tts.setLanguage(Locale.forLanguageTag("en-IN"));
        if (language < TextToSpeech.LANG_AVAILABLE && tts.setLanguage(Locale.ENGLISH) < TextToSpeech.LANG_AVAILABLE) {
            call.reject("An English voice is not installed.", "TTS_LANGUAGE_UNAVAILABLE"); return;
        }
        tts.setSpeechRate(1f); speakingId = id;
        if (tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.ERROR) {
            speakingId = null; call.reject("Read aloud could not start.", "TTS_FAILED"); return;
        }
        call.resolve();
    }); }
    private void stopTts() { speakingId = null; if (tts != null) tts.stop(); }
    @PluginMethod public void stopSpeaking(PluginCall call) { main.post(() -> { stopTts(); call.resolve(); }); }
    @Override protected void handleOnPause() { main.post(() -> {
        // The microphone permission dialog may pause the Activity itself.
        if (!waitingPermission) { String id = captureId; destroyCapture(); emit(id, "end", null, null); }
        stopTts();
    }); }
    @Override protected void handleOnStop() { main.post(() -> {
        String id = captureId; destroyCapture(); emit(id, "end", null, null); stopTts();
    }); }
    @Override protected void handleOnDestroy() { main.post(() -> {
        destroyCapture(); stopTts(); if (tts != null) { tts.shutdown(); tts = null; } ttsReady = false; ttsInitializing = false;
        for (PluginCall waiting : new ArrayList<>(capabilitiesWaiting)) resolveCapabilities(waiting);
    }); }
}
