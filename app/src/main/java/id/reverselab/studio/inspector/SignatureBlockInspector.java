package id.reverselab.studio.inspector;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.SeekableByteChannel;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** APK Signing Block structure discovery only. Never claims cryptographic verification. */
public final class SignatureBlockInspector {
    private SignatureBlockInspector() {}
    private static final byte[] MAGIC = "APK Sig Block 42".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
    private static final long ID_V2=0x7109871aL, ID_V3=0xf05368c0L, ID_V31=0x1b93ad61L;
    private static final int MAX_PAIRS=128;
    private static byte[] at(SeekableByteChannel channel,long pos,int n) throws IOException {
        if(pos<0||n<0||pos>channel.size()-n)throw new IOException("Offset blok signature di luar berkas");
        ByteBuffer b=ByteBuffer.allocate(n);channel.position(pos);
        while(b.hasRemaining()){if(Thread.currentThread().isInterrupted())throw new IOException("Dibatalkan");int r=channel.read(b);if(r<=0)throw new IOException("Blok signature terpotong");}
        return b.array();
    }
    private static long read64(SeekableByteChannel ch,long pos) throws IOException {
        long v=ByteBuffer.wrap(at(ch,pos,8)).order(ByteOrder.LITTLE_ENDIAN).getLong();
        if(v<0)throw new IOException("Unsigned size signature melebihi batas yang didukung");return v;
    }
    private static long read32(SeekableByteChannel ch,long pos) throws IOException {
        return Integer.toUnsignedLong(ByteBuffer.wrap(at(ch,pos,4)).order(ByteOrder.LITTLE_ENDIAN).getInt());
    }
    public static Map<String,Object> inspect(SeekableByteChannel channel,ZipIndexInspector.Result idx) {
        Map<String,Object> out=new LinkedHashMap<>();
        out.put("status","checked");
        out.put("jarSignatureFilesPresent",idx.hasSignatureMetadata);
        out.put("verification","NOT_VERIFIED");
        out.put("verificationNote","Keberadaan signature v1/v2/v3 bukan bukti keabsahan. Verifikasi kriptografis gunakan apksigner verify di lingkungan Android SDK.");
        out.put("v2Present",false);out.put("v3Present",false);out.put("v31Present",false);
        long cd=idx.centralOffset;
        try {
            if(cd<24){out.put("signingBlock","absent");return out;}
            byte[] end=at(channel,cd-24,24);
            for(int i=0;i<16;i++)if(end[i+8]!=MAGIC[i]){out.put("signingBlock","absent");return out;}
            long size=ByteBuffer.wrap(end).order(ByteOrder.LITTLE_ENDIAN).getLong();
            if(size<24||size>cd-8)throw new IOException("Ukuran APK signing block tidak valid");
            long begin=cd-size-8;
            if(read64(channel,begin)!=size)throw new IOException("Ukuran awal/akhir signing block berbeda");
            long cursor=begin+8, stop=cd-24;
            List<String> ids=new ArrayList<>();int count=0;
            while(cursor<stop){
                if(++count>MAX_PAIRS)throw new IOException("Jumlah pasangan signing block melampaui batas");
                if(stop-cursor<12)throw new IOException("Header pasangan signature terpotong");
                long pairLen=read64(channel,cursor);
                if(pairLen<4||pairLen>stop-cursor-8)throw new IOException("Panjang pasangan signing block tidak valid");
                long id=read32(channel,cursor+8);
                String label=id==ID_V2?"APK Signature v2":id==ID_V3?"APK Signature v3":id==ID_V31?"APK Signature v3.1":"ID 0x"+Long.toHexString(id);
                if(ids.size()<32)ids.add(label);
                if(id==ID_V2)out.put("v2Present",true);
                if(id==ID_V3)out.put("v3Present",true);
                if(id==ID_V31)out.put("v31Present",true);
                cursor+=8+pairLen;
            }
            if(cursor!=stop)throw new IOException("Pasangan signing block tidak sejajar");
            out.put("signingBlock","present");out.put("blockSize",size+8);
            out.put("pairCount",count);out.put("idsPreview",ids);
        }catch(IOException ex){out.put("status","malformed_or_unreadable");out.put("reason",safe(ex));out.put("signingBlock","unknown");}
        return out;
    }
    private static String safe(Exception e) {String m=e.getMessage();if(m==null)m=e.getClass().getSimpleName();return m.substring(0,Math.min(160,m.length()));}
}
