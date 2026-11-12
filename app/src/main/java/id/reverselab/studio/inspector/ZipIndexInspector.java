package id.reverselab.studio.inspector;

import java.io.EOFException;
import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Read-only, seek-based ZIP/ZIP64 CENTRAL DIRECTORY indexer. Never inflates an entry,
 * executes source code, or copies an archive to private storage.
 * Requires a seekable channel (SAF providers that stream a pipe are not supported yet).
 */
public final class ZipIndexInspector {
    private ZipIndexInspector() { }
    public static final long MAX_INPUT = 40_000_000_000L;
    public static final int MAX_ENTRIES = 120_000;
    public static final int MAX_PREVIEW_PER_GROUP = 250;
    private static final int MAX_TAIL = 65_557;
    private static final Charset CP437 = Charset.forName("IBM437");

    public static final class Entry {
        public String name;
        public String group;
        public long compressedSize;
        public long uncompressedSize;
        public long crc32;
        public int method;
        public boolean encrypted;
        public long localHeaderOffset;
        public int flags;
        public Entry(String name, String group, long compressed, long uncompressed, long crc, int method, boolean encrypted, long localHeaderOffset, int flags) {
            this.name = name;
            this.group = group;
            this.compressedSize = compressed;
            this.uncompressedSize = uncompressed;
            this.crc32 = crc;
            this.method = method;
            this.encrypted = encrypted;
            this.localHeaderOffset = localHeaderOffset;
            this.flags = flags;
        }
    }
    public static final class Result {
        public long fileSize;
        public long totalUncompressed;
        public long totalCompressed;
        public long totalEntries;
        public long centralOffset;
        public boolean zip64;
        public boolean indexTruncated;
        public int suspiciousPaths;
        public int duplicateNames;
        public boolean duplicateScanTruncated;
        public int encryptedEntries;
        public int highRatioEntries;
        public final Map<String,Integer> counts = new HashMap<>();
        public final List<Entry> entries = new ArrayList<>();
        /** Selected canonical root entries only; precise offsets for bounded payload reads. */
        public final Map<String,Entry> deepTargets = new HashMap<>();
        public final List<String> warnings = new ArrayList<>();
        public boolean hasManifest;
        public boolean hasArsc;
        public boolean hasSignatureMetadata;
        public int dexCount;
        public String formatHint = "ZIP";
    }

