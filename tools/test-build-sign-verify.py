#!/usr/bin/env python3
"""Mock tests for v0.9 pipeline. Fake SDK tools are NOT cryptographic verification."""
from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile, ZIP_DEFLATED

SCRIPT = Path(__file__).resolve().parent / 'build-sign-verify.py'

class TestPipeline(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tools = self.root / 'fake-sdk'
        self.tools.mkdir()
        (self.tools/'zipalign').write_text('''#!/usr/bin/env python3
import os,sys,shutil
from pathlib import Path
args=sys.argv[1:]
if os.environ.get('FAIL_STAGE')=='zipalign':sys.exit(31)
if '-c' in args:
 if not Path(args[-1]).exists():sys.exit(35)
else:shutil.copyfile(args[-2],args[-1])
''')
        (self.tools/'apksigner').write_text('''#!/usr/bin/env python3
import os,sys,shutil
from pathlib import Path
args=sys.argv[1:]
if os.environ.get('FAIL_STAGE')==args[0]:sys.exit(37)
if args[0]=='sign':
 assert '--ks-pass' in args and args[args.index('--ks-pass')+1]=='env:APKR_KEYSTORE_PASS'
 assert not any('fake_password' in s for s in args)
 shutil.copyfile(args[-1],args[args.index('--out')+1])
elif args[0]=='verify':
 print('Verified using v1 scheme (JAR signing): false')
 print('Verified using v2 scheme (APK Signature Scheme v2): true')
 print('Signer #1 certificate SHA-256 digest: deadbeef00')
else:sys.exit(99)
''')
        for p in self.tools.iterdir():p.chmod(0o700)
        self.apk=self.root/'unsigned.apk'
        with ZipFile(self.apk,'w',ZIP_DEFLATED) as z:
            z.writestr('AndroidManifest.xml','<manifest package="demo" />')
            z.writestr('classes.dex',bytes(140))
        self.keystore=self.root/'my-key.jks';self.keystore.write_bytes(b'fake-keystore')
        self.out=self.root/'signed.apk'
        self.env=dict(os.environ, PATH=str(self.tools)+os.pathsep+os.environ.get('PATH',''),
                      APKR_KEYSTORE_PASS='fake_password_secret')
    def call(self,*args,env=None):
        return subprocess.run([sys.executable,str(SCRIPT),*map(str,args)],env=env or self.env,
                              text=True,capture_output=True)
    def test_happy_path(self):
        before=self.apk.read_bytes()
        proc=self.call('finalize',self.apk,self.keystore,'demo',self.out)
        self.assertEqual(proc.returncode,0,proc.stderr)
        self.assertEqual(before,self.apk.read_bytes())
        self.assertTrue(self.out.is_file())
        r=json.loads((self.root/'signed.receipt.json').read_text())
        self.assertEqual(r['result'],'VERIFIED')
        self.assertEqual(r['verifiedSchemes']['v2'],True)
        self.assertEqual(r['signerCertificateSha256'],'deadbeef00')
        self.assertNotIn('fake_password',proc.stdout)
        self.assertNotIn('fake_password',(self.root/'signed.receipt.json').read_text())
    def test_existing_output_not_overwritten(self):
        self.out.write_text('existing')
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out)
        self.assertNotEqual(p.returncode,0)
        self.assertEqual(self.out.read_text(),'existing')
    def test_no_secrets(self):
        env={k:v for k,v in self.env.items() if k!='APKR_KEYSTORE_PASS'}
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out,env=env)
        self.assertNotEqual(p.returncode,0)
        self.assertFalse(self.out.exists())
    def test_sign_failure_leaves_no_output(self):
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out,
                    env={**self.env,'FAIL_STAGE':'sign'})
        self.assertNotEqual(p.returncode,0)
        self.assertFalse(self.out.exists())
    def test_verify_failure_leaves_no_output(self):
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out,
                    env={**self.env,'FAIL_STAGE':'verify'})
        self.assertNotEqual(p.returncode,0)
        self.assertFalse(self.out.exists())
    def test_reject_output_same_as_input(self):
        p=self.call('finalize',self.apk,self.keystore,'demo',self.apk)
        self.assertNotEqual(p.returncode,0)
    def test_reject_invalid_alias(self):
        p=self.call('finalize',self.apk,self.keystore,'bad;alias',self.out)
        self.assertNotEqual(p.returncode,0)
    def test_bad_zip_rejected(self):
        self.apk.write_bytes(b'z'*512)
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out)
        self.assertNotEqual(p.returncode,0)
        self.assertFalse(self.out.exists())
    def test_verify_only(self):
        p=self.call('verify',self.apk,'--receipt',self.root/'verify.json')
        self.assertEqual(p.returncode,0,p.stderr)
        self.assertTrue((self.root/'verify.json').exists())
    def test_existing_receipt_prevents_build(self):
        receipt=self.root/'report.json';receipt.write_text('OLD')
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out,'--receipt',receipt)
        self.assertNotEqual(p.returncode,0)
        self.assertEqual(receipt.read_text(),'OLD')
    def test_symlink_output_rejected(self):
        self.out.symlink_to(self.apk)
        p=self.call('finalize',self.apk,self.keystore,'demo',self.out)
        self.assertNotEqual(p.returncode,0)
    def test_pipeline_sequence(self):
        self.assertNotIn('fake_password',self.call('finalize',self.apk,self.keystore,'demo',self.out).stderr)

if __name__=='__main__':unittest.main(verbosity=2)
