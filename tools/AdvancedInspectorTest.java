import id.reverselab.studio.inspector.*;
import java.nio.file.*;
import java.nio.channels.SeekableByteChannel;
import java.util.*;
public class AdvancedInspectorTest {
    static void check(boolean c,String msg){if(!c)throw new AssertionError(msg);}
    @SuppressWarnings("unchecked")
    static void inspect(String filename,boolean signed,boolean corrupt) throws Exception {
        try(SeekableByteChannel channel=Files.newByteChannel(Path.of("tools/fixtures/"+filename),StandardOpenOption.READ)){
            ZipIndexInspector.Result idx=ZipIndexInspector.inspect(channel);
            Map<String,Object> sign=SignatureBlockInspector.inspect(channel,idx);
            check(sign.get("signingBlock").equals(signed?"present":"absent"),"signature block: "+filename+" "+sign);
            check("NOT_VERIFIED".equals(sign.get("verification")),"Do not claim verified");
            if(signed){check(Boolean.TRUE.equals(sign.get("v2Present")),"v2 id missing");check(Boolean.TRUE.equals(sign.get("v3Present")),"v3 id missing");check(Boolean.TRUE.equals(sign.get("v31Present")),"v3.1 missing");}
            List<Map<String,Object>> libs=ElfHeaderInspector.inspect(channel,idx);
            check(libs.size()==1,"ELF sample count");
            check("AArch64 (ARM64)".equals(libs.get(0).get("cpu")),"ELF CPU");
            Map<String,Object> crc=IntegritySampler.inspect(channel,idx);
            if(corrupt)check((Integer)crc.get("failures")>0,"CRC should detect mismatched content");
            else check((Integer)crc.get("matches")>=2,"CRC samples should match");
            PackageDeepInspector.Report deep=PackageDeepInspector.inspect(channel,idx);
            check("ok".equals(deep.resources.get("status")),"Resource package parse");
            List<Map<String,Object>> pkgs=(List<Map<String,Object>>)deep.resources.get("packagesPreview");
            check(pkgs.size()==1,"Resource package sample");
            check("org.synthetic.res".equals(pkgs.get(0).get("name")),"Resource package name");
            check(((Map<String,Object>)pkgs.get(0).get("keys")).get("count").equals(2),"Resource key count");
        }
    }
    public static void main(String[] args)throws Exception{
        inspect("v05-unsigned.apk",false,false);
        inspect("v05-block.apk",true,false);
        inspect("v05-corrupt-crc.apk",false,true);
        try(SeekableByteChannel ch=Files.newByteChannel(Path.of("tools/fixtures/v05-unknown.apk"),StandardOpenOption.READ)){
            Map<String,Object> m=SignatureBlockInspector.inspect(ch,ZipIndexInspector.inspect(ch));
            check("present".equals(m.get("signingBlock")) && !Boolean.TRUE.equals(m.get("v2Present")),"Unknown IDs must not be treated as v2");
        }
        try {ElfHeaderInspector.parse(new byte[64],"fake.so");throw new AssertionError("Expected bad ELF rejection");}
        catch(java.io.IOException expected){}
        java.util.Map<String,Object> broken=new java.util.LinkedHashMap<>();broken.put("failures",1);broken.put("skipped",1);
        java.util.Map<String,Object> signal=new java.util.LinkedHashMap<>();signal.put("signingBlock","present");signal.put("status","checked");
        java.util.List<java.util.Map<String,Object>> correlated=AdvancedRuleInsights.inspect(signal,java.util.Collections.emptyList(),broken);
        check(correlated.size()==3,"Advanced evidence rules must reflect signature, CRC failure, skipped samples");
        System.out.println("PASS: resource strings, ELF AArch64, unsigned/v2/v3/v3.1/unknown block, CRC mismatch and corrupt ELF");
    }
}
