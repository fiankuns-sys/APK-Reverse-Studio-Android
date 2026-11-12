package id.reverselab.studio.ai;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;

/** Pure Java security checks shared with the Android direct ChatGPT OAuth implementation. */
public final class DirectAuthPolicy {
    private DirectAuthPolicy() {}
    public static final String CONSENT_SCOPE = "chatgpt.tokens.use.direct";
    private static final Pattern MODEL = Pattern.compile("[A-Za-z0-9._-]{1,80}");
    public static boolean same(String a, String b) {
        return MessageDigest.isEqual((a == null ? "" : a).getBytes(StandardCharsets.UTF_8),
                (b == null ? "" : b).getBytes(StandardCharsets.UTF_8));
    }
    public static boolean grantedScope(String scopes) {
        if(scopes == null) return false;
        for(String scope : scopes.trim().split("\\s+")) if(CONSENT_SCOPE.equals(scope)) return true;
        return false;
    }
    public static boolean supportedModelSlug(String slug) {
        return slug != null && MODEL.matcher(slug).matches();
    }
    public static boolean validCallback(String uri, int boundPort) {
        if(boundPort < 1 || boundPort > 65535) return false;
        try {
            URI u = new URI(uri);
            return "http".equals(u.getScheme()) && "127.0.0.1".equals(u.getHost())
                && u.getPort() == boundPort && "/auth/callback".equals(u.getRawPath())
                && u.getRawQuery() != null && !u.getRawQuery().isEmpty()
                && u.getUserInfo() == null && u.getFragment() == null;
        } catch(Exception ex) {return false;}
    }
}
