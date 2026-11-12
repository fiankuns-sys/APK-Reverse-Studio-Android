package id.reverselab.studio.inspector;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.zip.*;

/** Read-only import of an explicitly curated Apktool review bundle, NOT the full decoded directory. */
public final class ApktoolBundleInspector {
    private ApktoolBundleInspector() {}
    public static final long MAX_ARCHIVE=48L*1024*1024;
    public static final int MAX_ENTRIES=420, MAX_FILES=320, MAX_PER_FILE=384*1024;
    public static final long MAX_TOTAL=18L*1024*1024;
    public static final int MAX_MANIFEST=128*1024;
    public static final class Entry {
        public final String path; public final long bytes;
        Entry(String p,long n){path=p;bytes=n;}
    }
    public static final class Result {
        public final String manifest;
        public final List<Entry> files;
        Result(String m,List<Entry> f){manifest=m;files=Collections.unmodifiableList(f);}
    }
    public static boolean allowed(String path){
        if(!JadxBundleInspector.safePath(path)||!path.startsWith("tree/"))return false;
        String sub=path.substring(5);
        if(sub.equals("AndroidManifest.xml"))return true;
        if(sub.matches("smali(?:_classes[0-9]+)?/[a-zA-Z0-9_/$-]+\\.smali"))return true;
        return sub.matches("res/(?:values(?:-[A-Za-z0-9_]+)?|xml(?:-[A-Za-z0-9_]+)?)/[a-zA-Z0-9_.-]+\\.xml");
    }
    public static Result inspect(File file) throws IOException{
        if(file==null||!file.isFile()||file.length()<30||file.length()>MAX_ARCHIVE)throw new IOException("Bundle Apktool harus ZIP 48 MiB atau kurang");
        List<Entry> files=new ArrayList<>();Set<String> unique=new HashSet<>();String meta=null;
        long total=0;int count=0;
        try(ZipFile zip=new ZipFile(file)){
            Enumeration<? extends ZipEntry> en=zip.entries();
            while(en.hasMoreElements()){
                ZipEntry ze=en.nextElement();String path=ze.getName();
                if(++count>MAX_ENTRIES||!JadxBundleInspector.safePath(path)||!unique.add(path))throw new IOException("Entri ZIP terlalu banyak, duplikat, atau path berbahaya");
                if(ze.isDirectory())continue;
                if(ze.getSize()<0||ze.getCompressedSize()<0)throw new IOException("Ukuran berkas tidak diketahui");
                if(ze.getSize()>0 && ze.getCompressedSize()==0)throw new IOException("Entri ZIP memiliki kompresi mencurigakan");
                if(ze.getCompressedSize()>0 && ze.getSize()>ze.getCompressedSize()*200L)throw new IOException("Rasio kompresi tidak wajar");
                if("bundle.json".equals(path)){
                    if(ze.getSize()>MAX_MANIFEST)throw new IOException("Manifest terlalu besar");
                    meta=new String(read(zip,ze,MAX_MANIFEST),StandardCharsets.UTF_8);
                } else if(allowed(path)){
                    if(ze.getSize()>MAX_PER_FILE)throw new IOException("Satu source melewati 384 KiB");
                    total+=ze.getSize();if(total>MAX_TOTAL||files.size()>=MAX_FILES)throw new IOException("Batas source review terlewati");
                    files.add(new Entry(path,ze.getSize()));
                }else throw new IOException("Jenis berkas dalam bundle tidak diizinkan: "+path);
            }
        }
        if(meta==null||files.isEmpty())throw new IOException("Bundle tidak berisi manifest dan source");
        files.sort(Comparator.comparing(e->e.path));return new Result(meta,files);
    }
    public static String readFile(File file,String path) throws IOException{
        if(!allowed(path))throw new IOException("Path tidak diizinkan");
        Result idx=inspect(file);
        boolean exists=false;for(Entry e:idx.files)if(e.path.equals(path))exists=true;
        if(!exists)throw new IOException("Source tidak tersedia");
        try(ZipFile zip=new ZipFile(file)){
            ZipEntry ze=zip.getEntry(path);
            byte[] b=read(zip,ze,MAX_PER_FILE);
            String s=new String(b,StandardCharsets.UTF_8);
            if(s.indexOf('\0')>=0)throw new IOException("NUL pada teks");
            if(!Arrays.equals(s.getBytes(StandardCharsets.UTF_8),b))throw new IOException("Teks bukan UTF-8 valid");
            return s;
        }
    }
    private static byte[] read(ZipFile zip,ZipEntry ze,int max) throws IOException{
        try(InputStream in=zip.getInputStream(ze);ByteArrayOutputStream b=new ByteArrayOutputStream()){
            byte[] buf=new byte[8192];int n;
            while((n=in.read(buf))!=-1){if(b.size()+n>max)throw new IOException("Pembacaan melampaui batas");b.write(buf,0,n);}
            if(b.size()!=ze.getSize())throw new IOException("Ukuran tidak cocok");return b.toByteArray();
        }
    }
    public static String sha256(String s){return JadxBundleInspector.sha256(s);}
}
