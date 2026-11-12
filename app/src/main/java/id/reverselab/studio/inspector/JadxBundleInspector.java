package id.reverselab.studio.inspector;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipFile;

/** Bounded, read-only index of a portable JADX source bundle. Never extracts entries to disk. */
public final class JadxBundleInspector {
    private JadxBundleInspector() { }
    public static final long MAX_ARCHIVE = 32L * 1024 * 1024;
    public static final int MAX_ENTRIES = 600;
    public static final int MAX_SOURCES = 240;
    public static final int MAX_SOURCE_BYTES = 192 * 1024;
    public static final long MAX_TOTAL_SOURCE_BYTES = 12L * 1024 * 1024;
    public static final int MAX_MANIFEST_BYTES = 32 * 1024;

    public static final class Source {
        public final String path;
        public final long bytes;
        public final long crc;
        public Source(String path, long bytes, long crc) { this.path=path;this.bytes=bytes;this.crc=crc; }
    }
    public static final class Result {
        public final List<Source> sources;
        public final String manifest;
        public final long archiveBytes;
        Result(List<Source> sources,String manifest,long bytes) {
            this.sources=Collections.unmodifiableList(sources);this.manifest=manifest;archiveBytes=bytes;
        }
    }
    public static Result inspect(File archive) throws IOException {
        if (archive==null || !archive.isFile() || archive.length()<30 || archive.length()>MAX_ARCHIVE)
            throw new IOException("Bundle JADX harus berupa ZIP lokal berukuran maksimum 32 MiB");
        ArrayList<Source> sources=new ArrayList<>();
        String manifest=null;
        long total=0;
        Set<String> seen=new HashSet<>();
        try (ZipFile zip=new ZipFile(archive)) {
            Enumeration<? extends ZipEntry> it=zip.entries();
            int count=0;
            while(it.hasMoreElements()) {
                ZipEntry z=it.nextElement();
                if(++count>MAX_ENTRIES)throw new IOException("Terlalu banyak entri ZIP");
                String path=z.getName();
                if (!safePath(path))throw new IOException("Path ZIP tidak aman");
                if (!seen.add(path))throw new IOException("Nama ZIP duplikat");
                if(z.isDirectory())continue;
                if(z.getSize()<0 || z.getCompressedSize()<0)throw new IOException("Ukuran entri ZIP tidak diketahui");
                if(path.equals("bundle.json")) {
                    if(z.getSize()>MAX_MANIFEST_BYTES)throw new IOException("Manifest bundle terlalu besar");
                    manifest=new String(readBounded(zip,z,MAX_MANIFEST_BYTES),StandardCharsets.UTF_8);
                } else if(path.startsWith("sources/") && path.endsWith(".java")) {
                    if(z.getSize()>MAX_SOURCE_BYTES)throw new IOException("Source terlalu besar: "+path);
                    total+=z.getSize();
                    if(total>MAX_TOTAL_SOURCE_BYTES)throw new IOException("Total source melewati batas 12 MiB");
                    if(sources.size()>=MAX_SOURCES)throw new IOException("Jumlah source melampaui 240 file");
                    sources.add(new Source(path,z.getSize(),z.getCrc()));
                } else throw new IOException("Hanya bundle.json dan sources/*.java yang diizinkan");
            }
        }
        if(manifest==null || sources.isEmpty())throw new IOException("Bundle tidak memiliki manifest atau source Java");
        sources.sort((a,b)->a.path.compareTo(b.path));
        return new Result(sources,manifest,archive.length());
    }
    public static String readSource(File archive,String path) throws IOException {
        if(!safePath(path) || !path.startsWith("sources/") || !path.endsWith(".java"))throw new IOException("Path source tidak sah");
        // Index and validate *all* paths before opening the selected entry.
        Result index=inspect(archive);
        Source match=null;
        for(Source s:index.sources)if(s.path.equals(path)){match=s;break;}
        if(match==null)throw new IOException("Source tidak tersedia");
        try(ZipFile zip=new ZipFile(archive)) {
            ZipEntry entry=zip.getEntry(path);
            if(entry==null || entry.getSize()!=match.bytes)throw new IOException("Source berubah");
            byte[] data=readBounded(zip,entry,MAX_SOURCE_BYTES);
            String text=new String(data,StandardCharsets.UTF_8);
            if(text.indexOf('\u0000')>=0)throw new IOException("Source mengandung karakter NUL");
            return text;
        }
    }
    public static boolean safePath(String path) {
        if(path==null || path.length()>384 || path.isEmpty() || path.startsWith("/") || path.indexOf('\\')>=0 || path.indexOf(':')>=0 || path.indexOf('\u0000')>=0)return false;
        String[] parts=path.split("/",-1);
        for(int i=0;i<parts.length;i++) {
            String part=parts[i];
            if(part.equals("..")||part.equals(".")||(part.isEmpty()&&(i!=parts.length-1 || !path.endsWith("/"))))return false;
        }
        return true;
    }
    private static byte[] readBounded(ZipFile zip, ZipEntry entry,int limit) throws IOException {
        try(InputStream stream=zip.getInputStream(entry);ByteArrayOutputStream buffer=new ByteArrayOutputStream()) {
            byte[] chunk=new byte[8192]; int n;
            while((n=stream.read(chunk))!=-1) {
                if(buffer.size()+n>limit)throw new IOException("Batas pembacaan source tercapai");
                buffer.write(chunk,0,n);
            }
            if(entry.getSize()!=buffer.size())throw new IOException("Ukuran ZIP tidak cocok");
            return buffer.toByteArray();
        }
    }
    public static String sha256(String value) {
        try {
            MessageDigest md=MessageDigest.getInstance("SHA-256");
            byte[] bytes=md.digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out=new StringBuilder(64);
            for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&0xff));
            return out.toString();
        }catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
