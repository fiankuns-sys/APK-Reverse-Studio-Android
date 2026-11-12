package id.reverselab.studio.inspector;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.channels.ClosedChannelException;
import java.nio.channels.NonWritableChannelException;
import java.nio.channels.SeekableByteChannel;
import java.nio.channels.FileChannel;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** Read nested APK metadata in split-package archives; strict memory/entry caps, no disk extraction. */
public final class PackageSetInspector {
    private PackageSetInspector(){}
    public static final long MAX_NESTED_APK=32L*1024*1024;
    public static final int MAX_NESTED_COUNT=8;
    public static final int MAX_DECODED_COUNT=3;
    public static List<Map<String,Object>> inspect(SeekableByteChannel file, ZipIndexInspector.Result outer) {
        List<Map<String,Object>> out=new ArrayList<>();
        int decoded=0;
        for (ZipIndexInspector.Entry item:outer.entries) {
            if (out.size()>=MAX_NESTED_COUNT || Thread.currentThread().isInterrupted())break;
            String name=item.name.toLowerCase(Locale.ROOT);
            if (!name.endsWith(".apk") || name.startsWith("/") || name.contains("../") || name.contains("\\")) continue;
            Map<String,Object> v=new LinkedHashMap<>();
            v.put("name",item.name);
            v.put("size",item.uncompressedSize);
            if (item.uncompressedSize>MAX_NESTED_APK || decoded>=MAX_DECODED_COUNT || item.uncompressedSize<22) {
                v.put("status","metadata-only");
                v.put("reason","Batas memori / jumlah APK bersarang untuk inspeksi rinci; metadata indeks tetap tersedia");
            } else if (item.encrypted) {
                v.put("status","unsupported");v.put("reason","Entri terenkripsi");
            } else {
                try {
                    byte[] apk=PackageDeepInspector.readPayload(file,item,(int)MAX_NESTED_APK);
                    decoded++;
                    try (ByteArrayChannel nested=new ByteArrayChannel(apk)) {
                        ZipIndexInspector.Result idx=ZipIndexInspector.inspect(nested);
                        PackageDeepInspector.Report d=PackageDeepInspector.inspect(nested,idx);
                        v.put("status","ok");v.put("entries",idx.totalEntries);
                        v.put("dexCount",idx.dexCount);v.put("hasManifest",idx.hasManifest);
                        v.put("manifest",d.manifest);
                        v.put("languages",LanguageProfiler.profile(idx,d));
                    }
                } catch (Exception e) {
                    v.put("status","unsupported");
                    v.put("reason","Struktur APK tertanam tidak dapat diindeks: "+e.getClass().getSimpleName());
                }
            }
            out.add(v);
        }
        return out;
    }
    /** Seekable read-only byte channel; backed by one explicitly capped archive entry. */
    public static final class ByteArrayChannel implements SeekableByteChannel {
        private final byte[] data;
        private int position;
        private boolean open=true;
        public ByteArrayChannel(byte[] bytes){this.data=bytes;}
        @Override public int read(ByteBuffer dst) throws IOException {
            if(!open)throw new ClosedChannelException();
            if(position>=data.length)return -1;
            int size=Math.min(dst.remaining(),data.length-position);
            dst.put(data,position,size);position+=size;return size;
        }
        @Override public int write(ByteBuffer b){throw new NonWritableChannelException();}
        @Override public long position() throws IOException {if(!open)throw new ClosedChannelException();return position;}
        @Override public SeekableByteChannel position(long p) throws IOException {
            if(!open)throw new ClosedChannelException();
            if(p<0||p>data.length)throw new IllegalArgumentException("Invalid offset");
            position=(int)p;return this;
        }
        @Override public long size(){return data.length;}
        @Override public SeekableByteChannel truncate(long s){throw new NonWritableChannelException();}
        @Override public boolean isOpen(){return open;}
        @Override public void close(){open=false;}
    }
}
