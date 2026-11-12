package id.reverselab.studio.inspector;

import java.nio.channels.SeekableByteChannel;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.CRC32;

/** CRC32 checks the decompressed bytes of small *selected* entries, not full APK integrity. */
public final class IntegritySampler {
    private IntegritySampler() {}
    private static final int MAX_SAMPLES=10;
    private static final int MAX_PER_ENTRY=2*1024*1024;
    public static Map<String,Object> inspect(SeekableByteChannel channel,ZipIndexInspector.Result idx){
        Map<String,Object> out=new LinkedHashMap<>();List<Map<String,Object>> items=new ArrayList<>();
        int ok=0,failed=0,skipped=0;
        for(ZipIndexInspector.Entry e:idx.entries) {
            if(items.size()>=MAX_SAMPLES||Thread.currentThread().isInterrupted())break;
            if(!(e.name.equals("AndroidManifest.xml")||e.name.equals("resources.arsc")||e.group.equals("dex")||e.name.endsWith(".so")))continue;
            Map<String,Object> item=new LinkedHashMap<>();item.put("path",e.name);item.put("zipClaimedCrc32",String.format("%08X",e.crc32));
            if(e.uncompressedSize>MAX_PER_ENTRY||e.uncompressedSize<0) {item.put("status","skipped_size_limit");skipped++;}
            else if(e.encrypted || (e.method!=0&&e.method!=8)) {item.put("status","unsupported");skipped++;}
            else try {
                byte[] content=PackageDeepInspector.readPayload(channel,e,MAX_PER_ENTRY);
                CRC32 crc=new CRC32();crc.update(content);
                boolean match=crc.getValue()==e.crc32;
                item.put("actualCrc32",String.format("%08X",crc.getValue()));item.put("status",match?"match":"MISMATCH");
                if(match)ok++;else failed++;
            }catch(Exception ex){item.put("status","read_error");failed++;}
            items.add(item);
        }
        out.put("checkedCount",ok+failed);out.put("matches",ok);out.put("failures",failed);out.put("skipped",skipped);out.put("samples",items);
        out.put("scope","CRC32 pada maksimum 10 entri, masing-masing maksimum 2 MiB; CRC32 tidak bersifat kriptografis; bagian APK lain belum diperiksa");
        return out;
    }
}
