package id.reverselab.studio.inspector;

import java.io.ByteArrayOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.Inflater;
import java.util.zip.InflaterInputStream;

/** Read-only, bounded metadata decoding. Never invokes or executes APK code. */
public final class PackageDeepInspector {
    private PackageDeepInspector() {}
    private static final int MAX_XML = 4 * 1024 * 1024;
    private static final int MAX_DEX_FULL = 12 * 1024 * 1024;
    private static final int MAX_ARSC_PREFIX = 4096;
    private static final int MAX_ARSC_FULL = 6 * 1024 * 1024;
    private static final int MAX_DEX_FILES = 32;
    private static final Charset CP437 = Charset.forName("IBM437");

    public static final class Report {
        public final Map<String,Object> manifest = new LinkedHashMap<>();
        public final Map<String,Object> resources = new LinkedHashMap<>();
        public final List<Map<String,Object>> dexFiles = new ArrayList<>();
        public final List<String> warnings = new ArrayList<>();
    }
    public static Report inspect(SeekableByteChannel channel, ZipIndexInspector.Result index) {
        Report result = new Report();
        ZipIndexInspector.Entry xml = index.deepTargets.get("AndroidManifest.xml");
        if (xml == null) { result.manifest.put("status","missing"); }
        else {
            try { result.manifest.putAll(parseManifest(readPayload(channel,xml,MAX_XML))); }
            catch (Exception ex) { failed(result.manifest,ex); result.warnings.add("Manifest tidak dapat didekode: " + safeReason(ex)); }
        }
        ZipIndexInspector.Entry arsc = index.deepTargets.get("resources.arsc");
        if (arsc == null) { result.resources.put("status","missing"); }
        else {
            try {
                boolean entire=arsc.uncompressedSize<=MAX_ARSC_FULL;
                result.resources.putAll(parseResourceTable(readPayload(channel,arsc,entire?MAX_ARSC_FULL:MAX_ARSC_PREFIX),entire));
            }
            catch (Exception ex) { failed(result.resources,ex); result.warnings.add("resources.arsc tidak dapat dibaca: " + safeReason(ex)); }
        }
        List<ZipIndexInspector.Entry> dex = new ArrayList<>();
        for (ZipIndexInspector.Entry e : index.deepTargets.values()) if (e.group.equals("dex")) dex.add(e);
        dex.sort(Comparator.comparing(a -> a.name));
        if (index.dexCount > dex.size()) result.warnings.add("Analisis DEX dibatasi pada " + dex.size() + " dari " + index.dexCount + " file; indeks ZIP tetap tersedia.");
        int analyzed=0;
        for (ZipIndexInspector.Entry entry : dex) {
            if (++analyzed>MAX_DEX_FILES || Thread.currentThread().isInterrupted()) break;
            Map<String,Object> data = new LinkedHashMap<>();
            data.put("name",entry.name);
            data.put("uncompressedSize",entry.uncompressedSize);
            try {
                boolean full = entry.uncompressedSize >= 112 && entry.uncompressedSize <= MAX_DEX_FULL;
                byte[] bytes=readPayload(channel,entry,full?MAX_DEX_FULL:120);
                data.putAll(parseDex(bytes,entry.uncompressedSize,full));
            } catch (Exception ex) { failed(data,ex); result.warnings.add("DEX " + entry.name + ": " + safeReason(ex)); }
            result.dexFiles.add(data);
        }
        return result;
    }
    private static void failed(Map<String,Object> map, Exception ex) {
        map.put("status","unsupported");
        map.put("reason",safeReason(ex));
    }
    private static String safeReason(Exception ex) {
        String msg=ex.getMessage();
        return (msg==null?ex.getClass().getSimpleName():msg).replaceAll("[\\r\\n\\t]"," ").substring(0,Math.min(170,(msg==null?ex.getClass().getSimpleName():msg).length()));
    }

