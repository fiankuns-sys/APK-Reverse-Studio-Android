import id.reverselab.studio.ai.DirectAuthPolicy;
public class DirectAuthPolicyTest {
    private static int n;
    private static void check(boolean condition,String message){n++;if(!condition)throw new AssertionError(message);}
    public static void main(String[] args){
        check(DirectAuthPolicy.grantedScope("openid chatgpt.tokens.use.direct offline_access"),"granted scope");
        check(!DirectAuthPolicy.grantedScope("openid chatgpt.tokens.use.directed"),"prefix doesn't count");
        check(!DirectAuthPolicy.grantedScope("resource.invoke"),"missing consent");
        check(DirectAuthPolicy.same("correct","correct"),"state equality");
        check(!DirectAuthPolicy.same("correct","incorrect"),"state mismatch");
        check(DirectAuthPolicy.supportedModelSlug("gpt-6.demo_1"),"safe model ID");
        check(!DirectAuthPolicy.supportedModelSlug("gpt/../../shadow"),"bad model ID");
        check(DirectAuthPolicy.validCallback("http://127.0.0.1:46321/auth/callback?code=abc&state=one",46321),"loopback callback");
        check(!DirectAuthPolicy.validCallback("https://127.0.0.1:46321/auth/callback?code=abc",46321),"scheme mismatch");
        check(!DirectAuthPolicy.validCallback("http://localhost:46321/auth/callback?code=abc",46321),"hostname mismatch");
        check(!DirectAuthPolicy.validCallback("http://127.0.0.1:46322/auth/callback?code=abc",46321),"port mismatch");
        check(!DirectAuthPolicy.validCallback("http://127.0.0.1:46321/other?code=abc",46321),"path mismatch");
        check(!DirectAuthPolicy.validCallback("http://127.0.0.1:46321/auth/callback?code=abc#bad",46321),"fragment mismatch");
        System.out.println("PASS: " + n + " direct OAuth policy checks");
    }
}
