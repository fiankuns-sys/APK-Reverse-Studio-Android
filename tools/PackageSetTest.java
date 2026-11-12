import id.reverselab.studio.inspector.*;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.*;
import java.util.*;

public class PackageSetTest {
    private static void check(boolean pass,String what) {if(!pass)throw new AssertionError(what);}
    public static void main(String[] args) throws Exception {
        try(SeekableByteChannel ch=Files.newByteChannel(Path.of("tools/fixtures/package-set.xapk"),StandardOpenOption.READ)){
            ZipIndexInspector.Result idx=ZipIndexInspector.inspect(ch);
            List<Map<String,Object>> entries=PackageSetInspector.inspect(ch,idx);
            check(entries.size()==2,"Two nested APKs expected");
            check("ok".equals(entries.get(0).get("status")),"Nested APK decoded");
            Map<?,?> manifest=(Map<?,?>)entries.get(0).get("manifest");
            check("org.example.synthetic".equals(manifest.get("packageName")),"Nested manifest parsed");
            check(((Number)entries.get(0).get("dexCount")).intValue()==1,"Nested DEX detected");
            PackageDeepInspector.Report d=PackageDeepInspector.inspect(ch,idx);
            List<Map<String,Object>> languages=LanguageProfiler.profile(idx,d);
            check(languages.stream().anyMatch(e->e.get("technology").toString().contains("JavaScript")),"Evidence profile for JS asset");
            check(!RuleInsights.inspect(idx,d,entries).isEmpty(),"Rule engine found package set");
        }
        try(SeekableByteChannel ch=Files.newByteChannel(Path.of("tools/fixtures/package-set-oversize.xapk"),StandardOpenOption.READ)){
            ZipIndexInspector.Result idx=ZipIndexInspector.inspect(ch);
            List<Map<String,Object>> entries=PackageSetInspector.inspect(ch,idx);
            check(entries.size()==1,"Oversized inner archive still listed");
            check("metadata-only".equals(entries.get(0).get("status")),"32MiB inner archive must not inflate");
        }
        System.out.println("PASS: XAPK nested inspection, protected size cap, language evidence, local rules");
    }
}