    private static final int EOCD = 0x06054b50, ZIP64_LOC = 0x07064b50;
    private static final int ZIP64_EOCD = 0x06064b50, CEN = 0x02014b50;
    private static long u32(ByteBuffer b) { return Integer.toUnsignedLong(b.getInt()); }
    private static int u16(ByteBuffer b) { return Short.toUnsignedInt(b.getShort()); }
    private static ByteBuffer le(byte[] data) { return ByteBuffer.wrap(data).order(ByteOrder.LITTLE_ENDIAN); }
    private static byte[] read(SeekableByteChannel channel, long pos, int size) throws IOException {
        if (pos < 0 || size < 0 || pos > channel.size() - size) throw new EOFException("Offset ZIP di luar berkas: " + pos);
        ByteBuffer dst = ByteBuffer.allocate(size);
        channel.position(pos);
        int noProgress = 0;
        while (dst.hasRemaining()) {
            if (Thread.currentThread().isInterrupted()) throw new IOException("Pemeriksaan dibatalkan");
            int n = channel.read(dst);
            if (n < 0) throw new EOFException("Akhir berkas sebelum struktur ZIP lengkap");
            if (n == 0 && ++noProgress > 5) throw new IOException("Penyedia file tidak mendukung pembacaan acak secara konsisten");
            if (n > 0) noProgress = 0;
        }
        return dst.array();
    }
    private static long addExact(long x, long y) throws IOException {
        try { return Math.addExact(x,y); } catch (ArithmeticException e) { throw new IOException("Overflow ukuran ZIP",e); }
    }
    private static String group(String name) {
        if (name.equals("AndroidManifest.xml")) return "manifest";
        if (name.equals("resources.arsc") || name.startsWith("res/")) return "res";
        if (name.matches("classes(?:[0-9]+)?\\.dex")) return "dex";
        if (name.startsWith("assets/")) return "assets";
        if (name.startsWith("lib/") || name.startsWith("jni/")) return "lib";
        if (name.startsWith("META-INF/")) return "meta";
        return "other";
    }
    private static boolean unsafe(String n) {
        if (n.isEmpty() || n.startsWith("/") || n.startsWith("\\") || n.indexOf('\0') >= 0 || n.indexOf('\\') >= 0) return true;
        if (n.length() > 1 && Character.isLetter(n.charAt(0)) && n.charAt(1) == ':') return true;
        for (String part : n.split("/",-1)) if (part.equals("..") || part.equals(".")) return true;
        return false;
    }
    private static long zip64Field(byte[] extra, boolean needU, boolean needC, boolean needO, long[] vals) throws IOException {
        ByteBuffer e = le(extra);
        while (e.remaining() >= 4) {
            int id = u16(e), n = u16(e);
            if (n > e.remaining()) throw new IOException("Extra field ZIP terpotong");
            int end = e.position() + n;
            if (id == 0x0001) {
                if (needU) { if (e.remaining() < 8 || e.position()+8 > end) throw new IOException("ZIP64 uncompressed field hilang"); vals[0]=e.getLong(); }
                if (needC) { if (e.position()+8 > end) throw new IOException("ZIP64 compressed field hilang"); vals[1]=e.getLong(); }
                if (needO) { if (e.position()+8 > end) throw new IOException("ZIP64 local header offset hilang"); vals[2]=e.getLong(); }
                return id;
            }
            e.position(end);
        }
        if (needU || needC || needO) throw new IOException("Ukuran ZIP64 memerlukan extra field tetapi tidak tersedia");
        return -1;
    }
    private static String name(byte[] bytes, int flags) {
        return new String(bytes,(flags & (1<<11))!=0 ? StandardCharsets.UTF_8 : CP437);
    }
    public static Result inspect(SeekableByteChannel ch) throws IOException {
        Result result = new Result();
        final long size = ch.size();
        if (size < 22) throw new IOException("Berkas terlalu kecil untuk ZIP");
        if (size > MAX_INPUT) throw new IOException("Berkas lebih besar dari batas input 40 GB");
        result.fileSize = size;
        final int tailSize = (int)Math.min(size, MAX_TAIL);
        byte[] tail = read(ch, size-tailSize, tailSize);
        int eocdIndex = -1;
        for (int i=tail.length-22;i>=0;i--) {
            if ((tail[i]&255)==0x50 && (tail[i+1]&255)==0x4b && (tail[i+2]&255)==0x05 && (tail[i+3]&255)==0x06) {
                int comment=(tail[i+20]&255)|((tail[i+21]&255)<<8);
                if (i+22+comment==tail.length) { eocdIndex=i;break; }
            }
        }
        if (eocdIndex<0) throw new IOException("ZIP End of Central Directory tidak ditemukan; berkas mungkin rusak atau bukan ZIP");
        long eocdPos = size-tailSize+eocdIndex;
        ByteBuffer eocd = le(read(ch,eocdPos,22));
        if (eocd.getInt()!=EOCD) throw new IOException("ZIP EOCD tidak valid");
        int disk=u16(eocd), centralDisk=u16(eocd), diskEntries=u16(eocd), entries16=u16(eocd);
        long centralSize=u32(eocd), centralOffset=u32(eocd);
        u16(eocd); // comment
        if (disk!=0 || centralDisk!=0) throw new IOException("ZIP multi-disk belum didukung");
        long entries=entries16;
        if (entries16==65535 || centralOffset==0xffffffffL || centralSize==0xffffffffL) {
            result.zip64=true;
            if (eocdPos<20) throw new IOException("ZIP64 locator hilang");
            ByteBuffer loc=le(read(ch,eocdPos-20,20));
            if (loc.getInt()!=ZIP64_LOC) throw new IOException("ZIP64 locator tidak ditemukan");
            long locatorDisk=u32(loc), zip64Offset=loc.getLong(), totalDisks=u32(loc);
            if (locatorDisk!=0 || totalDisks!=1 || zip64Offset<0) throw new IOException("ZIP64 multidisk/offset tidak didukung");
            ByteBuffer z=le(read(ch,zip64Offset,56));
            if (z.getInt()!=ZIP64_EOCD) throw new IOException("ZIP64 EOCD rusak");
            if (z.getLong()<44) throw new IOException("Ukuran ZIP64 EOCD tidak masuk akal");
            z.getShort();z.getShort();
            if (u32(z)!=0 || u32(z)!=0) throw new IOException("ZIP64 multi-disk tidak didukung");
            long disk64=z.getLong();
            entries=z.getLong();
            centralSize=z.getLong();
            centralOffset=z.getLong();
            if (disk64!=entries || entries<0) throw new IOException("Jumlah entri ZIP64 tidak konsisten");
        } else if (diskEntries!=entries16) throw new IOException("Jumlah entri ZIP tidak konsisten");
        if (entries>MAX_ENTRIES) throw new IOException("Terlalu banyak entri (batas aman " + MAX_ENTRIES + ")");
        if (centralOffset<0 || centralSize<0 || centralOffset>size || centralSize>size-centralOffset || centralOffset+centralSize>eocdPos)
            throw new IOException("Central directory ZIP di luar batas berkas");
        result.centralOffset=centralOffset;
        long position=centralOffset;
        long cdEnd=addExact(centralOffset,centralSize);
        Set<String> seen=new HashSet<>();
        Map<String,Integer> preview=new HashMap<>();
        for (long i=0;i<entries;i++) {
            if (Thread.currentThread().isInterrupted()) throw new IOException("Pemeriksaan dibatalkan");
            if (position>cdEnd-46) throw new IOException("Central directory terpotong");
            ByteBuffer c=le(read(ch,position,46));
            if (c.getInt()!=CEN) throw new IOException("Signature entri ZIP tidak valid pada " + position);
            c.getShort();c.getShort();
            int flags=u16(c),method=u16(c);
            c.getShort();c.getShort();
            long crc=u32(c),compressed=u32(c),uncompressed=u32(c);
            int nameSize=u16(c),extraSize=u16(c),commentSize=u16(c);
            c.getShort();c.getShort();
            long attrs=u32(c),localOffset=u32(c);
            long end=addExact(position,46L+nameSize+extraSize+commentSize);
            if (end>cdEnd) throw new IOException("Panjang nama / extra / komentar ZIP melewati central directory");
            if (nameSize==0 || nameSize>1024) throw new IOException("Nama entri ZIP lebih besar dari batas aman 1024 byte");
            byte[] raw=read(ch,position+46,nameSize);
            byte[] extra=read(ch,position+46+nameSize,extraSize);
            if (uncompressed==0xffffffffL || compressed==0xffffffffL || localOffset==0xffffffffL) {
                long[] vals={uncompressed,compressed,localOffset};
                zip64Field(extra,uncompressed==0xffffffffL,compressed==0xffffffffL,localOffset==0xffffffffL,vals);
                uncompressed=vals[0];compressed=vals[1];localOffset=vals[2];
                result.zip64=true;
            }
            if (uncompressed<0 || compressed<0 || localOffset<0 || localOffset>centralOffset) throw new IOException("Nilai ukuran/offset ZIP64 tidak valid");
            String entryName=name(raw,flags);
            String category=group(entryName);
            result.counts.put(category,result.counts.getOrDefault(category,0)+1);
            if (unsafe(entryName)) result.suspiciousPaths++;
            if (seen.size() < 25_000) {
                if (!seen.add(entryName)) result.duplicateNames++;
            } else result.duplicateScanTruncated = true;
            if ((flags&1)!=0) result.encryptedEntries++;
            if (compressed>0 && uncompressed>64L*1024*1024 && uncompressed/compressed>1000) result.highRatioEntries++;
            result.totalUncompressed=addExact(result.totalUncompressed,uncompressed);
            result.totalCompressed=addExact(result.totalCompressed,compressed);
            if (entryName.equals("AndroidManifest.xml"))result.hasManifest=true;
            if (entryName.equals("resources.arsc"))result.hasArsc=true;
            if (category.equals("dex")) result.dexCount++;
            if (entryName.startsWith("META-INF/") && (entryName.endsWith(".RSA") || entryName.endsWith(".DSA") || entryName.endsWith(".EC"))) result.hasSignatureMetadata=true;
            // Unix symlink (external attributes contain high 16bit mode).
            if (((attrs >>> 16) & 0xF000)==0xA000) result.suspiciousPaths++;
            int count=preview.getOrDefault(category,0);
            if (count<MAX_PREVIEW_PER_GROUP) {
                result.entries.add(new Entry(entryName,category,compressed,uncompressed,crc,method,(flags&1)!=0,localOffset,flags));
                preview.put(category,count+1);
            } else result.indexTruncated=true;
            if ((entryName.equals("AndroidManifest.xml") || entryName.equals("resources.arsc")
                    || (category.equals("dex") && result.deepTargets.size() < 34)) && !result.deepTargets.containsKey(entryName)) {
                result.deepTargets.put(entryName,new Entry(entryName,category,compressed,uncompressed,crc,method,(flags&1)!=0,localOffset,flags));
            }
            position=end;
        }
        if (position!=cdEnd) result.warnings.add("Central directory mempunyai data tambahan yang tidak terindeks");
        result.totalEntries=entries;
        if (result.duplicateNames>0) result.warnings.add("Ada nama entri duplikat pada bagian yang diperiksa: " + result.duplicateNames);
        if (result.duplicateScanTruncated) result.warnings.add("Pemeriksaan duplikat dibatasi pada 25.000 nama unik demi keamanan memori");
        if (result.suspiciousPaths>0) result.warnings.add("Ada path atau symlink mencurigakan: " + result.suspiciousPaths);
        if (result.encryptedEntries>0) result.warnings.add("Ada entri ZIP terenkripsi: " + result.encryptedEntries);
        if (result.highRatioEntries>0) result.warnings.add("Ada entri rasio kompresi ekstrem: " + result.highRatioEntries);
        if (result.indexTruncated) result.warnings.add("Tampilan Explorer dibatasi pada " + MAX_PREVIEW_PER_GROUP + " entri per kategori; statistik menghitung seluruh entri");
        if (result.hasManifest && result.dexCount>0) result.formatHint="APK (indikasi struktur)";
        else if (result.counts.getOrDefault("other",0)>0) result.formatHint="ZIP / paket Android (belum diverifikasi)";
        return result;
    }
}
