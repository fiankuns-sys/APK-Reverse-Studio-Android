import id.reverselab.studio.inspector.ZipIndexInspector;
import id.reverselab.studio.inspector.PackageDeepInspector;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.List;

public class BinaryInspectorTest {
    private static PackageDeepInspector.Report load(String filename) throws Exception {
        try(SeekableByteChannel ch=Files.newByteChannel(Path.of("tools/fixtures/"+filename),StandardOpenOption.READ)) {
            ZipIndexInspector.Result index=ZipIndexInspector.inspect(ch);
            return PackageDeepInspector.inspect(ch,index);
        }
    }
    private static void check(boolean condition, String msg) {if(!condition)throw new AssertionError(msg);}
    private static void equals(Object a,Object b,String msg) {check(a.equals(b),msg+" expected "+a+", got "+b);}
    public static void main(String[] args) throws Exception {
        PackageDeepInspector.Report r=load("binary-synthetic.apk");
        Map<String,Object> m=r.manifest;
        equals("ok",m.get("status"),"Manifest status");
        equals("org.example.synthetic",m.get("packageName"),"Package name");
        equals("12",m.get("versionCode"),"Version code");
        equals("35",m.get("targetSdk"),"Target SDK");
        equals("26",m.get("minSdk"),"Min SDK");
        equals(1,m.get("permissionCount"),"Permission count");
        check(((List<?>)m.get("permissions")).contains("android.permission.INTERNET"),"Permission missing");
        equals(1,((Map<?,?>)m.get("components")).get("activity"),"Activity count");
        equals(1,((Map<?,?>)m.get("components")).get("service"),"Service count");
        equals("ok",r.resources.get("status"),"Resource header status");
        equals(1L,r.resources.get("packageCount"),"Resources package count");
        equals(1,r.dexFiles.size(),"DEX file count");
        Map<String,Object> dex=r.dexFiles.get(0);
        equals("ok",dex.get("status"),"DEX status");
        equals("035",dex.get("version"),"DEX version");
        equals(1,dex.get("classDefs"),"Class defs");
        check(((List<?>)dex.get("classExamples")).contains("Lorg/example/synthetic/HomeActivity;"),"DEX class descriptor sample");
        PackageDeepInspector.Report malformed=load("binary-bad-manifest.apk");
        equals("unsupported",malformed.manifest.get("status"),"Bad manifest should not crash");
        equals("ok",malformed.dexFiles.get(0).get("status"),"Bad manifest must not block DEX metadata");
        PackageDeepInspector.Report missing=load("binary-missing.apk");
        equals("missing",missing.manifest.get("status"),"Absent manifest");
        equals("missing",missing.resources.get("status"),"Absent resource table");
        equals(0,missing.dexFiles.size(),"Absent dex");
        System.out.println("PASS: Binary AXML package/version/SDK/permission/component, resource header, DEX class descriptor, corrupt and missing inputs");
    }
}
