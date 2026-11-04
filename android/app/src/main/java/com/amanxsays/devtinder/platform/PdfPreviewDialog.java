package com.amanxsays.devtinder.platform;

import android.app.Activity;
import android.app.Dialog;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.pdf.PdfRenderer;
import android.net.Uri;
import android.os.Bundle;
import android.os.ParcelFileDescriptor;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.atomic.AtomicInteger;

/** One-page-at-a-time renderer; no remote viewer or public PDF cache. */
public final class PdfPreviewDialog extends Dialog {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private final Activity activity;
    private final ExecutorService worker;
    private final String url, fileName;
    private final Runnable onClosed;
    private final AtomicInteger generation = new AtomicInteger();
    private volatile HttpURLConnection connection;
    private volatile boolean closed;
    private PdfRenderer renderer;
    private ParcelFileDescriptor descriptor;
    private File cacheFile;
    private ImageView image;
    private TextView status, pageLabel;
    private ProgressBar progress;
    private Button previous, next, zoomIn, zoomOut;
    private int pageIndex, pageCount;
    private float zoom = 1;
    private Bitmap bitmap;

    public PdfPreviewDialog(Activity activity, ExecutorService worker, String url, String fileName, Runnable onClosed) {
        super(activity, android.R.style.Theme_Material_NoActionBar);
        this.activity = activity; this.worker = worker; this.url = url; this.fileName = fileName; this.onClosed = onClosed;
    }
    @Override protected void onCreate(Bundle state) {
        super.onCreate(state);
        Window window = getWindow();
        if (window != null) { window.addFlags(WindowManager.LayoutParams.FLAG_SECURE); window.setStatusBarColor(Color.rgb(12,21,32)); }
        LinearLayout layout = new LinearLayout(activity); layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(20, 32, 20, 20); layout.setBackgroundColor(Color.rgb(12,21,32));
        TextView title = new TextView(activity); title.setText(fileName); title.setTextSize(18); title.setTextColor(Color.WHITE);
        layout.addView(title);
        Button close = button("Back to chat", v -> dismiss()); layout.addView(close);
        progress = new ProgressBar(activity); layout.addView(progress);
        status = new TextView(activity); status.setTextColor(Color.WHITE); status.setText("Loading resume…"); layout.addView(status);
        ScrollView scroll = new ScrollView(activity); image = new ImageView(activity);
        image.setAdjustViewBounds(true); image.setContentDescription("Resume PDF page"); image.setBackgroundColor(Color.WHITE);
        scroll.addView(image, new ScrollView.LayoutParams(-1, -2));
        layout.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));
        LinearLayout controls = new LinearLayout(activity);
        previous = button("Previous", v -> { if (pageIndex > 0) { pageIndex--; render(); } });
        next = button("Next", v -> { if (pageIndex + 1 < pageCount) { pageIndex++; render(); } });
        zoomOut = button("−", v -> { zoom = Math.max(1, zoom - .5f); render(); });
        zoomOut.setContentDescription("Zoom out");
        zoomIn = button("+", v -> { zoom = Math.min(3, zoom + .5f); render(); });
        zoomIn.setContentDescription("Zoom in");
        for (Button item : new Button[]{previous,next,zoomOut,zoomIn}) controls.addView(item, new LinearLayout.LayoutParams(0, -2, 1));
        pageLabel = new TextView(activity); pageLabel.setTextColor(Color.WHITE); layout.addView(pageLabel); layout.addView(controls);
        Button fallback = button("Open in browser", v -> {
            try { activity.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); }
            catch (Exception ignored) { status.setText("No browser is available to open this PDF."); }
        }); layout.addView(fallback);
        setContentView(layout); controlsEnabled(false);
        worker.execute(this::download);
    }
    private Button button(String text, View.OnClickListener click) {
        Button value = new Button(activity); value.setText(text); value.setMinHeight((int)(48 * activity.getResources().getDisplayMetrics().density)); value.setOnClickListener(click); return value;
    }
    private void controlsEnabled(boolean enabled) {
        previous.setEnabled(enabled && pageIndex > 0); next.setEnabled(enabled && pageIndex + 1 < pageCount);
        zoomIn.setEnabled(enabled && zoom < 3); zoomOut.setEnabled(enabled && zoom > 1);
    }
    private void download() {
        try {
            URL target = new URL(url);
            for (int redirects = 0; redirects <= 3; redirects++) {
                if (closed) return;
                if (!"https".equalsIgnoreCase(target.getProtocol()) || !"res.cloudinary.com".equalsIgnoreCase(target.getHost())
                    || target.getUserInfo() != null || (target.getPort() != -1 && target.getPort() != 443)
                    || !target.getPath().contains("/raw/upload/")) throw new IllegalArgumentException("Unsupported resume URL");
                connection = (HttpURLConnection) target.openConnection();
                connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(20000);
                int code = connection.getResponseCode();
                if (code >= 300 && code < 400) {
                    String location = connection.getHeaderField("Location"); connection.disconnect();
                    if (location == null || redirects == 3) throw new IllegalArgumentException("Unsupported redirect");
                    target = new URL(target, location); continue;
                }
                if (code != 200 || connection.getContentLengthLong() > MAX_BYTES) throw new IllegalArgumentException("PDF unavailable or too large");
                String mime = connection.getContentType();
                if (mime == null || !(mime.toLowerCase(Locale.ROOT).startsWith("application/pdf") || mime.toLowerCase(Locale.ROOT).startsWith("application/octet-stream"))) throw new IllegalArgumentException("Not a PDF response");
                cacheFile = File.createTempFile("devtinder-resume-", ".pdf", activity.getCacheDir());
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(cacheFile)) {
                    byte[] buffer = new byte[8192], header = new byte[5]; long total = 0; int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (closed || (total + count) > MAX_BYTES) throw new IllegalArgumentException("PDF download stopped");
                        if (total < 5) System.arraycopy(buffer, 0, header, (int) total, Math.min(count, 5 - (int) total));
                        output.write(buffer, 0, count); total += count;
                    }
                    if (total < 5 || !new String(header, java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw new IllegalArgumentException("Invalid PDF header");
                } finally { connection.disconnect(); connection = null; }
                if (closed) return;
                descriptor = ParcelFileDescriptor.open(cacheFile, ParcelFileDescriptor.MODE_READ_ONLY);
                renderer = new PdfRenderer(descriptor); pageCount = renderer.getPageCount();
                if (pageCount < 1) throw new IllegalArgumentException("Empty PDF");
                activity.runOnUiThread(() -> { if (!closed) render(); }); return;
            }
        } catch (Exception error) {
            activity.runOnUiThread(() -> { if (!closed) { progress.setVisibility(View.GONE); status.setText("This PDF could not be displayed. Try opening it in your browser."); } });
        } finally {
            if (connection != null) { connection.disconnect(); connection = null; }
            if (closed || renderer == null) cleanup();
        }
    }
    private void render() {
        if (closed || renderer == null) return;
        int requested = generation.incrementAndGet(), page = pageIndex; float scale = zoom;
        progress.setVisibility(View.VISIBLE); controlsEnabled(false);
        worker.execute(() -> {
            Bitmap rendered = null;
            try (PdfRenderer.Page pdfPage = renderer.openPage(page)) {
                int width = Math.min(2048, Math.max(320, (int)(activity.getResources().getDisplayMetrics().widthPixels * scale)));
                float ratio = (float) pdfPage.getHeight() / Math.max(1, pdfPage.getWidth());
                int height = Math.min(4096, Math.max(1, (int)(width * ratio)));
                if ((long) width * height > 8_000_000) throw new IllegalArgumentException("PDF page too large");
                rendered = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888); rendered.eraseColor(Color.WHITE);
                Matrix transform = new Matrix(); transform.setScale((float)width / pdfPage.getWidth(), (float)height / pdfPage.getHeight());
                pdfPage.render(rendered, null, transform, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
                Bitmap result = rendered;
                activity.runOnUiThread(() -> {
                    if (closed || requested != generation.get()) { result.recycle(); return; }
                    Bitmap old = bitmap; bitmap = result; image.setImageBitmap(result); if (old != null) old.recycle();
                    progress.setVisibility(View.GONE); status.setText("");
                    pageLabel.setText("Page " + (page + 1) + " of " + pageCount + " · " + (int)(scale * 100) + "%"); controlsEnabled(true);
                });
            } catch (Exception | OutOfMemoryError error) {
                if (rendered != null) rendered.recycle();
                activity.runOnUiThread(() -> { if (!closed && requested == generation.get()) { progress.setVisibility(View.GONE); status.setText("Could not render this PDF page."); controlsEnabled(true); } });
            }
        });
    }
    private void cleanup() {
        try { if (renderer != null) renderer.close(); } catch (Exception ignored) {} renderer = null;
        try { if (descriptor != null) descriptor.close(); } catch (Exception ignored) {} descriptor = null;
        if (cacheFile != null) cacheFile.delete(); cacheFile = null;
    }
    @Override public void dismiss() {
        if (closed) return;
        closed = true; generation.incrementAndGet();
        if (connection != null) connection.disconnect();
        if (image != null) image.setImageDrawable(null);
        if (bitmap != null) { bitmap.recycle(); bitmap = null; }
        worker.execute(this::cleanup);
        super.dismiss(); onClosed.run();
    }
}
