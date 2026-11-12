package id.reverselab.studio;

import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.os.Build;
import android.view.WindowInsets;
import android.graphics.Insets;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Toast;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import id.reverselab.studio.inspector.ZipIndexInspector;
import id.reverselab.studio.inspector.PackageDeepInspector;
import id.reverselab.studio.inspector.PackageSetInspector;
import id.reverselab.studio.inspector.LanguageProfiler;
import id.reverselab.studio.inspector.RuleInsights;
import id.reverselab.studio.inspector.SignatureBlockInspector;
import id.reverselab.studio.inspector.ElfHeaderInspector;
import id.reverselab.studio.inspector.IntegritySampler;
import id.reverselab.studio.inspector.AdvancedRuleInsights;
import id.reverselab.studio.inspector.DexSymbolInspector;
import id.reverselab.studio.inspector.JadxBundleInspector;
import id.reverselab.studio.inspector.ApktoolBundleInspector;
import id.reverselab.studio.inspector.PatchPreflight;
import id.reverselab.studio.ai.ChatGptDirectClient;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

/** Android inspection/workspace; signing is offline, receipts imported read-only. */
public class MainActivity extends Activity {
    private static final int REQUEST_DOCUMENT = 1701;
    private static final int REQUEST_JADX_BUNDLE = 1702;
    private static final int REQUEST_EXPORT_PATCHES = 1703;
    private static final int REQUEST_APKTOOL_BUNDLE = 1704;
    private static final int REQUEST_EXPORT_APKTOOL = 1705;
    private static final int REQUEST_BUILD_REPORT = 1706;
    private static final int REQUEST_LUA_SCRIPT = 1707;
    private static final int MAX_LUA_SOURCE_BYTES = 256 * 1024;
    private static final String BUILD_REPORT_FILE = "build-receipt-v09.json";
    private static final String BUILD_REPORT_BINDING_FILE = "build-receipt-binding-v13.json";
    private static final long MAX_FILE_BYTES = ZipIndexInspector.MAX_INPUT;
    private static final String PREFS = "reverse_studio_native_v1";
    private static final String TRUSTED_PAGE = "file:///android_asset/index.html";
    private static final String REPORT_FILE = "inspection-report-v06.json";
    private static final String BUNDLE_FILE = "jadx-review-v07.zip";
    private static final String PATCHES_FILE = "jadx-patches-v07.json";
    private static final String BUNDLE_META = "jadx-workspace-v07.json";
    private static final String AT_BUNDLE = "apktool-review-v08.zip";
    private static final String AT_PATCHES = "apktool-patches-v08.json";
    private static final String AT_META = "apktool-workspace-v08.json";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final ExecutorService aiWorker = Executors.newSingleThreadExecutor();
    private final java.util.concurrent.atomic.AtomicBoolean aiBusy = new java.util.concurrent.atomic.AtomicBoolean(false);
    private ChatGptDirectClient chatGpt;
    private final AtomicInteger jobVersion = new AtomicInteger();
    private Future<?> activeJob;
    private WebView view;
    private SharedPreferences prefs;

    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        chatGpt=new ChatGptDirectClient(this);
        getWindow().setStatusBarColor(0xff080e1c);
        getWindow().setNavigationBarColor(0xff080e1c);
        view = new WebView(this);
        view.setBackgroundColor(0xff080e1c);
        if (Build.VERSION.SDK_INT >= 35) {
            view.setOnApplyWindowInsetsListener((v, insets) -> {
                Insets bars = insets.getInsets(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                view.setPadding(0, bars.top, 0, bars.bottom);
                return insets;
            });
        }
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true); // local bundled assets only
        settings.setAllowContentAccess(false); // content URI is read only on native thread
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        view.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView v, String url) {
                if (!TRUSTED_PAGE.equals(url)) return;
                // A living process is not proof that bundled HTML/JS rendered successfully.
                v.evaluateJavascript("(function(){var r=document.getElementById('app');return !!(window.StudioUI&&r&&r.textContent&&r.textContent.trim().length>40);})()",
                    ready -> android.util.Log.i("APKReverseStudio", "UI_READY=" + ("true".equals(ready) ? "true" : "false")));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return !TRUSTED_PAGE.equals(request.getUrl().toString());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                return !TRUSTED_PAGE.equals(url);
            }
        });
        view.addJavascriptInterface(new NativeBridge(), "StudioNative");
        setContentView(view);
        view.loadUrl(TRUSTED_PAGE);
    }

    private class NativeBridge {
        @JavascriptInterface public void chooseFile() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
                startActivityForResult(intent, REQUEST_DOCUMENT);
            });
        }
        @JavascriptInterface public void chooseLuaFile() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(intent, REQUEST_LUA_SCRIPT);
            });
        }
        @JavascriptInterface public void chooseJadxBundle() {
            runOnUiThread(() -> {
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*"); // Some document providers label ZIP as octet-stream; archive contents are validated.
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(intent,REQUEST_JADX_BUNDLE);
            });
        }
        @JavascriptInterface public void chooseApktoolBundle() {
            runOnUiThread(() -> {
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(intent,REQUEST_APKTOOL_BUNDLE);
            });
        }
        @JavascriptInterface public String apktoolStatus(){ return getApktoolStatus(); }
        @JavascriptInterface public String openApktoolSource(String path){return openApktoolNow(path);}
        @JavascriptInterface public String saveApktoolPatch(String path,String content){return saveApktoolNow(path,content);}
        @JavascriptInterface public String resetApktoolPatch(String path){
            try{return saveApktoolNow(path,ApktoolBundleInspector.readFile(getApktoolFile(),path));}
            catch(Exception ex){return errorAsJson(ex);}
        }
        @JavascriptInterface public void exportApktoolPatches(){
            runOnUiThread(() -> {
                if(!getApktoolFile().isFile()){emitApktool("error","Impor bundle Apktool terlebih dahulu",null);return;}
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,"apk-reverse-v08-smali-patches.json");
                startActivityForResult(intent,REQUEST_EXPORT_APKTOOL);
            });
        }
        @JavascriptInterface public String workspaceStatus() { return getWorkspaceStatus(); }
        @JavascriptInterface public String openWorkspaceSource(String path) { return openWorkspaceSourceNow(path); }
        @JavascriptInterface public String saveWorkspacePatch(String path,String code) { return saveWorkspacePatchNow(path,code); }
        @JavascriptInterface public String resetWorkspacePatch(String path) {
            try{return saveWorkspacePatchNow(path,JadxBundleInspector.readSource(getWorkspaceFile(),path));}
            catch(Exception ex){return errorAsJson(ex);}
        }
        @JavascriptInterface public void exportWorkspacePatches() {
            runOnUiThread(() -> {
                if(!getWorkspaceFile().isFile()) { emitWorkspace("error","Impor bundle JADX terlebih dahulu",null);return; }
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,"apk-reverse-v07-patches.json");
                startActivityForResult(intent,REQUEST_EXPORT_PATCHES);
            });
        }
        @JavascriptInterface public void chooseBuildReport() {
            runOnUiThread(() -> {
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivityForResult(intent,REQUEST_BUILD_REPORT);
            });
        }
        @JavascriptInterface public String buildReportStatus() { return loadBuildReport(); }
        @JavascriptInterface public String savedFile() { return prefs.getString("file_json", "null"); }
        @JavascriptInterface public String savedReport() { return loadReport(); }
        @JavascriptInterface public void startInspection() { runOnUiThread(() -> beginInspection()); }
        @JavascriptInterface public void cancelInspection() { runOnUiThread(() -> cancelInspectionNow(true)); }
        @JavascriptInterface public void clearSavedFile() {
            runOnUiThread(() -> {
                cancelInspectionNow(false);
                prefs.edit().remove("file_json").apply();
                deleteReport();
                deleteWorkspace();
                deleteBuildReport();
            });
        }
        @JavascriptInterface public String chatGptStatus() {return chatGpt.status().toString();}
        @JavascriptInterface public void startChatGptLogin(){
            aiWorker.submit(() -> chatGpt.signIn(MainActivity.this,
                (status,message,data) -> emitChatGpt(status,message,data)));
        }
        @JavascriptInterface public void disconnectChatGpt(){
            aiWorker.submit(() -> {chatGpt.disconnect();emitChatGpt("disconnected","Akun dilepas dari aplikasi ini",chatGpt.status());});
        }
        @JavascriptInterface public void loadChatGptModels(){
            aiWorker.submit(() -> {
                try{emitChatGpt("models","Model tersedia untuk akun yang terotorisasi",chatGpt.models());}
                catch(Exception ex){emitChatGpt("error","Daftar model gagal dimuat: "+safeAiError(ex),chatGpt.status());}
            });
        }
        @JavascriptInterface public void sendChatGpt(String json){
            if(!aiBusy.compareAndSet(false,true)){emitAi("error","Permintaan AI sebelumnya belum selesai",null);return;}
            aiWorker.submit(() -> {
                try{
                    JSONObject payload=new JSONObject(json);
                    emitAi("running","Menganalisis metadata melalui akun ChatGPT yang telah diberi izin…",null);
                    JSONObject result=chatGpt.analyze(payload);
                    result.put("projectId",payload.optString("projectId",""));
                    emitAi("done","Analisis AI selesai",result);
                }catch(Exception ex){emitAi("error",safeAiError(ex),null);}
                finally{aiBusy.set(false);}
            });
        }
        @JavascriptInterface public void copyText(String value) {
            final String safe = value == null ? "" : value.length() > 40_000 ? value.substring(0,40_000) : value;
            runOnUiThread(() -> {
                ClipboardManager mgr = (ClipboardManager)getSystemService(Context.CLIPBOARD_SERVICE);
                if (mgr != null) mgr.setPrimaryClip(ClipData.newPlainText("APK Reverse Studio", safe));
                Toast.makeText(MainActivity.this,"Informasi disalin",Toast.LENGTH_SHORT).show();
            });
        }
    }

    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data) {
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==REQUEST_LUA_SCRIPT && resultCode==RESULT_OK && data!=null && data.getData()!=null){
            importLuaReadOnly(data.getData());return;
        }
        if(requestCode==REQUEST_BUILD_REPORT && resultCode==RESULT_OK && data!=null && data.getData()!=null){
            importBuildReport(data.getData());return;
        }
        if(requestCode==REQUEST_APKTOOL_BUNDLE && resultCode==RESULT_OK && data!=null && data.getData()!=null){
            importApktool(data.getData());return;
        }
        if(requestCode==REQUEST_EXPORT_APKTOOL && resultCode==RESULT_OK && data!=null && data.getData()!=null){
            exportApktool(data.getData());return;
        }
        if (requestCode==REQUEST_JADX_BUNDLE && resultCode==RESULT_OK && data!=null && data.getData()!=null) {
            importWorkspace(data.getData());return;
        }
        if (requestCode==REQUEST_EXPORT_PATCHES && resultCode==RESULT_OK && data!=null && data.getData()!=null) {
            exportPatchesTo(data.getData());return;
        }
        if (requestCode!=REQUEST_DOCUMENT || resultCode!=RESULT_OK || data==null || data.getData()==null) return;
        Uri uri=data.getData();
        String filename="Berkas Android";
        long size=-1;
        try (Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE},null,null,null)) {
            if (c!=null && c.moveToFirst()) {
                int n=c.getColumnIndex(OpenableColumns.DISPLAY_NAME),s=c.getColumnIndex(OpenableColumns.SIZE);
                if (n>=0 && !c.isNull(n)) filename=c.getString(n);
                if (s>=0 && !c.isNull(s)) size=c.getLong(s);
            }
        } catch (RuntimeException ignored) { /* provider metadata optional */ }
        if (size > MAX_FILE_BYTES || size < -1) {
            Toast.makeText(this,"Berkas melebihi batas 40 GB atau ukuran tidak valid",Toast.LENGTH_LONG).show();
            return;
        }
        String lower=filename.toLowerCase(java.util.Locale.ROOT);
        boolean allowed=false;
        for (String ext : new String[]{".apk",".aab",".apks",".apkm",".xapk",".zip",".obb"}) {
            if (lower.endsWith(ext)) {allowed=true;break;}
        }
        if (!allowed) {
            Toast.makeText(this,"Pilih paket Android atau arsip ZIP yang didukung",Toast.LENGTH_LONG).show();
            return;
        }
        try {
            int grant=data.getFlags()&Intent.FLAG_GRANT_READ_URI_PERMISSION;
            if (grant!=0) getContentResolver().takePersistableUriPermission(uri,grant);
        } catch (SecurityException | IllegalArgumentException ignored) { /* provider might decline */ }
        try {
            JSONObject file=new JSONObject();
            file.put("name", filename);
            file.put("size",size);
            file.put("uri",uri.toString());
            file.put("selectedAt",System.currentTimeMillis());
            cancelInspectionNow(false);
            deleteReport();
            deleteWorkspace();
            // A build receipt belongs to the previous project, not to this newly selected APK.
            deleteBuildReport();
            prefs.edit().putString("file_json",file.toString()).apply();
            emit("onNativeFile",file);
        } catch (JSONException e) { Toast.makeText(this,"Metadata tidak dapat disimpan",Toast.LENGTH_LONG).show(); }
    }

    /** Read text-only Lua from SAF. Does not execute imported code or modify a game. */
    private void importLuaReadOnly(Uri uri) {
        worker.submit(() -> {
            JSONObject out = new JSONObject();
            try {
                String name = "script.lua";
                try (Cursor c=getContentResolver().query(uri,new String[]{OpenableColumns.DISPLAY_NAME},null,null,null)) {
                    if(c!=null && c.moveToFirst()){
                        int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                        if(i>=0 && !c.isNull(i))name=c.getString(i);
                    }
                } catch(RuntimeException ignored){ /* file name optional */ }
                if(name.length()>180 || !(name.toLowerCase(java.util.Locale.ROOT).endsWith(".lua") || name.toLowerCase(java.util.Locale.ROOT).endsWith(".txt")))
                    throw new IOException("Pilih source Lua .lua atau .txt (bukan binary bytecode)");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try(InputStream input=getContentResolver().openInputStream(uri)) {
                    if(input==null)throw new IOException("Berkas tidak dapat dibuka");
                    byte[] buf=new byte[8192];int n;
                    while((n=input.read(buf))!=-1){
                        if(bytes.size()+n>MAX_LUA_SOURCE_BYTES)throw new IOException("Source lebih dari 256 KiB; pecah menjadi beberapa file");
                        bytes.write(buf,0,n);
                    }
                }
                String text=java.nio.charset.StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT)
                    .onUnmappableCharacter(java.nio.charset.CodingErrorAction.REPORT)
                    .decode(java.nio.ByteBuffer.wrap(bytes.toByteArray())).toString();
                if(text.length()>80000 || text.indexOf('\u0000')>=0)throw new IOException("Source bukan teks Lua valid atau melebihi 80.000 karakter");
                out.put("status","ok");out.put("name",name);out.put("source",text);
            } catch(Exception e){
                try {out.put("status","error");out.put("message",String.valueOf(e.getMessage()).substring(0,Math.min(180,String.valueOf(e.getMessage()).length())));}catch(JSONException ignored){}
            }
            emit("onLuaImport",out);
        });
    }

    // v0.9: import an offline verification RECEIPT, not an APK and not a crypto check on Android.
    private void deleteBuildReport() {
        for (String name : new String[]{BUILD_REPORT_FILE, BUILD_REPORT_BINDING_FILE}) {
            File f=new File(getFilesDir(),name);
            if (f.exists() && !f.delete()) android.util.Log.w("ReverseStudio","Could not delete stale receipt");
        }
    }
    private String loadBuildReport() {
        try {
            // Old unbound receipts cannot be attributed safely to the selected project;
            // they must be reimported once after this upgrade.
            JSONObject current=selectedProject();
            JSONObject binding=new JSONObject(new String(readSmall(new File(getFilesDir(),BUILD_REPORT_BINDING_FILE),4096),StandardCharsets.UTF_8));
            if(binding.optLong("sourceSelectedAt",-1)!=current.optLong("selectedAt",-2))return "null";
            File receipt=new File(getFilesDir(),BUILD_REPORT_FILE);
            return new String(readSmall(receipt,32*1024),StandardCharsets.UTF_8);
        }catch(Exception ignored){return "null";}
    }
    private void importBuildReport(Uri uri){
        final long sourceSelectedAt;
        try { sourceSelectedAt=selectedProject().getLong("selectedAt"); }
        catch(Exception ignored) { emitBuildReport("error","Pilih proyek APK sebelum mengimpor receipt",null);return; }
        worker.submit(() -> {
            try {
                java.io.ByteArrayOutputStream bytes=new java.io.ByteArrayOutputStream();
                try(InputStream in=getContentResolver().openInputStream(uri)) {
                    if(in==null)throw new IOException("Dokumen tidak dapat dibaca");
                    byte[] buf=new byte[4096];int count;
                    while((count=in.read(buf))!=-1){
                        if(bytes.size()+count>32*1024)throw new IOException("Receipt maksimum 32 KiB");
                        bytes.write(buf,0,count);
                    }
                }
                JSONObject receipt=new JSONObject(new String(bytes.toByteArray(),StandardCharsets.UTF_8));
                if(!"apk-reverse-build-receipt".equals(receipt.optString("format")) || receipt.optInt("schemaVersion")!=1
                    || !"VERIFIED".equals(receipt.optString("result"))
                    || !"PASS".equals(receipt.optString("zipalign16KiB"))
                    || !"PASS".equals(receipt.optString("apksignerVerify")))
                    throw new IOException("Format atau status receipt tidak dikenal");
                String hash=receipt.optString("signedApkSha256","");
                if(!hash.matches("[a-fA-F0-9]{64}") || receipt.optLong("signedBytes",0)<=0)
                    throw new IOException("Hash atau ukuran APK output tidak valid");
                String name=receipt.optString("signedFile","");
                if(name.length()<5 || name.length()>180 || !name.endsWith(".apk") || name.contains("/") || name.contains("\\"))
                    throw new IOException("Nama APK keluaran tidak valid");
                // A receipt is untrusted metadata, not device-side cryptographic proof.
                // Prevent an import started under project A from attaching to project B.
                if (selectedProject().optLong("selectedAt",-1)!=sourceSelectedAt)
                    throw new IOException("Proyek berubah selama impor receipt; coba ulang");
                writeAtomic(new File(getFilesDir(),BUILD_REPORT_FILE),receipt.toString(),32*1024);
                JSONObject binding=new JSONObject().put("sourceSelectedAt",sourceSelectedAt)
                    .put("importedAt",System.currentTimeMillis());
                writeAtomic(new File(getFilesDir(),BUILD_REPORT_BINDING_FILE),binding.toString(),4096);
                if (selectedProject().optLong("selectedAt",-1)!=sourceSelectedAt) {
                    deleteBuildReport();
                    throw new IOException("Proyek berubah ketika receipt disimpan; impor dibatalkan");
                }
                emitBuildReport("ready","Receipt offline dimuat untuk proyek aktif; tanda tangan belum diperiksa pada ponsel",receipt);
            }catch(Exception e){emitBuildReport("error","Impor receipt gagal: "+safeAiError(e),null);}
        });
    }
    private void emitBuildReport(String status,String message,JSONObject receipt){
        try {
            JSONObject event=new JSONObject().put("status",status).put("message",message);
            if(receipt!=null)event.put("receipt",receipt);
            emit("onBuildReportUpdate",event);
        }catch(JSONException ignored){}
    }

    // v0.8: Apktool review workspace (Smali / decoded XML, never executes code).
    private File getApktoolFile(){return new File(getFilesDir(),AT_BUNDLE);}
    private File getApktoolPatchFile(){return new File(getFilesDir(),AT_PATCHES);}
    private File getApktoolMetaFile(){return new File(getFilesDir(),AT_META);}
    private void deleteApktoolWorkspace(){
        for(File f:new File[]{getApktoolFile(),getApktoolPatchFile(),getApktoolMetaFile()})
            if(f.exists()&&!f.delete())android.util.Log.w("ReverseStudio","Cannot delete Apktool working copy");
    }
    private JSONObject apktoolPatches() throws Exception{
        if(!getApktoolPatchFile().isFile())return new JSONObject().put("schemaVersion",1).put("patches",new JSONObject());
        return new JSONObject(new String(readSmall(getApktoolPatchFile(),4*1024*1024),StandardCharsets.UTF_8));
    }
    private JSONObject apktoolMeta() throws Exception{
        return new JSONObject(new String(readSmall(getApktoolMetaFile(),128*1024),StandardCharsets.UTF_8));
    }
    private void importApktool(Uri uri){
        final JSONObject project;
        try{project=selectedProject();}catch(Exception ex){emitApktool("error","Pilih APK terlebih dahulu",null);return;}
        worker.submit(() -> {
            File temp=new File(getCacheDir(),"apktool-import-v08.tmp");
            try{
                long nbytes=0;
                try(InputStream in=getContentResolver().openInputStream(uri);FileOutputStream out=new FileOutputStream(temp)){
                    if(in==null)throw new IOException("Tidak dapat membuka bundle");
                    byte[] b=new byte[32768];int n;
                    while((n=in.read(b))!=-1){
                        nbytes+=n;
                        if(nbytes>ApktoolBundleInspector.MAX_ARCHIVE)throw new IOException("Melewati batas 48 MiB");
                        out.write(b,0,n);
                    }
                    out.getFD().sync();
                }
                ApktoolBundleInspector.Result idx=ApktoolBundleInspector.inspect(temp);
                JSONObject manifest=new JSONObject(idx.manifest);
                if(manifest.optInt("schemaVersion")!=1||!"apktool-review".equals(manifest.optString("engine")))
                    throw new IOException("Format bundle bukan Apktool v0.8");
                if(!project.optString("name").equals(manifest.optString("sourceFile"))||
                    project.optLong("size",-1)!=manifest.optLong("sourceBytes",-2))
                    throw new IOException("Nama atau ukuran APK tidak cocok dengan proyek");
                String apkHash=manifest.optString("sourceSha256");
                if(!apkHash.matches("[a-f0-9]{64}"))throw new IOException("Hash APK sumber wajib ada");
                JSONArray files=manifest.optJSONArray("files");
                if(files==null||files.length()!=idx.files.size())throw new IOException("Manifest source tidak cocok");
                java.util.Map<String,String> hashes=new java.util.HashMap<>();
                for(int i=0;i<files.length();i++){
                    JSONObject obj=files.getJSONObject(i);
                    String path=obj.getString("path"),hash=obj.getString("sha256");
                    if(hashes.put(path,hash)!=null||!hash.matches("[a-f0-9]{64}"))throw new IOException("Hash source tidak valid");
                }
                for(ApktoolBundleInspector.Entry entry:idx.files){
                    String actual=ApktoolBundleInspector.sha256(ApktoolBundleInspector.readFile(temp,entry.path));
                    if(!actual.equals(hashes.get(entry.path)))throw new IOException("Source tidak cocok dengan hash: "+entry.path);
                }
                if(selectedProject().optLong("selectedAt")!=project.optLong("selectedAt"))throw new IOException("Proyek berubah saat impor");
                deleteApktoolWorkspace();
                if(!temp.renameTo(getApktoolFile()))throw new IOException("Gagal menyimpan paket review");
                JSONObject meta=new JSONObject().put("selectedAt",project.getLong("selectedAt"))
                    .put("sourceFile",manifest.getString("sourceFile")).put("sourceBytes",manifest.getLong("sourceBytes"))
                    .put("sourceSha256",apkHash).put("skippedFiles",manifest.optInt("skippedFiles",0));
                writeAtomic(getApktoolMetaFile(),meta.toString(),128*1024);
                emitApktool("ready","Bundle Apktool diimpor: "+idx.files.size()+" source",new JSONObject(getApktoolStatus()));
            }catch(Exception ex){emitApktool("error","Impor Apktool gagal: "+safeAiError(ex),null);}
            finally{if(temp.exists())temp.delete();}
        });
    }
    private String getApktoolStatus(){
        try{
            if(!getApktoolFile().isFile())return "null";
            JSONObject meta=apktoolMeta(),selected=selectedProject();
            if(meta.optLong("selectedAt",-1)!=selected.optLong("selectedAt",-2))return "null";
            ApktoolBundleInspector.Result idx=ApktoolBundleInspector.inspect(getApktoolFile());
            JSONArray files=new JSONArray();for(ApktoolBundleInspector.Entry e:idx.files)
                files.put(new JSONObject().put("path",e.path).put("bytes",e.bytes));
            JSONArray changed=new JSONArray();JSONObject patches=apktoolPatches().getJSONObject("patches");
            java.util.Iterator<String> keys=patches.keys();while(keys.hasNext())changed.put(keys.next());
            return new JSONObject().put("status","ready").put("meta",meta)
                .put("files",files).put("changedPaths",changed).toString();
        }catch(Exception ex){return "null";}
    }
    private String openApktoolNow(String path){
        try{
            if(!"ready".equals(new JSONObject(getApktoolStatus()).optString("status")))throw new IOException("Workspace belum tersedia");
            String original=ApktoolBundleInspector.readFile(getApktoolFile(),path);
            JSONObject patch=apktoolPatches().getJSONObject("patches").optJSONObject(path);
            if(patch!=null&&!ApktoolBundleInspector.sha256(original).equals(patch.optString("baselineSha256")))
                throw new IOException("Patch tidak cocok dengan baseline");
            String content=patch==null?original:patch.getString("content");
            return new JSONObject().put("status","ok").put("path",path).put("originalSha256",ApktoolBundleInspector.sha256(original))
                .put("content",content).put("modified",patch!=null).toString();
        }catch(Exception ex){return errorAsJson(ex);}
    }
    private String saveApktoolNow(String path,String content){
        try{
            if(!"ready".equals(new JSONObject(getApktoolStatus()).optString("status")))throw new IOException("Impor paket Apktool dahulu");
            if(content==null||content.getBytes(StandardCharsets.UTF_8).length>ApktoolBundleInspector.MAX_PER_FILE)
                throw new IOException("Source terlalu besar");
            java.util.List<String> issues=PatchPreflight.warnings(path,content);
            if(!issues.isEmpty())throw new IOException("Preflight: "+String.join("; ",issues));
            String baseline=ApktoolBundleInspector.readFile(getApktoolFile(),path);
            JSONObject all=apktoolPatches(),records=all.getJSONObject("patches");
            if(content.equals(baseline))records.remove(path);
            else records.put(path,new JSONObject().put("baselineSha256",ApktoolBundleInspector.sha256(baseline))
                .put("changedSha256",ApktoolBundleInspector.sha256(content)).put("content",content)
                .put("updatedAt",System.currentTimeMillis()));
            if(records.length()>40)throw new IOException("Maksimal 40 file patch");
            writeAtomic(getApktoolPatchFile(),all.toString(),4*1024*1024);
            return new JSONObject().put("status","ok").put("modified",!content.equals(baseline))
                .put("changedPaths",new JSONObject(getApktoolStatus()).getJSONArray("changedPaths")).toString();
        }catch(Exception ex){return errorAsJson(ex);}
    }
    private void exportApktool(Uri uri){
        worker.submit(() -> {
            try{
                if(!"ready".equals(new JSONObject(getApktoolStatus()).optString("status")))throw new IOException("Workspace tidak siap");
                JSONObject project=selectedProject(),meta=apktoolMeta();
                JSONObject export=new JSONObject().put("schemaVersion",1).put("format","apk-reverse-apktool-patch")
                    .put("originalApk",project.optString("name")).put("originalSize",project.optLong("size"))
                    .put("sourceSha256",meta.getString("sourceSha256"))
                    .put("sourceHashVerifiedAgainstDeviceApk",false)
                    .put("warning","Patch Smali/XML; verify APK SHA-256 and rebuild separately on trusted computer")
                    .put("patches",apktoolPatches().getJSONObject("patches"));
                byte[] content=export.toString(2).getBytes(StandardCharsets.UTF_8);
                try(OutputStream out=getContentResolver().openOutputStream(uri,"wt")){
                    if(out==null)throw new IOException("Tujuan ekspor tidak tersedia");out.write(content);out.flush();
                }
                emitApktool("exported","Patch Apktool diekspor sebagai JSON (bukan APK)",new JSONObject(getApktoolStatus()));
            }catch(Exception ex){emitApktool("error","Ekspor gagal: "+safeAiError(ex),null);}
        });
    }
    private void emitApktool(String status,String message,JSONObject data){
        try{
            JSONObject payload=new JSONObject().put("status",status).put("message",message);
            if(data!=null)payload.put("workspace",data);
            emit("onApktoolUpdate",payload);
        }catch(JSONException ignored){}
    }

    // === v0.7: bounded JADX review bundle + private working-copy patches ===
    private File getWorkspaceFile() { return new File(getFilesDir(),BUNDLE_FILE); }
    private File getPatchFile() { return new File(getFilesDir(),PATCHES_FILE); }
    private File getWorkspaceMetaFile() { return new File(getFilesDir(),BUNDLE_META); }
    private void deleteWorkspace() {
        deleteApktoolWorkspace();
        for(File f:new File[]{getWorkspaceFile(),getPatchFile(),getWorkspaceMetaFile()}) {
            if(f.exists()&&!f.delete())android.util.Log.w("ReverseStudio","Cannot remove workspace file");
        }
    }
    private JSONObject selectedProject() throws JSONException {
        JSONObject project=new JSONObject(prefs.getString("file_json","null"));
        if(project.isNull("selectedAt") || project.isNull("name"))throw new JSONException("Pilih APK proyek dahulu");
        return project;
    }
    private static byte[] readSmall(File f,int maximum) throws IOException {
        if(!f.isFile()||f.length()<0||f.length()>maximum)throw new IOException("Ukuran metadata tidak valid");
        try(FileInputStream in=new FileInputStream(f)) {
            java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
            byte[] buf=new byte[8192];int n;
            while((n=in.read(buf))!=-1){if(out.size()+n>maximum)throw new IOException("Batas data lokal");out.write(buf,0,n);}
            return out.toByteArray();
        }
    }
    private static void writeAtomic(File dest,String value,int max) throws IOException {
        byte[] bytes=value.getBytes(StandardCharsets.UTF_8);
        if(bytes.length>max)throw new IOException("Penyimpanan patch melebihi batas");
        File tmp=new File(dest.getParentFile(),dest.getName()+".tmp");
        try(FileOutputStream out=new FileOutputStream(tmp)){out.write(bytes);out.getFD().sync();}
        if(!tmp.renameTo(dest))throw new IOException("Gagal menyimpan data secara atomik");
    }
    private JSONObject workspaceMeta() throws Exception {
        return new JSONObject(new String(readSmall(getWorkspaceMetaFile(),128*1024),StandardCharsets.UTF_8));
    }
    private JSONObject patches() throws Exception {
        File f=getPatchFile();
        if(!f.isFile())return new JSONObject().put("schemaVersion",1).put("patches",new JSONObject());
        return new JSONObject(new String(readSmall(f,4*1024*1024),StandardCharsets.UTF_8));
    }
    private void importWorkspace(Uri uri) {
        final JSONObject project;
        try {project=selectedProject();}catch(Exception e){emitWorkspace("error","Pilih APK proyek sebelum mengimpor hasil JADX",null);return;}
        worker.submit(() -> {
            File tmp=new File(getCacheDir(),"jadx-review-import.tmp");
            try {
                long total=0;
                try(InputStream in=getContentResolver().openInputStream(uri);FileOutputStream out=new FileOutputStream(tmp)) {
                    if(in==null)throw new IOException("Sumber tidak dapat dibuka");
                    byte[] buf=new byte[32768];int n;
                    while((n=in.read(buf))!=-1) {
                        if(Thread.currentThread().isInterrupted())throw new IOException("Impor dibatalkan");
                        total+=n;
                        if(total>JadxBundleInspector.MAX_ARCHIVE)throw new IOException("Bundle lebih besar dari 32 MiB");
                        out.write(buf,0,n);
                    }
                    out.getFD().sync();
                }
                JadxBundleInspector.Result result=JadxBundleInspector.inspect(tmp);
                JSONObject manifest=new JSONObject(result.manifest);
                if(manifest.optInt("schemaVersion")!=1 || !"jadx-cli-review".equals(manifest.optString("engine")))
                    throw new IOException("Ini bukan paket review JADX v0.7");
                if(!project.optString("name").equals(manifest.optString("sourceFile")))
                    throw new IOException("Nama APK tidak cocok. Pilih proyek sumber yang sesuai");
                long expected=project.optLong("size",-1), actual=manifest.optLong("sourceBytes",-2);
                if(expected>=0 && expected!=actual)throw new IOException("Ukuran APK sumber tidak cocok");
                JSONArray files=manifest.optJSONArray("files");
                if(files==null || files.length()!=result.sources.size())throw new IOException("Daftar sumber manifest tidak cocok");
                java.util.HashMap<String,String> hashes=new java.util.HashMap<>();
                for(int i=0;i<files.length();i++) {
                    JSONObject o=files.getJSONObject(i);
                    String path=o.getString("path"),hash=o.getString("sha256");
                    if(hashes.put(path,hash)!=null || !hash.matches("[a-f0-9]{64}"))throw new IOException("Manifest source duplikat/rusak");
                }
                for(JadxBundleInspector.Source entry:result.sources) {
                    if(!hashes.containsKey(entry.path))throw new IOException("Path source tidak terdaftar");
                    String raw=JadxBundleInspector.readSource(tmp,entry.path);
                    if(!hashes.get(entry.path).equals(JadxBundleInspector.sha256(raw)))throw new IOException("Hash source tidak cocok");
                }
                // Imported bundle bound to the current selected project; never overwrite original APK.
                JSONObject current=selectedProject();
                if(current.optLong("selectedAt")!=project.optLong("selectedAt"))throw new IOException("Proyek aktif berubah selama impor");
                File dest=getWorkspaceFile();
                if(dest.exists()&&!dest.delete())throw new IOException("Gagal mengganti bundle lama");
                if(!tmp.renameTo(dest))throw new IOException("Gagal menyimpan bundle di penyimpanan privat");
                if(getPatchFile().exists()&&!getPatchFile().delete())throw new IOException("Gagal mereset patch lama");
                JSONObject meta=new JSONObject().put("selectedAt",project.optLong("selectedAt"))
                    .put("sourceFile",manifest.getString("sourceFile"))
                    .put("sourceBytes",actual).put("sourceSha256",manifest.optString("sourceSha256"))
                    .put("skippedSources",manifest.optInt("skippedSources",0))
                    .put("createdAt",System.currentTimeMillis());
                writeAtomic(getWorkspaceMetaFile(),meta.toString(),128*1024);
                emitWorkspace("ready","Bundle JADX berhasil diimpor: "+result.sources.size()+" source Java",new JSONObject(getWorkspaceStatus()));
            } catch(Exception e) {
                emitWorkspace("error","Gagal impor JADX: "+safeAiError(e),null);
            } finally {if(tmp.exists())tmp.delete();}
        });
    }
    private String getWorkspaceStatus() {
        try {
            if(!getWorkspaceFile().isFile())return "null";
            JSONObject meta=workspaceMeta(),project=selectedProject();
            if(meta.optLong("selectedAt",-1)!=project.optLong("selectedAt",-2))return "null";
            JadxBundleInspector.Result index=JadxBundleInspector.inspect(getWorkspaceFile());
            JSONArray entries=new JSONArray();
            for(JadxBundleInspector.Source file:index.sources)entries.put(new JSONObject()
                .put("path",file.path).put("bytes",file.bytes));
            JSONObject patch=patches().optJSONObject("patches");
            JSONArray changed=new JSONArray();
            if(patch!=null){java.util.Iterator<String> it=patch.keys();while(it.hasNext())changed.put(it.next());}
            return new JSONObject().put("status","ready").put("meta",meta)
                .put("sources",entries).put("changedPaths",changed).toString();
        }catch(Exception e){return "null";}
    }
    private String openWorkspaceSourceNow(String path) {
        try {
            JSONObject state=new JSONObject(getWorkspaceStatus());
            if(!"ready".equals(state.optString("status")))throw new IOException("Workspace belum tersedia");
            String original=JadxBundleInspector.readSource(getWorkspaceFile(),path);
            JSONObject changed=patches().optJSONObject("patches");
            JSONObject patch=changed==null?null:changed.optJSONObject(path);
            boolean modified=patch!=null;
            if(modified && !JadxBundleInspector.sha256(original).equals(patch.optString("baselineSha256")))throw new IOException("Patch tidak cocok dengan sumber awal");
            return new JSONObject().put("status","ok").put("path",path)
                .put("originalSha256",JadxBundleInspector.sha256(original))
                .put("content",modified?patch.getString("content"):original)
                .put("modified",modified).toString();
        }catch(Exception e){return errorAsJson(e);}
    }
    private String saveWorkspacePatchNow(String path,String content) {
        try {
            if(content==null || content.indexOf('\0')>=0 || content.getBytes(StandardCharsets.UTF_8).length>JadxBundleInspector.MAX_SOURCE_BYTES)
                throw new IOException("Patch melampaui batas atau berisi data biner");
            JSONObject ws=new JSONObject(getWorkspaceStatus());
            if(!"ready".equals(ws.optString("status")))throw new IOException("Workspace tidak sesuai proyek aktif");
            String baseline=JadxBundleInspector.readSource(getWorkspaceFile(),path);
            JSONObject parent=patches(), items=parent.getJSONObject("patches");
            if(content.equals(baseline))items.remove(path);
            else items.put(path,new JSONObject()
                .put("baselineSha256",JadxBundleInspector.sha256(baseline))
                .put("modifiedSha256",JadxBundleInspector.sha256(content))
                .put("content",content).put("updatedAt",System.currentTimeMillis()));
            if(items.length()>40)throw new IOException("Maksimal 40 file patch per bundle");
            writeAtomic(getPatchFile(),parent.toString(),4*1024*1024);
            return new JSONObject().put("status","ok").put("modified",!content.equals(baseline))
                .put("changedPaths",new JSONObject(getWorkspaceStatus()).getJSONArray("changedPaths")).toString();
        }catch(Exception e){return errorAsJson(e);}
    }
    private String errorAsJson(Exception ex) {
        try{return new JSONObject().put("status","error").put("message",safeAiError(ex)).toString();}
        catch(JSONException ignored){return "{\"status\":\"error\"}";}
    }
    private void exportPatchesTo(Uri uri) {
        worker.submit(() -> {
            try {
                JSONObject ws=new JSONObject(getWorkspaceStatus()), project=selectedProject();
                if(!"ready".equals(ws.optString("status")))throw new IOException("Paket belum diimpor");
                JSONObject result=new JSONObject()
                    .put("schemaVersion",1).put("format","apk-reverse-review-patch")
                    .put("originalApk",project.optString("name"))
                    .put("originalSize",project.optLong("size"))
                    .put("sourceHashVerifiedAgainstAPK",false)
                    .put("warning","Catatan perubahan Java JADX, bukan smali/bytecode yang dapat langsung dibangun")
                    .put("patches",patches().getJSONObject("patches"));
                byte[] bytes=result.toString(2).getBytes(StandardCharsets.UTF_8);
                try(OutputStream output=getContentResolver().openOutputStream(uri,"wt")) {
                    if(output==null)throw new IOException("Penyimpanan tujuan tidak tersedia");
                    output.write(bytes);output.flush();
                }
                emitWorkspace("exported","Patch berhasil diekspor (JSON, bukan APK)",new JSONObject(getWorkspaceStatus()));
            }catch(Exception e){emitWorkspace("error","Ekspor patch gagal: "+safeAiError(e),null);}
        });
    }
    private void emitWorkspace(String status,String message,JSONObject data) {
        try {JSONObject event=new JSONObject().put("status",status).put("message",message);
            if(data!=null)event.put("workspace",data);
            emit("onWorkspaceUpdate",event);
        }catch(JSONException ignored){}
    }

    private void beginInspection() {
        if (activeJob!=null && !activeJob.isDone()) return;
        final JSONObject source;
        try {
            source=new JSONObject(prefs.getString("file_json","null"));
            if (source.isNull("uri")) throw new JSONException("URI tidak ada");
        } catch (JSONException e) {
            update("error","Pilih berkas Android terlebih dahulu",null,0);
            return;
        }
        final int version=jobVersion.incrementAndGet();
        update("running","Membaca indeks arsip secara lokal…",null,version);
        activeJob=worker.submit(() -> {
            try {
                Uri uri=Uri.parse(source.getString("uri"));
                android.os.ParcelFileDescriptor fd=getContentResolver().openFileDescriptor(uri,"r");
                if (fd==null) throw new IOException("Tidak dapat membuka berkas dari penyedia dokumen");
                // AutoCloseInputStream owns the PFD and closes it exactly once.
                // Direct seekable channel reads ZIP metadata without copying the input archive.
                try (FileInputStream stream=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd)) {
                    FileChannel channel=stream.getChannel();
                    ZipIndexInspector.Result result=ZipIndexInspector.inspect(channel);
                    if (version!=jobVersion.get() || Thread.currentThread().isInterrupted()) return;
                    update("running","Mendekode Manifest, DEX dan header resource secara terbatas…",null,version);
                    PackageDeepInspector.Report deep=PackageDeepInspector.inspect(channel,result);
                    update("running","Menganalisis APK bersarang dan indikator bahasa kode…",null,version);
                    java.util.List<java.util.Map<String,Object>> nested=PackageSetInspector.inspect(channel,result);
                    update("running","Mengindeks definisi kelas dan metode DEX…",null,version);
                    Map<String,Object> dexSymbols=DexSymbolInspector.inspect(channel,result);
                    update("running","Membaca struktur signature, ELF dan sampel integritas…",null,version);
                    Map<String,Object> signature=SignatureBlockInspector.inspect(channel,result);
                    java.util.List<java.util.Map<String,Object>> nativeLibraries=ElfHeaderInspector.inspect(channel,result);
                    Map<String,Object> integrity=IntegritySampler.inspect(channel,result);
                    JSONObject report=asJson(result,source,deep,nested,signature,nativeLibraries,integrity,dexSymbols);
                    if (!Thread.currentThread().isInterrupted() && version==jobVersion.get()) {
                        saveReport(report);
                        update("done","Indeks dan metadata APK selesai dianalisis",report,version);
                    }
                }
            } catch (SecurityException e) {
                update("error","Izin akses dokumen telah dicabut. Pilih kembali berkas.",null,version);
            } catch (Exception e) {
                String msg=e.getMessage()==null?"Sumber tidak bisa dibaca":e.getMessage();
                update("error",msg,null,version);
            }
        });
    }
    private void cancelInspectionNow(boolean notify) {
        jobVersion.incrementAndGet();
        if (activeJob!=null) activeJob.cancel(true);
        activeJob=null;
        if (notify) update("cancelled","Pemeriksaan dibatalkan",null,jobVersion.get());
    }
    private JSONObject asJson(ZipIndexInspector.Result r,JSONObject source,PackageDeepInspector.Report deep,java.util.List<java.util.Map<String,Object>> nested,Map<String,Object> signature,java.util.List<java.util.Map<String,Object>> nativeLibraries,Map<String,Object> integrity,Map<String,Object> dexSymbols) throws JSONException {
        JSONObject out=new JSONObject();
        out.put("sourceSelectedAt",source.optLong("selectedAt"));
        out.put("fileSize",r.fileSize);
        out.put("totalEntries",r.totalEntries);
        out.put("totalCompressed",r.totalCompressed);
        out.put("totalUncompressed",r.totalUncompressed);
        out.put("zip64",r.zip64);
        out.put("formatHint",r.formatHint);
        out.put("hasManifest",r.hasManifest);
        out.put("hasArsc",r.hasArsc);
        out.put("signatureMetadataPresent",r.hasSignatureMetadata);
        out.put("dexCount",r.dexCount);
        out.put("duplicateNames",r.duplicateNames);
        out.put("duplicateScanTruncated",r.duplicateScanTruncated);
        out.put("suspiciousPaths",r.suspiciousPaths);
        out.put("encryptedEntries",r.encryptedEntries);
        out.put("highRatioEntries",r.highRatioEntries);
        out.put("indexTruncated",r.indexTruncated);
        JSONObject counts=new JSONObject();
        for (Map.Entry<String,Integer> e:r.counts.entrySet())counts.put(e.getKey(),e.getValue());
        out.put("counts",counts);
        JSONArray warnings=new JSONArray();
        for (String warn:r.warnings)warnings.put(warn);
        out.put("warnings",warnings);
        JSONArray entries=new JSONArray();
        for (ZipIndexInspector.Entry x:r.entries) {
            JSONObject v=new JSONObject();
            v.put("name",x.name);v.put("group",x.group);
            v.put("compressedSize",x.compressedSize);v.put("uncompressedSize",x.uncompressedSize);
            v.put("crc32",x.crc32);v.put("method",x.method);v.put("encrypted",x.encrypted);
            entries.put(v);
        }
        out.put("entries",entries);
        JSONObject content=new JSONObject();
        content.put("manifest",new JSONObject(deep.manifest));
        content.put("resources",new JSONObject(deep.resources));
        JSONArray dexDetails=new JSONArray();
        for (Map<String,Object> dex : deep.dexFiles) dexDetails.put(new JSONObject(dex));
        content.put("dexFiles",dexDetails);
        JSONArray deepWarnings=new JSONArray();
        for (String warning : deep.warnings) deepWarnings.put(warning);
        content.put("warnings",deepWarnings);
        content.put("scope","Read-only bounded metadata; not Java/Smali decompilation, not signature verification");
        out.put("deep",content);
        JSONArray packages=new JSONArray();
        for (java.util.Map<String,Object> item:nested) packages.put(new JSONObject(item));
        out.put("bundledApks",packages);
        JSONArray languages=new JSONArray();
        for (java.util.Map<String,Object> item:LanguageProfiler.profile(r,deep)) languages.put(new JSONObject(item));
        out.put("languages",languages);
        JSONArray insights=new JSONArray();
        for (java.util.Map<String,Object> item:RuleInsights.inspect(r,deep,nested))insights.put(new JSONObject(item));
        for (java.util.Map<String,Object> item:AdvancedRuleInsights.inspect(signature,nativeLibraries,integrity))insights.put(new JSONObject(item));
        out.put("localInsights",insights);
        out.put("signingInspection",new JSONObject(signature));
        JSONArray elfArray=new JSONArray();for(Map<String,Object> elf:nativeLibraries)elfArray.put(new JSONObject(elf));
        out.put("nativeLibraries",elfArray);
        out.put("integritySamples",new JSONObject(integrity));
        out.put("dexSymbols",new JSONObject(dexSymbols));
        out.put("schemaVersion",6);
        out.put("finishedAt",System.currentTimeMillis());
        return out;
    }
    private File reportPath() { return new File(getFilesDir(),REPORT_FILE); }
    private File v05ReportPath() { return new File(getFilesDir(),"inspection-report-v05.json"); }
    private File legacyReportPath() { return new File(getFilesDir(),"inspection-report-v04.json"); }
    private File v03ReportPath() {return new File(getFilesDir(),"inspection-report-v03.json");}
    private File olderReportPath() { return new File(getFilesDir(),"inspection-report-v02.json"); }
    private void saveReport(JSONObject report) throws IOException {
        File temp=new File(getFilesDir(),REPORT_FILE+".tmp");
        try (FileOutputStream out=new FileOutputStream(temp)) {
            byte[] bytes=report.toString().getBytes(StandardCharsets.UTF_8);
            if (bytes.length>3_000_000) throw new IOException("Laporan melebihi batas lokal 3 MB");
            out.write(bytes);
            out.getFD().sync();
        }
        if (!temp.renameTo(reportPath())) throw new IOException("Gagal menyimpan laporan secara atomik");
    }
    private String loadReport() {
        File f=reportPath();
        // Preserve existing v0.2 completed reports when upgrading the application.
        // A fresh v0.3 inspection replaces them with deep metadata.
        if (!f.isFile()) f=v05ReportPath();
        if (!f.isFile()) f=legacyReportPath();
        if (!f.isFile()) f=v03ReportPath();
        if (!f.isFile()) f=olderReportPath();
        if (!f.isFile() || f.length()>3_000_000) return "null";
        try (FileInputStream in=new FileInputStream(f)) {
            byte[] bytes=new byte[(int)f.length()];
            int read=0;
            while (read<bytes.length) {
                int n=in.read(bytes,read,bytes.length-read);
                if (n<0) return "null";
                read+=n;
            }
            String json=new String(bytes,StandardCharsets.UTF_8);
            JSONObject obj=new JSONObject(json);
            JSONObject source=new JSONObject(prefs.getString("file_json","null"));
            return obj.optLong("sourceSelectedAt",-1)==source.optLong("selectedAt",-2)?json:"null";
        } catch (Exception e) {return "null";}
    }
    private void deleteReport() {
        for(File f : new File[]{reportPath(),v05ReportPath(),legacyReportPath(),v03ReportPath(),olderReportPath()}) {
            if (f.exists() && !f.delete()) android.util.Log.w("ReverseStudio","Cannot remove old report");
        }
    }
    private void update(String status,String message,JSONObject report,int version) {
        if (version!=0 && version!=jobVersion.get())return;
        try {
            JSONObject update=new JSONObject();
            update.put("status",status);
            update.put("message",message);
            if(report!=null) update.put("report",report);
            emit("onInspectionUpdate",update);
        } catch (JSONException ignored) { }
    }
    private String safeAiError(Exception error) {
        String message=error.getMessage();
        if(message==null)return "Operasi gagal";
        message=message.replaceAll("[\\r\\n\\t]"," ");
        return message.substring(0,Math.min(message.length(),180));
    }
    private void emitChatGpt(String status,String message,JSONObject data) {
        try {JSONObject out=new JSONObject().put("status",status).put("message",message);
            if(data!=null)out.put("data",data);emit("onChatGptUpdate",out);
        }catch(Exception ignored){}
    }
    private void emitAi(String status,String message,JSONObject value) {
        try{JSONObject v=new JSONObject();v.put("status",status);v.put("message",message);if(value!=null)v.put("data",value);emit("onAiUpdate",v);}catch(JSONException ignored){}
    }
    private void emit(String method,JSONObject json) {
        runOnUiThread(() -> {
            if (view!=null) view.evaluateJavascript("window.StudioUI&&window.StudioUI."+method+"("+json.toString()+")",null);
        });
    }
    private final BackNavigationGuard backNavigation = new BackNavigationGuard();
    @Override public void onBackPressed() {
        // A hung WebView must not trap the user. The 1500ms fallback and JS callback
        // share a single completion gate, so Activity navigation never runs twice.
        final WebView current=view;
        if (current==null) { super.onBackPressed(); return; }
        final BackNavigationGuard.Ticket ticket=backNavigation.newRequest();
        final android.os.Handler main=new android.os.Handler(android.os.Looper.getMainLooper());
        final Runnable fallback=() -> {
            if (!ticket.claim())return;
            if (!isFinishing() && !isDestroyed())MainActivity.super.onBackPressed();
        };
        main.postDelayed(fallback,1500);
        try {
            current.evaluateJavascript("(function(){try{return !!(window.StudioUI&&window.StudioUI.onBack&&window.StudioUI.onBack());}catch(e){return false;}})()", value -> {
                if (!ticket.claim())return;
                main.removeCallbacks(fallback);
                if (!"true".equals(value) && !isFinishing() && !isDestroyed())
                    MainActivity.super.onBackPressed();
            });
        } catch (RuntimeException e) {
            fallback.run();
            main.removeCallbacks(fallback);
        }
    }
    @Override protected void onDestroy() {
        backNavigation.invalidate();
        cancelInspectionNow(false);
        worker.shutdownNow();
        aiWorker.shutdownNow();
        if (view!=null) {
            view.removeJavascriptInterface("StudioNative");
            // WebView must be detached from the view hierarchy before destroy().
            if (view.getParent() instanceof android.view.ViewGroup)
                ((android.view.ViewGroup)view.getParent()).removeView(view);
            view.destroy();
            view=null;
        }
        super.onDestroy();
    }
}
