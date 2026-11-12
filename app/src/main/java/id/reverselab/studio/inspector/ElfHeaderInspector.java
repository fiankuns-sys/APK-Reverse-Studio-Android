package id.reverselab.studio.inspector;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.channels.SeekableByteChannel;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Inspect native shared-object headers only; no execution and no disassembly. */
public final class ElfHeaderInspector {
    private ElfHeaderInspector() {}
    private static final int MAX_LIBRARY_SAMPLES=32;
    private static int u16(ByteBuffer b,int offset){return Short.toUnsignedInt(b.getShort(offset));}
    private static long u32(ByteBuffer b,int offset){return Integer.toUnsignedLong(b.getInt(offset));}
    private static String cpu(int machine) {
        switch(machine){case 183:return "AArch64 (ARM64)";case 40:return "ARM (32-bit)";case 62:return "x86_64";case 3:return "x86 (32-bit)";case 243:return "RISC-V";case 8:return "MIPS";default:return "unknown ("+machine+")";}
    }
    public static Map<String,Object> parse(byte[] bytes,String name) throws IOException {
        if(bytes.length<20 || bytes[0]!=0x7f || bytes[1]!='E' || bytes[2]!='L' || bytes[3]!='F')throw new IOException("Bukan ELF header");
        int cls=bytes[4]&255,order=bytes[5]&255;
        if((cls!=1&&cls!=2)||(order!=1&&order!=2))throw new IOException("ELF class/endianness invalid");
        int min=cls==1?52:64;
        if(bytes.length<min)throw new IOException("ELF header terpotong");
        ByteBuffer bb=ByteBuffer.wrap(bytes).order(order==1?ByteOrder.LITTLE_ENDIAN:ByteOrder.BIG_ENDIAN);
        int machine=u16(bb,18);
        Map<String,Object> data=new LinkedHashMap<>();
        data.put("name",name);data.put("status","ok");data.put("format","ELF"+(cls==1?"32":"64"));
        data.put("endianness",order==1?"little":"big");data.put("machine",machine);data.put("cpu",cpu(machine));
        data.put("elfType",u16(bb,16));data.put("osAbi",bytes[7]&255);
        data.put("programHeaderCount",u16(bb,cls==1?44:56));
        data.put("sectionHeaderCount",u16(bb,cls==1?48:60));
        data.put("scope","ELF header saja; tidak membuktikan bahasa asal, kompatibilitas runtime, atau keamanan kode");
        return data;
    }
    public static List<Map<String,Object>> inspect(SeekableByteChannel channel, ZipIndexInspector.Result idx) {
        List<Map<String,Object>> out=new ArrayList<>();
        for(ZipIndexInspector.Entry e:idx.entries) {
            if(out.size()>=MAX_LIBRARY_SAMPLES||Thread.currentThread().isInterrupted())break;
            if(!e.name.endsWith(".so") || !(e.name.startsWith("lib/")||e.name.startsWith("jni/")))continue;
            Map<String,Object> item=new LinkedHashMap<>();item.put("name",e.name);
            try{item.putAll(parse(PackageDeepInspector.readPayload(channel,e,64),e.name));}
            catch(Exception ex){item.put("status","unsupported");String m=ex.getMessage();item.put("reason",m==null?"Gagal membaca ELF":m.substring(0,Math.min(150,m.length())));}
            out.add(item);
        }
        return out;
    }
}
