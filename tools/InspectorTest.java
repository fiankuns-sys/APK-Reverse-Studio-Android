import id.reverselab.studio.inspector.ZipIndexInspector;
import java.nio.channels.SeekableByteChannel;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.io.IOException;

public class InspectorTest {
    private static ZipIndexInspector.Result run(String f) throws Exception {
        try (SeekableByteChannel channel=Files.newByteChannel(Path.of("tools/fixtures/"+f),StandardOpenOption.READ)) {
            return ZipIndexInspector.inspect(channel);
        }
    }
    private static void check(boolean ok,String message) {
        if (!ok)throw new AssertionError(message);
    }
    public static void main(String[] args) throws Exception {
        ZipIndexInspector.Result apk=run("minimal.apk");
        check(apk.totalEntries==6,"Incorrect APK entry total");
        check(apk.hasManifest,"Manifest not discovered");
        check(apk.hasArsc,"resources.arsc missing");
        check(apk.dexCount==1,"Dex count not detected");
        check(apk.counts.get("lib")==1,"Native library count");
        check(!apk.zip64,"Simple APK flagged ZIP64");
        ZipIndexInspector.Result zip64=run("zip64.zip");
        check(zip64.zip64,"ZIP64 not recognized");
        check(zip64.totalEntries==apk.totalEntries,"ZIP64 index count mismatch");
        ZipIndexInspector.Result suspicious=run("suspicious.zip");
        check(suspicious.suspiciousPaths>=1,"Zip Slip not detected");
        check(suspicious.duplicateNames>=1,"Duplicate names not detected");
        boolean rejected=false;
        try {run("corrupt.zip");} catch (IOException e) {rejected=true;}
        check(rejected,"Truncated ZIP not rejected");
        System.out.println("PASS: standard APK index, manifest/DEX/lib, ZIP64 EOCD, zip slip/duplicate detection, corrupt ZIP rejection");
    }
}
