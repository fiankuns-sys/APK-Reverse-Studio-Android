import id.reverselab.studio.inspector.DexSymbolInspector;
import id.reverselab.studio.inspector.ZipIndexInspector;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

public class DexSymbolInspectorTest {
    static void ok(boolean v,String why){if(!v)throw new AssertionError(why);}
    static Map<String,Object> inspect(String name)throws Exception {
        try(SeekableByteChannel ch=Files.newByteChannel(Path.of("tools/fixtures/"+name))){
            return DexSymbolInspector.inspect(ch,ZipIndexInspector.inspect(ch));
        }
    }
    public static void main(String[] args)throws Exception {
        Map<String,Object> report=inspect("v06-symbols.apk");
        List<?> classes=(List<?>)report.get("classes"),methods=(List<?>)report.get("methods");
        ok(classes.size()==1,"One class declaration");
        ok(methods.size()==1,"One defined method");
        ok("Lorg/example/synthetic/SymbolActivity;".equals(((Map<?,?>)classes.get(0)).get("name")),"class signature must be byte-derived");
        ok("Lorg/example/synthetic/SymbolActivity;->onCreate()V".equals(((Map<?,?>)methods.get(0)).get("signature")),"method signature must be reconstructed from DEX tables");
        ok("indexed".equals(((Map<?,?>)((List<?>)report.get("files")).get(0)).get("status")),"Valid dex should be indexed");
        Map<String,Object> bad=inspect("v06-corrupt-method.apk");
        ok("unsupported".equals(((Map<?,?>)((List<?>)bad.get("files")).get(0)).get("status")),"Corrupt class_data must be rejected");
        ok(((List<?>)bad.get("methods")).isEmpty(),"Reject invalid methods");
        System.out.println("PASS v0.6 DEX class_data symbols, method signature, bounds rejection");
    }
}
