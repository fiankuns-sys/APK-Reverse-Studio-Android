package id.reverselab.studio.inspector;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Deterministic evidence; do not conflate permissions with demonstrated malicious behavior. */
public final class RuleInsights {
    private RuleInsights() {}
    public static List<Map<String,Object>> inspect(ZipIndexInspector.Result idx, PackageDeepInspector.Report deep, List<Map<String,Object>> nested) {
        List<Map<String,Object>> out=new ArrayList<>();
        if(idx.suspiciousPaths>0)out.add(item("warning","Jalur arsip memerlukan peninjauan",idx.suspiciousPaths+" path/symlink tidak aman","ZIP central directory"));
        if(idx.duplicateNames>0)out.add(item("warning","Nama entri berulang",idx.duplicateNames+" nama sama pada bagian yang dipindai","ZIP central directory"));
        if(idx.encryptedEntries>0)out.add(item("limit","Konten terenkripsi",idx.encryptedEntries+" entri tidak dapat diperiksa dengan pembaca saat ini","ZIP general-purpose flags"));
        if(idx.highRatioEntries>0)out.add(item("warning","Kompresi sangat tinggi",idx.highRatioEntries+" entri patut diperiksa tanpa ekstraksi massal","ZIP size ratio"));
        if(idx.indexTruncated)out.add(item("limit","Tampilan daftar berkas dibatasi","Jumlah entri sebenarnya dihitung, tetapi nama yang ditampilkan hanya contoh","Explorer preview cap"));
        if(!idx.hasManifest && nested.isEmpty())out.add(item("info","Manifest akar tidak ditemukan","Mungkin paket kumpulan, arsip data atau bukan APK","AndroidManifest.xml"));
        if(idx.hasSignatureMetadata)out.add(item("info","File terkait penandatanganan ditemukan","Keberadaan file META-INF bukan verifikasi APK signature","META-INF"));
        if(idx.dexCount>0)out.add(item("info","Kode DEX terdeteksi",idx.dexCount+" file DEX; dekompilasi Java/Smali belum dilakukan","classes*.dex"));
        Object perms=deep.manifest.get("permissions");
        if(perms instanceof List && ((List<?>)perms).size()>0) {
            out.add(item("review","Izin aplikasi dapat ditinjau",((List<?>)perms).size()+" permission dideklarasikan; bukan bukti penggunaan atau niat berbahaya","AndroidManifest.xml"));
        }
        if(!nested.isEmpty())out.add(item("info","Paket APK bersarang",nested.size()+" APK terindeks; hanya sebagian yang dibaca mendalam karena batas RAM","ZIP entry names"));
        return out;
    }
    private static Map<String,Object> item(String severity,String title,String detail,String evidence) {
        Map<String,Object> r=new LinkedHashMap<>();
        r.put("type",severity);r.put("title",title);r.put("detail",detail);r.put("evidence",evidence);
        r.put("source","local-rule-v0.4");return r;
    }
}
