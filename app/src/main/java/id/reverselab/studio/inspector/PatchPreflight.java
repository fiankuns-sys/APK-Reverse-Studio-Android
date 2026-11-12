package id.reverselab.studio.inspector;

import java.util.*;
import java.util.regex.*;

/** Conservative preflight. PASS means these checks passed, NOT that Apktool rebuild/runtime will succeed. */
public final class PatchPreflight {
    private PatchPreflight() {}
    public static List<String> warnings(String path,String content){
        List<String> result=new ArrayList<>();
        if(!ApktoolBundleInspector.allowed(path)){result.add("Path tidak termasuk area patch yang diizinkan");return result;}
        if(content==null||content.isEmpty()){result.add("Teks kosong");return result;}
        if(content.indexOf('\0')>=0||content.length()>ApktoolBundleInspector.MAX_PER_FILE){result.add("Ukuran/karakter source tidak valid");return result;}
        if(path.endsWith(".smali")){
            if(!Pattern.compile("(?m)^\\.class\\s+").matcher(content).find())result.add("Direktif .class tidak ditemukan");
            if(!Pattern.compile("(?m)^\\.super\\s+").matcher(content).find())result.add("Direktif .super tidak ditemukan");
            int begin=0,end=0;
            for(String line:content.split("\\r?\\n")){
                String trim=line.trim();if(trim.startsWith(".method "))begin++;if(trim.equals(".end method"))end++;
            }
            if(begin!=end)result.add("Jumlah .method dan .end method berbeda");
            if(begin>1500)result.add("Metode terlalu banyak untuk diperiksa");
        }else if(path.endsWith(".xml")){
            String upper=content.toUpperCase(Locale.ROOT);
            if(upper.contains("<!DOCTYPE")||upper.contains("<!ENTITY"))result.add("Deklarasi DTD/ENTITY tidak diperbolehkan dalam patch review");
            if(!content.trim().startsWith("<"))result.add("XML tidak dimulai dengan tag");
        }
        return result;
    }
}
