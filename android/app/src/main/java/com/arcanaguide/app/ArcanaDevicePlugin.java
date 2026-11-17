package com.arcanaguide.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.IOException;
import java.io.OutputStream;
import java.util.Locale;

@CapacitorPlugin(name = "ArcanaDevice")
public class ArcanaDevicePlugin extends Plugin {
    private static final int MAX_FILE_BYTES = 10 * 1024 * 1024;
    private TextToSpeech narrator;
    private boolean narratorReady;

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename = call.getString("filename", "");
        String mime = call.getString("mime", "");
        String data = call.getString("base64", "");
        boolean supported = (mime.equals("application/json") && filename.endsWith(".json"))
            || (mime.equals("image/png") && filename.endsWith(".png"));
        if (!supported || !filename.matches("[a-zA-Z0-9_.-]{1,100}")
                || data.isEmpty() || data.length() > 4 * ((MAX_FILE_BYTES + 2) / 3)) {
            call.reject("This file cannot be saved.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType(mime);
        intent.putExtra(Intent.EXTRA_TITLE, filename);
        startActivityForResult(call, intent, "saveDocument");
    }

    @ActivityCallback
    private void saveDocument(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri uri = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || uri == null) {
            JSObject response = new JSObject();
            response.put("saved", false);
            call.resolve(response);
            return;
        }
        execute(() -> {
            try (OutputStream stream = getContext().getContentResolver().openOutputStream(uri, "w")) {
                byte[] data = Base64.decode(call.getString("base64", ""), Base64.DEFAULT);
                if (stream == null || data.length > MAX_FILE_BYTES) throw new IOException();
                stream.write(data);
                stream.flush();
                JSObject response = new JSObject();
                response.put("saved", true);
                call.resolve(response);
            } catch (IOException | IllegalArgumentException | SecurityException error) {
                call.reject("The file could not be written to that folder.");
            }
        });
    }

    @PluginMethod
    public void print(PluginCall call) {
        String title = call.getString("title", "Arcana reading");
        String html = call.getString("html", "");
        boolean currentPage = Boolean.TRUE.equals(call.getBoolean("currentPage"));
        if (!currentPage && (html.isEmpty() || html.length() > 300_000)) {
            call.reject("This reading cannot be printed.");
            return;
        }
        getActivity().runOnUiThread(() -> {
            PrintManager manager = getContext().getSystemService(PrintManager.class);
            if (manager == null) {
                call.reject("Printing is unavailable on this device.");
                return;
            }
            if (currentPage) {
                manager.print(title, getBridge().getWebView().createPrintDocumentAdapter(title), null);
                call.resolve();
                return;
            }
            WebView document = new WebView(getActivity());
            document.getSettings().setBlockNetworkLoads(true);
            document.getSettings().setAllowFileAccess(false);
            document.getSettings().setAllowContentAccess(false);
            document.setWebViewClient(new WebViewClient() {
                private boolean started;

                @Override
                public void onPageFinished(WebView view, String url) {
                    if (started) return;
                    started = true;
                    PrintDocumentAdapter adapter = view.createPrintDocumentAdapter(title);
                    manager.print(title, new PrintDocumentAdapter() {
                        @Override
                        public void onStart() {
                            adapter.onStart();
                        }

                        @Override
                        public void onLayout(PrintAttributes oldAttrs, PrintAttributes newAttrs,
                                CancellationSignal cancellation, LayoutResultCallback callback, Bundle extras) {
                            adapter.onLayout(oldAttrs, newAttrs, cancellation, callback, extras);
                        }

                        @Override
                        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination,
                                CancellationSignal cancellation, WriteResultCallback callback) {
                            adapter.onWrite(pages, destination, cancellation, callback);
                        }

                        @Override
                        public void onFinish() {
                            adapter.onFinish();
                            document.destroy();
                        }
                    }, null);
                    call.resolve();
                }
            });
            document.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
        });
    }

    @Override
    public void load() {
        getActivity().runOnUiThread(() -> narrator = new TextToSpeech(getContext(), status ->
            getActivity().runOnUiThread(() -> {
                narratorReady = status == TextToSpeech.SUCCESS;
                if (narratorReady) narrator.setLanguage(Locale.ENGLISH);
            })));
    }

    @PluginMethod
    public void narrate(PluginCall call) {
        String text = call.getString("text", "");
        getActivity().runOnUiThread(() -> {
            if (!narratorReady || text.trim().isEmpty()) {
                call.reject("Voice narration is unavailable on this device.");
            } else if (narrator.isSpeaking()) {
                narrator.stop();
                JSObject response = new JSObject();
                response.put("stopped", true);
                call.resolve(response);
            } else {
                narrator.setSpeechRate(0.92f);
                narrator.setPitch(0.96f);
                // Android limits each utterance. Split at spaces to keep long readings intact.
                int limit = TextToSpeech.getMaxSpeechInputLength();
                int start = 0;
                while (start < text.length()) {
                    int end = Math.min(start + limit, text.length());
                    if (end < text.length()) {
                        int space = text.lastIndexOf(' ', end);
                        if (space > start) end = space;
                    }
                    int queue = start == 0 ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD;
                    if (narrator.speak(text.substring(start, end), queue, null, "arcana-" + start) == TextToSpeech.ERROR) {
                        narrator.stop();
                        call.reject("Voice narration could not start.");
                        return;
                    }
                    start = end;
                }
                call.resolve();
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (narrator != null) narrator.shutdown();
    }
}
