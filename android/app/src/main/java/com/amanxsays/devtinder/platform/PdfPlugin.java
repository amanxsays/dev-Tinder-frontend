package com.amanxsays.devtinder.platform;

import android.net.Uri;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "DevTinderPdf")
public class PdfPlugin extends Plugin {
    private PdfPreviewDialog dialog;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    @Override public void load() {
        // A killed process cannot dismiss its dialog; remove only our abandoned cache files.
        worker.execute(() -> {
            java.io.File[] abandoned = getContext().getCacheDir().listFiles((folder, name) -> name.startsWith("devtinder-resume-") && name.endsWith(".pdf"));
            if (abandoned != null) for (java.io.File file : abandoned) if (file.isFile()) file.delete();
        });
    }
    @PluginMethod public void open(PluginCall call) {
        String url = call.getString("url", ""), fileName = call.getString("fileName", "Resume.pdf");
        Uri uri = Uri.parse(url);
        if (!"https".equalsIgnoreCase(uri.getScheme()) || !"res.cloudinary.com".equalsIgnoreCase(uri.getHost())
            || uri.getUserInfo() != null || (uri.getPort() != -1 && uri.getPort() != 443)
            || !uri.getPath().contains("/raw/upload/")) {
            call.reject("This resume URL is not supported.", "INVALID_PDF_URL"); return;
        }
        getActivity().runOnUiThread(() -> {
            closeDialog();
            dialog = new PdfPreviewDialog(getActivity(), worker, url, fileName, () -> {
                dialog = null;
                JSObject data = new JSObject(); data.put("closed", true); notifyListeners("pdfClosed", data);
            });
            dialog.show();
            JSObject data = new JSObject(); data.put("opened", true); call.resolve(data);
        });
    }
    private void closeDialog() { if (dialog != null) { PdfPreviewDialog previous = dialog; dialog = null; previous.dismiss(); } }
    @PluginMethod public void close(PluginCall call) { getActivity().runOnUiThread(() -> {
        closeDialog(); JSObject data = new JSObject(); data.put("closed", true); call.resolve(data);
    }); }
    @Override protected void handleOnPause() { getActivity().runOnUiThread(this::closeDialog); }
    @Override protected void handleOnDestroy() { closeDialog(); worker.shutdown(); }
}