    /** Small, random-access bounded entry reader; ZIP stored or raw DEFLATE only. */
    static byte[] readPayload(SeekableByteChannel ch, ZipIndexInspector.Entry entry, int maxBytes) throws IOException {
        if (entry.encrypted || (entry.flags & 1)!=0) throw new IOException("Entri ZIP terenkripsi; pembacaan ditolak");
        if (entry.method!=0 && entry.method!=8) throw new IOException("Metode kompresi tidak didukung: " + entry.method);
        if (entry.localHeaderOffset <0 || entry.localHeaderOffset>ch.size()-30) throw new IOException("Offset header lokal tidak valid");
        byte[] local=read(ch,entry.localHeaderOffset,30);
        if (i32(local,0)!=0x04034b50) throw new IOException("ZIP local header tidak valid");
        int flags=u16(local,6),method=u16(local,8),nameLen=u16(local,26),extraLen=u16(local,28);
        if (method!=entry.method || ((flags^entry.flags)&1)!=0) throw new IOException("Metadata ZIP local/central tidak cocok");
        if (nameLen>1024) throw new IOException("Nama lokal terlalu panjang");
        long dataOffset=entry.localHeaderOffset+30L+nameLen+extraLen;
        if (dataOffset<0 || entry.compressedSize<0 || dataOffset>ch.size() || entry.compressedSize>ch.size()-dataOffset)
            throw new IOException("Rentang data ZIP melewati berkas");
        byte[] localName=read(ch,entry.localHeaderOffset+30,nameLen);
        String decoded=new String(localName,((flags&0x800)!=0)?StandardCharsets.UTF_8:CP437);
        if (!decoded.equals(entry.name)) throw new IOException("Nama entri local dan central berbeda");
        long expected=Math.min(entry.uncompressedSize,(long)maxBytes);
        if (expected<0) throw new IOException("Ukuran entri negatif");
        if (entry.method==0 && entry.uncompressedSize!=entry.compressedSize) throw new IOException("Ukuran STORED ZIP tidak cocok");
        if (entry.uncompressedSize>maxBytes && maxBytes==MAX_XML) throw new IOException("Manifest melampaui batas decoding 4 MiB");
        // Reading a prefix is sufficient for DEX header or ARSC header. Never inflate more than limit.
        try (InputStream bounded = new ChannelSliceInputStream(ch,dataOffset,entry.compressedSize)) {
            InputStream decodedStream=entry.method==8?new InflaterInputStream(bounded,new Inflater(true),8192):bounded;
            try (InputStream in=decodedStream; ByteArrayOutputStream out=new ByteArrayOutputStream((int)Math.min(expected,65536))) {
                byte[] block=new byte[8192];
                while (out.size()<expected) {
                    if (Thread.currentThread().isInterrupted()) throw new IOException("Pemeriksaan dibatalkan");
                    int n=in.read(block,0,(int)Math.min(block.length,expected-out.size()));
                    if (n<0) throw new EOFException("Konten ZIP terpotong ketika dibaca");
                    out.write(block,0,n);
                }
                return out.toByteArray();
            }
        }
    }
    private static final class ChannelSliceInputStream extends InputStream {
        private final SeekableByteChannel channel;
        private long position,left;
        ChannelSliceInputStream(SeekableByteChannel ch,long offset,long length) { channel=ch;position=offset;left=length; }
        @Override public int read() throws IOException { byte[] b=new byte[1];return read(b,0,1)<0?-1:(b[0]&0xff); }
        @Override public int read(byte[] b,int off,int len) throws IOException {
            if (left==0)return -1;
            if (len==0)return 0;
            if (Thread.currentThread().isInterrupted()) throw new IOException("Pemeriksaan dibatalkan");
            ByteBuffer buffer=ByteBuffer.wrap(b,off,(int)Math.min(len,left));
            channel.position(position);
            int count=channel.read(buffer);
            if (count<=0) throw new EOFException("Gagal membaca bagian ZIP");
            position+=count;left-=count;return count;
        }
    }
    private static byte[] read(SeekableByteChannel ch,long at,int len) throws IOException {
        if (at<0||len<0||at>ch.size()-len) throw new EOFException("Baca di luar rentang berkas");
        ByteBuffer b=ByteBuffer.allocate(len);
        ch.position(at);
        while(b.hasRemaining()) {int n=ch.read(b);if(n<=0)throw new EOFException("Berkas tidak lengkap");}
        return b.array();
    }
    private static int u16(byte[] b,int o) {return (b[o]&255)|((b[o+1]&255)<<8);}
    private static long u32(byte[] b,int o) {return Integer.toUnsignedLong(i32(b,o));}
    private static int i32(byte[] b,int o) {return (b[o]&255)|((b[o+1]&255)<<8)|((b[o+2]&255)<<16)|(b[o+3]<<24);}
    private static boolean bounds(byte[] b,long at,long size) {return at>=0 && size>=0 && at<=b.length && size<=b.length-at;}
    private static void require(boolean condition,String why) throws IOException { if(!condition)throw new IOException(why); }
    private static int uintAsInt(long value,String why) throws IOException {require(value<=Integer.MAX_VALUE,why);return (int)value;}

