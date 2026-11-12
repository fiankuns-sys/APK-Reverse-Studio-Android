package id.reverselab.studio.inspector;

import java.io.IOException;
import java.nio.channels.SeekableByteChannel;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Read-only index of definitions in DEX; not a decompiler and never runs target code. */
public final class DexSymbolInspector {
    private DexSymbolInspector() {}
    private static final int MAX_BYTES = 8 * 1024 * 1024;
    private static final int MAX_FILES = 4;
    private static final int MAX_CLASSES = 140;
    private static final int MAX_METHODS = 300;
    private static final int MAX_CLASS_SCAN = 5000;
    private static final int MAX_METHOD_SCAN = 100000;

    public static Map<String,Object> inspect(SeekableByteChannel channel, ZipIndexInspector.Result index) {
        Map<String,Object> out=new LinkedHashMap<>();
        out.put("scope","DEX definitions and signatures only; not Java/Kotlin source or Smali disassembly");
        List<Map<String,Object>> files=new ArrayList<>();
        List<Map<String,Object>> classes=new ArrayList<>();
        List<Map<String,Object>> methods=new ArrayList<>();
        out.put("files",files);out.put("classes",classes);out.put("methods",methods);
        int processed=0, total=0;
        for(ZipIndexInspector.Entry entry:index.deepTargets.values()) {
            if(!entry.group.equals("dex"))continue;
            total++;
            Map<String,Object> f=new LinkedHashMap<>();
            f.put("name",entry.name); f.put("bytes",entry.uncompressedSize);
            files.add(f);
            if(processed>=MAX_FILES) {f.put("status","limit_files");continue;}
            processed++;
            if(entry.uncompressedSize<112 || entry.uncompressedSize>MAX_BYTES) {f.put("status","limit_size");continue;}
            if(Thread.currentThread().isInterrupted()){f.put("status","cancelled");break;}
            try {
                byte[] data=PackageDeepInspector.readPayload(channel,entry,MAX_BYTES);
                DexReader dex=new DexReader(data);
                int[] counts=dex.index(entry.name,classes,methods);
                f.put("status","indexed");
                f.put("classDefs",dex.classCount);
                f.put("methodIds",dex.methodCount);
                f.put("scannedClassDefs",counts[0]);
                f.put("scannedDeclaredMethods",counts[1]);
                f.put("truncated",counts[0]<dex.classCount || counts[1]>=MAX_METHOD_SCAN);
            } catch(Exception e) {
                f.put("status","unsupported");
                String message=e.getMessage()==null?e.getClass().getSimpleName():e.getMessage();
                f.put("reason",message.substring(0,Math.min(message.length(),160)).replaceAll("[\\r\\n\\t]"," "));
            }
        }
        out.put("indexedFiles",processed);
        out.put("fileLimit",MAX_FILES);
        out.put("classPreviewLimit",MAX_CLASSES);
        out.put("methodPreviewLimit",MAX_METHODS);
        out.put("truncated",index.dexCount>total || files.stream().anyMatch(f->!"indexed".equals(f.get("status"))) ||
            files.stream().anyMatch(f->Boolean.TRUE.equals(f.get("truncated"))) || classes.size()>=MAX_CLASSES || methods.size()>=MAX_METHODS);
        out.put("status",classes.isEmpty() && methods.isEmpty()?"no_preview":"indexed");
        return out;
    }

