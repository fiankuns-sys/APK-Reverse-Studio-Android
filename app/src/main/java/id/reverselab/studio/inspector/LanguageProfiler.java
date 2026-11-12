package id.reverselab.studio.inspector;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Evidence-based technology hints; does not claim to recover the original language. */
public final class LanguageProfiler {
    private LanguageProfiler() {}
    public static List<Map<String,Object>> profile(ZipIndexInspector.Result index, PackageDeepInspector.Report deep) {
        Map<String, List<String>> evidence = new LinkedHashMap<>();
        for (ZipIndexInspector.Entry e : index.entries) {
            String n = e.name.toLowerCase(Locale.ROOT);
            if (n.endsWith(".so")) add(evidence,"C / C++ / Rust (native)",e.name);
            if (n.contains("libflutter.so") || n.contains("flutter_assets/") || n.endsWith("libapp.so")) add(evidence,"Dart / Flutter (indikasi)",e.name);
            if (n.contains("libunity.so") || n.contains("managed/assemblies") || n.contains("global-metadata.dat")) add(evidence,"C# / Unity (indikasi)",e.name);
            if (n.endsWith(".js") || n.endsWith(".bundle")) add(evidence,"JavaScript (aset)",e.name);
            if (n.endsWith(".wasm")) add(evidence,"WebAssembly",e.name);
            if (n.endsWith(".py")) add(evidence,"Python (aset)",e.name);
            if (n.endsWith(".lua")) add(evidence,"Lua (aset)",e.name);
            if (n.endsWith(".kt")) add(evidence,"Kotlin (berkas sumber tersimpan)",e.name);
            if (n.endsWith(".java")) add(evidence,"Java (berkas sumber tersimpan)",e.name);
            if (n.endsWith(".ts") || n.endsWith(".tsx")) add(evidence,"TypeScript (aset)",e.name);
        }
        if (index.dexCount>0) add(evidence,"Java / Kotlin / bahasa JVM lainnya (DEX)","classes*.dex: "+index.dexCount+" file");
        for (Map<String,Object> d : deep.dexFiles) {
            Object samples=d.get("classExamples");
            if (!(samples instanceof List)) continue;
            for (Object item:(List<?>)samples) {
                String n=String.valueOf(item);
                if (n.startsWith("Lkotlin/") || n.contains("kotlinx/")) add(evidence,"Kotlin (indikasi)",n);
                if (n.contains("/reactnative/") || n.contains("facebook/react/")) add(evidence,"JavaScript / React Native (indikasi)",n);
            }
        }
        List<Map<String,Object>> out=new ArrayList<>();
        for (Map.Entry<String,List<String>> e:evidence.entrySet()) {
            Map<String,Object> finding=new LinkedHashMap<>();
            finding.put("technology",e.getKey());
            finding.put("evidence",e.getValue().subList(0,Math.min(4,e.getValue().size())));
            finding.put("confidence",e.getKey().contains("(indikasi)")?"indikasi":"bukti artefak");
            out.add(finding);
        }
        return out;
    }
    private static void add(Map<String,List<String>> data,String lang,String proof) {
        List<String> list=data.computeIfAbsent(lang,k->new ArrayList<>());
        if (list.size()<4 && !list.contains(proof))list.add(proof);
    }
}
