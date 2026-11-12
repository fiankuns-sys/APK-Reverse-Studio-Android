import id.reverselab.studio.inspector.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;
public class ApktoolBundleInspectorTest {
 static void zip(File f,String[] names,String[] values)throws Exception{
  try(ZipOutputStream out=new ZipOutputStream(new FileOutputStream(f))){for(int i=0;i<names.length;i++){
   out.putNextEntry(new ZipEntry(names[i]));out.write(values[i].getBytes("UTF-8"));out.closeEntry();}}
 }
 static void expectBad(File f)throws Exception{
  try{ApktoolBundleInspector.inspect(f);throw new AssertionError("expected bad: "+f);}catch(IOException ok){}
 }
 public static void main(String[] args)throws Exception{
  File tmp=File.createTempFile("apktool-review-",".zip");tmp.deleteOnExit();
  String smali=".class public Ldemo/A;\n.super Ljava/lang/Object;\n.method public a()V\n.end method\n";
  zip(tmp,new String[]{"bundle.json","tree/smali/demo/A.smali","tree/res/values/strings.xml"},new String[]{"{}",smali,"<resources/>"});
  ApktoolBundleInspector.Result r=ApktoolBundleInspector.inspect(tmp);
  if(r.files.size()!=2||!ApktoolBundleInspector.readFile(tmp,"tree/smali/demo/A.smali").equals(smali))throw new AssertionError("read");
  if(!PatchPreflight.warnings("tree/smali/demo/A.smali",smali).isEmpty())throw new AssertionError("smali preflight");
  if(PatchPreflight.warnings("tree/smali/demo/A.smali",".class Lx;\n.super Ly;\n.method f()V").isEmpty())throw new AssertionError("broken method");
  if(PatchPreflight.warnings("tree/AndroidManifest.xml","<!DOCTYPE a><manifest/>").isEmpty())throw new AssertionError("DTD not caught");
  zip(tmp,new String[]{"bundle.json","../payload"},new String[]{"{}","x"});expectBad(tmp);
  zip(tmp,new String[]{"bundle.json","tree/smali/demo/A.smali","tree/assets/secret.txt"},new String[]{"{}",smali,"abc"});expectBad(tmp);
  System.out.println("Apktool bundle PASS: safe, traversal, duplicate, allowlist, preflight");
 }
}
