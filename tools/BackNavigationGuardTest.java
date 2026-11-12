import id.reverselab.studio.BackNavigationGuard;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

public class BackNavigationGuardTest {
    private static void require(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    public static void main(String[] args) throws Exception {
        BackNavigationGuard guard = new BackNavigationGuard();
        BackNavigationGuard.Ticket responseFirst = guard.newRequest();
        require(responseFirst.claim(), "WebView callback should resolve a fresh request");
        require(!responseFirst.claim(), "Timeout cannot execute after callback");
        BackNavigationGuard.Ticket timeoutFirst = guard.newRequest();
        require(timeoutFirst.claim(), "Timeout may resolve a fresh request");
        require(!timeoutFirst.claim(), "Late WebView callback cannot execute after timeout");
        BackNavigationGuard.Ticket obsolete = guard.newRequest();
        BackNavigationGuard.Ticket newest = guard.newRequest();
        require(!obsolete.claim(), "Stale request cannot navigate");
        require(newest.claim(), "New request remains active");
        BackNavigationGuard.Ticket destroyed = guard.newRequest();
        guard.invalidate();
        require(!destroyed.claim(), "Activity destruction invalidates pending callback");

        for(int i=0;i<250;i++) {
            BackNavigationGuard.Ticket racing = guard.newRequest();
            CountDownLatch go = new CountDownLatch(1);
            AtomicInteger wins = new AtomicInteger();
            Thread a = new Thread(() -> {try {go.await();} catch(InterruptedException e) {return;} if(racing.claim()) wins.incrementAndGet();});
            Thread b = new Thread(() -> {try {go.await();} catch(InterruptedException e) {return;} if(racing.claim()) wins.incrementAndGet();});
            a.start();b.start();go.countDown();a.join();b.join();
            require(wins.get()==1, "Concurrent callback and timeout must not double-navigate");
        }
        System.out.println("PASS: BackNavigationGuard lifecycle, stale callbacks, timeout, 250 concurrent races");
    }
}
