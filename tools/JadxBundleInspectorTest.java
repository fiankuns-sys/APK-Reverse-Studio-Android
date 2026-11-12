import id.reverselab.studio.inspector.JadxBundleInspector;
import java.io.File;
import java.io.IOException;
public final class JadxBundleInspectorTest {
    private static void expectBad(String filename) throws Exception {
        try {JadxBundleInspector.inspect(new File("tools/fixtures/"+filename));throw new AssertionError("Expected rejected file: "+filename);}
        catch(IOException expected) { /* pass */ }
    }
    public static void main(String[] args) throws Exception {
        File valid=new File("tools/fixtures/v07-valid.zip");
        JadxBundleInspector.Result index=JadxBundleInspector.inspect(valid);
        if(index.sources.size()!=1)throw new AssertionError("Wrong source count");
        if(!index.manifest.contains("jadx-cli-review"))throw new AssertionError("Wrong manifest");
        String src=JadxBundleInspector.readSource(valid,"sources/demo/Example.java");
        if(!src.contains("answer = 42"))throw new AssertionError("Wrong source content");
        if(JadxBundleInspector.sha256(src).length()!=64)throw new AssertionError("Wrong hash length");
        expectBad("v07-traversal.zip");
        expectBad("v07-duplicate.zip");
        expectBad("v07-too-large-source.zip");
        try {JadxBundleInspector.readSource(valid,"../../secret");throw new AssertionError("Unsafe read allowed");}
        catch(IOException expected) { }
        System.out.println("JADX Bundle Inspector PASS: valid file, content/hash, path traversal, duplicate, oversized, unsafe selection");
    }
}