    private static Map<String,Object> parseManifest(byte[] bytes) throws IOException {
        Map<String,Object> result=new LinkedHashMap<>();
        if(bytes.length>=5 && bytes[0]=='<' && bytes[1]=='?') {
            result.put("status","text_xml");result.put("note","XML teks; parser biner tidak diterapkan untuk format ini");return result;
        }
        require(bytes.length>=8 && u16(bytes,0)==0x0003,"Bukan Android binary XML");
        int headerSize=u16(bytes,2);
        long claimed=u32(bytes,4);
        require(headerSize>=8 && claimed<=bytes.length && claimed>=headerSize,"Ukuran binary XML tidak valid");
        int fileEnd=(int)claimed;
        List<String> strings=Collections.emptyList();
        List<String> permissions=new ArrayList<>();
        Map<String,Integer> components=new LinkedHashMap<>();
        List<String> componentExamples=new ArrayList<>();
        String pkg=null,versionCode=null,versionName=null,minSdk=null,targetSdk=null,appLabel=null;
        int chunkPos=headerSize, scanned=0;
        while(chunkPos<fileEnd) {
            require(++scanned<=16384,"Terlalu banyak chunk XML");
            require(bounds(bytes,chunkPos,8),"Chunk XML terpotong");
            int type=u16(bytes,chunkPos),hdr=u16(bytes,chunkPos+2);
            long len=u32(bytes,chunkPos+4);
            require(hdr>=8 && len>=hdr && len<=fileEnd-chunkPos,"Ukuran chunk XML tidak valid");
            int chunkEnd=chunkPos+(int)len;
            if(type==0x0001) strings=parseStringPool(bytes,chunkPos,chunkEnd);
            else if(type==0x0102) {
                require(hdr>=16 && chunkPos+36<=chunkEnd,"Tag XML tidak lengkap");
                int ext=chunkPos+16;
                String tag=lookup(strings,u32(bytes,ext+4));
                int attrStart=u16(bytes,ext+8),attrSize=u16(bytes,ext+10),count=u16(bytes,ext+12);
                require(attrSize>=20 && count<=512,"Atribut XML tidak valid");
                long start=(long)ext+attrStart;
                require(start>=ext+20 && start+(long)attrSize*count<=chunkEnd,"Atribut melewati batas XML");
                Map<String,String> attrs=new LinkedHashMap<>();
                for(int j=0;j<count;j++) {
                    int p=(int)(start+(long)j*attrSize);
                    String name=lookup(strings,u32(bytes,p+4));
                    long raw=u32(bytes,p+8);
                    int valType=bytes[p+15]&255;
                    long val=u32(bytes,p+16);
                    String value=raw==0xffffffffL?typedValue(valType,val,strings):lookup(strings,raw);
                    if(name!=null && value!=null) attrs.put(name,value);
                }
                if("manifest".equals(tag)) {pkg=attrs.get("package");versionCode=attrs.get("versionCode");versionName=attrs.get("versionName");}
                else if("uses-sdk".equals(tag)) { minSdk=attrs.get("minSdkVersion");targetSdk=attrs.get("targetSdkVersion"); }
                else if("uses-permission".equals(tag)||"uses-permission-sdk-23".equals(tag)) {
                    String value=attrs.get("name");if(value!=null && permissions.size()<500)permissions.add(value);
                } else if("application".equals(tag)) appLabel=attrs.get("label");
                if(tag!=null && (tag.equals("activity")||tag.equals("activity-alias")||tag.equals("service")||tag.equals("receiver")||tag.equals("provider"))) {
                    components.put(tag,components.getOrDefault(tag,0)+1);
                    String componentName=attrs.get("name");
                    if(componentName!=null&&componentExamples.size()<30)componentExamples.add(tag+": "+componentName);
                }
            }
            chunkPos=chunkEnd;
        }
        require(!strings.isEmpty(),"Tidak ada string pool Manifest");
        result.put("status","ok");
        result.put("format","Android binary XML");
        putIf(result,"packageName",pkg);putIf(result,"versionCode",versionCode);putIf(result,"versionName",versionName);
        putIf(result,"minSdk",minSdk);putIf(result,"targetSdk",targetSdk);putIf(result,"applicationLabel",appLabel);
        result.put("permissions",permissions);result.put("components",components);result.put("componentExamples",componentExamples);
        result.put("permissionCount",permissions.size());
        return result;
    }
    private static void putIf(Map<String,Object> map,String k,String val) {if(val!=null)map.put(k,val);}
    private static String typedValue(int type,long value,List<String> strings) {
        if(type==0x03)return lookup(strings,value);
        if(type==0x10)return Long.toString(value>=0x80000000L?value-0x100000000L:value);
        if(type==0x11)return String.format("0x%08x",value);
        if(type==0x12)return value==0?"false":"true";
        if(type==0x01||type==0x02)return String.format("@0x%08x",value);
        return "0x"+Long.toHexString(value);
    }
    private static String lookup(List<String> strings,long idx) {return idx>=0&&idx<strings.size()?strings.get((int)idx):null;}
    private static List<String> parseStringPool(byte[] b,int start,int end) throws IOException {
        require(start+28<=end,"String pool terlalu pendek");
        int header=u16(b,start+2);
        int count=uintAsInt(u32(b,start+8),"Terlalu banyak string");
        int styles=uintAsInt(u32(b,start+12),"Terlalu banyak style");
        long flags=u32(b,start+16),strStart=u32(b,start+20);
        require(header>=28 && count<=100000 && styles<=100000,"String pool invalid");
        require((long)start+header+(long)count*4<=end,"Offset string di luar chunk");
        require((long)start+strStart<=end,"Data string di luar chunk");
        boolean utf8=(flags&0x100)!=0;
        List<String> list=new ArrayList<>(count);
        for(int i=0;i<count;i++) {
            long offset=u32(b,start+header+i*4);
            long pos=(long)start+strStart+offset;
            require(pos<end,"Offset string invalid");
            int p=(int)pos;
            if(utf8) {
                int[] skip=utf8Len(b,p,end);p=skip[1];
                int[] chars=utf8Len(b,p,end);p=chars[1];
                require(chars[0]<=65535 && p+(long)chars[0]<end,"Panjang string UTF8 invalid");
                list.add(new String(b,p,chars[0],StandardCharsets.UTF_8));
            } else {
                int[] chars=utf16Len(b,p,end);p=chars[1];
                require(chars[0]<=65535 && p+(long)chars[0]*2+1<end,"Panjang string UTF16 invalid");
                list.add(new String(b,p,chars[0]*2,StandardCharsets.UTF_16LE));
            }
        }
        return list;
    }
    private static int[] utf8Len(byte[] b,int pos,int end) throws IOException {
        require(pos<end,"Panjang UTF8 terpotong");int x=b[pos++]&255;
        if((x&0x80)!=0){require(pos<end,"Panjang UTF8 terpotong");x=((x&0x7f)<<8)|(b[pos++]&255);}
        return new int[]{x,pos};
    }
    private static int[] utf16Len(byte[] b,int pos,int end) throws IOException {
        require(pos+1<end,"Panjang UTF16 terpotong");int x=u16(b,pos);pos+=2;
        if((x&0x8000)!=0){require(pos+1<end,"Panjang UTF16 terpotong");x=((x&0x7fff)<<16)|u16(b,pos);pos+=2;}
        return new int[]{x,pos};
    }
    private static Map<String,Object> parseResourceHeader(byte[] bytes) throws IOException {
        require(bytes.length>=12,"Header resources.arsc terlalu pendek");
        require(u16(bytes,0)==0x0002 && u16(bytes,2)>=12,"Bukan ARSC resource table");
        long declared=u32(bytes,4), packages=u32(bytes,8);
        require(declared>=12 && packages<=4096,"Header ARSC invalid");
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("status","ok");result.put("type","resources.arsc");
        result.put("declaredSize",declared);result.put("packageCount",packages);
        result.put("scope","Header tabel resource saja; decoding entri resource belum tersedia");
        return result;
    }
    /** Resource table: limited package names and string pool samples; never claims complete ID/value decoding. */
    private static Map<String,Object> parseResourceTable(byte[] bytes,boolean entire) throws IOException {
        Map<String,Object> result=parseResourceHeader(bytes);
        long declared=u32(bytes,4);
        result.put("inspectionDepth",entire?"bounded package/string-pool preview":"header only (size limit)");
        if(!entire||declared>bytes.length||declared<12)return result;
        int end=(int)declared,pos=u16(bytes,2),scanned=0;
        List<Map<String,Object>> packages=new ArrayList<>();
        while(pos<=end-8 && ++scanned<=2048) {
            int type=u16(bytes,pos),hdr=u16(bytes,pos+2);
            long size=u32(bytes,pos+4);
            require(hdr>=8&&size>=hdr&&size<=end-pos,"Resource chunk invalid");
            if(type==0x0200 && hdr>=284 && packages.size()<20){
                Map<String,Object> pkg=new LinkedHashMap<>();
                pkg.put("id",u32(bytes,pos+8));
                StringBuilder name=new StringBuilder();
                for(int k=0;k<128;k++){int c=u16(bytes,pos+12+k*2);if(c==0)break;name.append((char)c);}
                pkg.put("name",name.toString());
                long typeOffset=u32(bytes,pos+268),keyOffset=u32(bytes,pos+276);
                pkg.put("types",poolPreview(bytes,pos,size,typeOffset,16));
                pkg.put("keys",poolPreview(bytes,pos,size,keyOffset,20));
                packages.add(pkg);
            }
            pos+=(int)size;
        }
        result.put("packagesPreview",packages);
        result.put("scope","Sample nama paket dan string tipe/key; tidak mengurai semua resource ID, konfigurasi, nilai, atau referensi");
        return result;
    }
    private static Map<String,Object> poolPreview(byte[] b,int base,long packageSize,long relative,int limit) throws IOException {
        Map<String,Object> out=new LinkedHashMap<>();
        if(relative==0){out.put("count",0);out.put("examples",Collections.emptyList());return out;}
        long start=base+relative;
        require(relative<packageSize&&start<=b.length-28,"Offset string pool paket invalid");
        int st=(int)start;
        require(u16(b,st)==0x0001,"Target bukan string pool");
        int header=u16(b,st+2),count=uintAsInt(u32(b,st+8),"String pool count invalid");
        long chunk=u32(b,st+4),strData=u32(b,st+20),flags=u32(b,st+16);
        require(header>=28&&count<=1000000&&chunk>=header&&chunk<=packageSize-relative&&start+chunk<=b.length,"String pool paket terpotong");
        int end=(int)(start+chunk);boolean utf8=(flags&0x100)!=0;
        List<String> example=new ArrayList<>();
        for(int i=0;i<Math.min(count,limit);i++) {
            require((long)st+header+(long)(i+1)*4<=end,"Offset string pool tidak lengkap");
            long offset=u32(b,st+header+i*4),at=start+strData+offset;
            require(at<end&&at>=start,"Offset string invalid");
            int p=(int)at,chars;
            if(utf8){int[] n=utf8Len(b,p,end);p=n[1];n=utf8Len(b,p,end);chars=n[0];p=n[1];require(chars<=1024&&p+(long)chars<end,"String UTF8 invalid");example.add(new String(b,p,chars,StandardCharsets.UTF_8));}
            else {int[] n=utf16Len(b,p,end);chars=n[0];p=n[1];require(chars<=1024&&p+(long)chars*2+1<end,"String UTF16 invalid");example.add(new String(b,p,chars*2,StandardCharsets.UTF_16LE));}
        }
        out.put("count",count);out.put("examples",example);out.put("sampleOnly",count>example.size());return out;
    }
    private static Map<String,Object> parseDex(byte[] bytes,long actualSize,boolean full) throws IOException {
        require(bytes.length>=112 && bytes[0]=='d' && bytes[1]=='e' && bytes[2]=='x' && bytes[3]=='\n' && bytes[7]==0,"Magic DEX tidak valid");
        String version=new String(bytes,4,3,StandardCharsets.US_ASCII);
        require(version.matches("\\d{3}"),"Versi DEX tidak valid");
        int headerSize=uintAsInt(u32(bytes,36),"Ukuran header DEX invalid");
        require(headerSize>=112 && headerSize<=120,"Ukuran header DEX tidak didukung");
        long dexFileSize=u32(bytes,32);
        require(dexFileSize>=headerSize && dexFileSize<=actualSize,"Ukuran DEX di luar entri ZIP");
        require(u32(bytes,40)==0x12345678L,"DEX endianness tidak didukung");
        int strings=uintAsInt(u32(bytes,56),"String count DEX invalid");
        int types=uintAsInt(u32(bytes,64),"Types count DEX invalid");
        int fields=uintAsInt(u32(bytes,80),"Fields count DEX invalid");
        int methods=uintAsInt(u32(bytes,88),"Methods count DEX invalid");
        int classes=uintAsInt(u32(bytes,96),"Classes count DEX invalid");
        Map<String,Object> result=new LinkedHashMap<>();
        result.put("status","ok");result.put("version",version);result.put("declaredSize",dexFileSize);
        result.put("stringIds",strings);result.put("typeIds",types);result.put("fieldIds",fields);
        result.put("methodIds",methods);result.put("classDefs",classes);
        result.put("methodCountNote","method_ids mencakup referensi, bukan hanya implementasi metode");
        result.put("checksumStatus","belum diverifikasi");
        if(full && bytes.length>=dexFileSize) {
            long stringsOff=u32(bytes,60),typesOff=u32(bytes,68),classOff=u32(bytes,100);
            require(bounds(bytes,stringsOff,(long)strings*4)&&bounds(bytes,typesOff,(long)types*4)
                    && bounds(bytes,classOff,(long)classes*32),"Tabel DEX berada di luar berkas");
            List<String> names=new ArrayList<>();
            for(int i=0;i<classes && names.size()<80;i++) {
                long classIdx=u32(bytes,(int)classOff+i*32);
                if(classIdx>=types) continue;
                long stringIdx=u32(bytes,(int)typesOff+(int)classIdx*4);
                if(stringIdx>=strings) continue;
                long off=u32(bytes,(int)stringsOff+(int)stringIdx*4);
                if(!bounds(bytes,off,1)) continue;
                int pos=(int)off;
                int shifts=0;
                do {
                    if(pos>=bytes.length || ++shifts>5) {pos=-1;break;}
                } while((bytes[pos++]&0x80)!=0);
                if(pos<0) continue;
                int end=pos;
                while(end<bytes.length && end-pos<500 && bytes[end]!=0) end++;
                if(end>=bytes.length||end-pos>=500) continue;
                names.add(new String(bytes,pos,end-pos,StandardCharsets.UTF_8));
            }
            result.put("classExamples",names);
            result.put("classExamplesTruncated",classes>names.size());
            result.put("inspectionDepth","header + bounded class descriptors");
        } else result.put("inspectionDepth","header saja (DEX melebihi batas sampel 12 MiB)");
        return result;
    }
}
