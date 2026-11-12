package id.reverselab.studio;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** One-shot navigation callback guard with stale-request invalidation. No Android dependencies. */
public final class BackNavigationGuard {
    private final AtomicInteger generation = new AtomicInteger();

    public Ticket newRequest() { return new Ticket(generation.incrementAndGet(), generation); }
    public void invalidate() { generation.incrementAndGet(); }

    public static final class Ticket {
        private final int myGeneration;
        private final AtomicInteger currentGeneration;
        private final AtomicBoolean resolved = new AtomicBoolean(false);
        private Ticket(int generation, AtomicInteger currentGeneration) {
            this.myGeneration = generation;
            this.currentGeneration = currentGeneration;
        }
        /** Only the first active callback or timeout may carry out navigation. */
        public boolean claim() {
            return currentGeneration.get()==myGeneration && resolved.compareAndSet(false,true);
        }
    }
}
