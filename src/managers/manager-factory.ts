import { sdk } from '@audius/sdk';
import { WalletManager } from "../auth.js";
import { ChallengeManager } from "../challenges.js";
import { CommentManager } from "../comments.js";
import { ResolveManager } from "../resolve.js";
import { UserExtendedManager } from "../user-extended.js";
import { TrackExtendedManager } from "../track-extended.js";
import { TrendingManager } from "../trending.js";
import { AnalyticsManager } from "../analytics.js";
import { StreamingManager } from "../streaming.js";
import { TrackHandlers } from "../handlers/track-handlers.js";

/**
 * Factory for lazy loading and caching manager instances
 */
export class ManagerFactory {
  private static instance: ManagerFactory;
  private audiusSdk: ReturnType<typeof sdk>;
  private managers: Map<string, any> = new Map();

  private constructor(audiusSdk: ReturnType<typeof sdk>) {
    this.audiusSdk = audiusSdk;
  }

  public static getInstance(audiusSdk: ReturnType<typeof sdk>): ManagerFactory {
    if (!ManagerFactory.instance) {
      ManagerFactory.instance = new ManagerFactory(audiusSdk);
    }
    return ManagerFactory.instance;
  }

  /**
   * Get or create WalletManager instance
   */
  public getWalletManager(): WalletManager {
    return this.getOrCreateManager('wallet', () => new WalletManager(this.audiusSdk));
  }
  
  /**
   * Get or create ChallengeManager instance
   */
  public getChallengeManager(): ChallengeManager {
    return this.getOrCreateManager('challenge', () => new ChallengeManager(this.audiusSdk));
  }

  /**
   * Get or create CommentManager instance
   */
  public getCommentManager(): CommentManager {
    return this.getOrCreateManager('comment', () => new CommentManager(this.audiusSdk));
  }

  /**
   * Get or create ResolveManager instance
   */
  public getResolveManager(): ResolveManager {
    return this.getOrCreateManager('resolve', () => new ResolveManager(this.audiusSdk));
  }

  /**
   * Get or create UserExtendedManager instance
   */
  public getUserExtendedManager(): UserExtendedManager {
    return this.getOrCreateManager('userExtended', () => new UserExtendedManager(this.audiusSdk));
  }

  /**
   * Get or create TrackExtendedManager instance
   */
  public getTrackExtendedManager(): TrackExtendedManager {
    return this.getOrCreateManager('trackExtended', () => new TrackExtendedManager(this.audiusSdk));
  }

  /**
   * Get or create TrendingManager instance
   */
  public getTrendingManager(): TrendingManager {
    return this.getOrCreateManager('trending', () => new TrendingManager(this.audiusSdk));
  }

  /**
   * Get or create AnalyticsManager instance
   */
  public getAnalyticsManager(): AnalyticsManager {
    return this.getOrCreateManager('analytics', () => new AnalyticsManager(this.audiusSdk));
  }

  /**
   * Get or create StreamingManager instance
   */
  public getStreamingManager(): StreamingManager {
    return this.getOrCreateManager('streaming', () => {
      const walletManager = this.getWalletManager();
      return new StreamingManager(this.audiusSdk, walletManager);
    });
  }

  /**
   * Get or create TrackHandlers instance
   */
  public getTrackHandlers(): TrackHandlers {
    return this.getOrCreateManager('trackHandlers', () => new TrackHandlers(this.audiusSdk, this));
  }

  /**
   * Generic method to get or create a manager instance
   */
  private getOrCreateManager<T>(key: string, factory: () => T): T {
    if (!this.managers.has(key)) {
      this.managers.set(key, factory());
    }
    return this.managers.get(key);
  }

  /**
   * Clean up all manager instances
   */
  public destroy(): void {
    this.managers.forEach((manager) => {
      if (typeof manager.destroy === 'function') {
        manager.destroy();
      }
    });
    this.managers.clear();
  }
}
