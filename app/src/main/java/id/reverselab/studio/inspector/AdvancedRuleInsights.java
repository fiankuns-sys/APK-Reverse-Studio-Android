package id.reverselab.studio.inspector;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Cross-checks v0.5 metadata without drawing conclusions about malware or trust. */
public final class AdvancedRuleInsights {
    private AdvancedRuleInsights(){}
    private static Map<String,Object> item(String type,String title,String detail,String evidence){
        Map<String,Object> m=new LinkedHashMap<>();m.put("type",type);m.put("title",title);m.put("detail",detail);m.put("evidence",evidence);return m;
    }
    public static List<Map<String,Object>> inspect(Map<String,Object> signature,List<Map<String,Object>> libs,Map<String,Object> integrity){
        List<Map<String,Object>> findings=new ArrayList<>();
        if("malformed_or_unreadable".equals(signature.get("status")))findings.add(item("warning","Blok signature tidak dapat diperiksa","Struktur blok tanda tangan tidak lengkap atau tidak dapat dibaca. Validitas APK tetap tidak diketahui.","signingInspection.status + signingInspection.reason"));
        if("present".equals(signature.get("signingBlock")))findings.add(item("info","APK Signing Block ditemukan","Skema yang terdeteksi adalah metadata struktur saja; lakukan validasi kriptografis terpisah sebelum mengambil keputusan.","signingInspection.v2Present/v3Present/v31Present; verification=NOT_VERIFIED"));
        int failed=number(integrity.get("failures"));
        if(failed>0)findings.add(item("warning","Ada sampel integritas yang gagal","Minimal satu sampel memiliki CRC tidak cocok atau gagal dibaca; periksa berkas dan bandingkan dengan sumber tepercaya.","integritySamples.samples yang statusnya MISMATCH/read_error"));
        int skipped=number(integrity.get("skipped"));
        if(skipped>0)findings.add(item("info","Pemeriksaan CRC memiliki batas","Sebagian entri dilewati karena ukuran atau metode ZIP; hasil sampel tidak mewakili seluruh APK.","integritySamples.skipped="+skipped));
        int unsupported=0;for(Map<String,Object> lib:libs)if(!"ok".equals(lib.get("status")))unsupported++;
        if(unsupported>0)findings.add(item("info","Sebagian header ELF tidak terbaca","Ada library .so yang tidak sesuai parser header atau tidak dapat diambil. Ini bukan kesimpulan keamanan.","nativeLibraries.status unsupported sebanyak "+unsupported));
        return findings;
    }
    private static int number(Object value){return value instanceof Number?((Number)value).intValue():0;}
}