    private static final class DexReader {
        final byte[] data;
        final int stringCount,stringOff,typeCount,typeOff,protoCount,protoOff,methodCount,methodOff,classCount,classOff;
        DexReader(byte[] input) throws IOException {
            data=input;
            require(data.length>=112,"Header DEX terpotong");
            require(data[0]=='d'&&data[1]=='e'&&data[2]=='x'&&data[3]=='\n'&&data[7]==0,"Magic DEX salah");
            require(u32(40)==0x12345678L,"Endian DEX tidak didukung");
            long length=u32(32);
            require(length>=112&&length<=data.length,"Ukuran DEX tidak valid");
            require(u32(36)>=112 && u32(36)<=120,"Header DEX tidak didukung");
            stringCount=count(56,60,4);
            stringOff=(int)u32(60);
            typeCount=count(64,68,4);
            typeOff=(int)u32(68);
            protoCount=count(72,76,12);
            protoOff=(int)u32(76);
            methodCount=count(88,92,8);
            methodOff=(int)u32(92);
            classCount=count(96,100,32);
            classOff=(int)u32(100);
        }
        void require(boolean ok,String reason) throws IOException {if(!ok)throw new IOException(reason);}
        void bounds(long offset,long length) throws IOException {require(offset>=0&&length>=0&&offset<=data.length&&length<=data.length-offset,"Offset DEX di luar berkas");}
        long u32(int p) throws IOException {bounds(p,4);return Integer.toUnsignedLong((data[p]&255)|((data[p+1]&255)<<8)|((data[p+2]&255)<<16)|(data[p+3]<<24));}
        int u16(int p) throws IOException {bounds(p,2);return (data[p]&255)|((data[p+1]&255)<<8);}
        int count(int at,int offAt,int stride) throws IOException {
            long n=u32(at),start=u32(offAt);
            require(n<=1_000_000,"Jumlah item DEX terlalu besar");
            if(n!=0)bounds(start,n*stride);
            return (int)n;
        }
        int[] uleb(int start) throws IOException {
            int value=0, pos=start;
            for(int i=0;i<5;i++) {
                bounds(pos,1);int b=data[pos++]&255;
                if(i==4 && (b&0xF0)!=0)throw new IOException("ULEB128 overflow");
                value|=(b&127)<<(i*7);
                if((b&128)==0) {require(value>=0,"ULEB128 negatif");return new int[]{value,pos};}
            }
            throw new IOException("ULEB128 terlalu panjang");
        }
        String str(int idx) throws IOException {
            require(idx>=0&&idx<stringCount,"Indeks string DEX rusak");
            long off=u32(stringOff+idx*4);
            require(off<Integer.MAX_VALUE,"String DEX di luar batas");
            int[] len=uleb((int)off);int pos=len[1];
            int end=pos;
            while(end<data.length && end-pos<=600 && data[end]!=0)end++;
            require(end<data.length&&end-pos<=600,"String DEX terlalu panjang/rusak");
            return new String(data,pos,end-pos,StandardCharsets.UTF_8);
        }
        String type(int index) throws IOException {
            require(index>=0&&index<typeCount,"Indeks tipe DEX tidak valid");
            long s=u32(typeOff+index*4);
            require(s<stringCount,"Referensi tipe DEX tidak valid");
            return str((int)s);
        }
        String method(int index) throws IOException {
            require(index>=0&&index<methodCount,"Index method DEX tidak valid");
            int pos=methodOff+index*8;
            int owner=u16(pos),proto=u16(pos+2);
            long nameIdx=u32(pos+4);
            require(proto<protoCount&&nameIdx<stringCount,"Referensi nama/proto metode tidak valid");
            int p=protoOff+proto*12;
            long returnIdx=u32(p+4);
            String returnType=type((int)returnIdx);
            long paramsOff=u32(p+8);
            StringBuilder signature=new StringBuilder();
            signature.append(type(owner)).append("->").append(str((int)nameIdx)).append('(');
            if(paramsOff!=0) {
                require(paramsOff<Integer.MAX_VALUE,"Params di luar DEX");
                long size=u32((int)paramsOff);
                require(size<=32,"Daftar parameter melebihi batas pratinjau");
                bounds(paramsOff+4,size*2);
                for(int i=0;i<size;i++)signature.append(type(u16((int)paramsOff+4+i*2)));
            }
            signature.append(')').append(returnType);
            return signature.toString();
        }
        int[] index(String file,List<Map<String,Object>> classes,List<Map<String,Object>> methods) throws IOException {
            int scanned=0, declared=0;
            for(int i=0;i<classCount && i<MAX_CLASS_SCAN;i++) {
                if(Thread.currentThread().isInterrupted())throw new IOException("Pembacaan simbol dibatalkan");
                int at=classOff+i*32;
                long classIdx=u32(at),classData=u32(at+24),accessFlags=u32(at+4);
                require(classIdx<typeCount,"Class index DEX tidak valid");
                String name=type((int)classIdx);
                Map<String,Object> classInfo=null;
                if(classes.size()<MAX_CLASSES) {
                    classInfo=new LinkedHashMap<>();
                    classInfo.put("dex",file);
                    classInfo.put("name",name);
                    classInfo.put("accessFlags",accessFlags);
                    classInfo.put("methodCount",0);
                    classes.add(classInfo);
                }
                scanned++;
                if(classData==0)continue;
                require(classData<Integer.MAX_VALUE,"class_data offset DEX di luar batas");
                int pos=(int)classData;
                int[] x=uleb(pos);int staticFields=x[0];pos=x[1];
                x=uleb(pos);int instanceFields=x[0];pos=x[1];
                x=uleb(pos);int directMethods=x[0];pos=x[1];
                x=uleb(pos);int virtualMethods=x[0];pos=x[1];
                require((long)staticFields+instanceFields+directMethods+virtualMethods<MAX_METHOD_SCAN,"class_data melebihi batas pemindaian");
                for(int j=0;j<staticFields+instanceFields;j++) {
                    x=uleb(pos);pos=x[1];x=uleb(pos);pos=x[1];
                }
                int classMethods=0;
                for(int list=0;list<2;list++) {
                    int count=list==0?directMethods:virtualMethods;
                    int idx=0;
                    for(int j=0;j<count;j++) {
                        x=uleb(pos);pos=x[1];idx+=x[0];
                        x=uleb(pos);pos=x[1];int flags=x[0];
                        x=uleb(pos);pos=x[1];int codeOffset=x[0];
                        require(idx>=0&&idx<methodCount,"method_idx dalam class_data invalid");
                        declared++;classMethods++;
                        if(methods.size()<MAX_METHODS) {
                            Map<String,Object> m=new LinkedHashMap<>();
                            m.put("dex",file);m.put("owner",name);
                            m.put("signature",method(idx));
                            m.put("accessFlags",flags);m.put("hasCode",codeOffset!=0);
                            methods.add(m);
                        }
                        if(declared>=MAX_METHOD_SCAN)break;
                    }
                    if(declared>=MAX_METHOD_SCAN)break;
                }
                if(classInfo!=null) classInfo.put("methodCount",classMethods);
                if(declared>=MAX_METHOD_SCAN)break;
            }
            return new int[]{scanned,declared};
        }
    }
}
